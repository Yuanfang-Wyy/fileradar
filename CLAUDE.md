# CLAUDE.md — 文件检索工具项目规范

> 每次开始工作前，请先完整阅读本文件，再查看当前文件结构，最后再动代码。

---

## 一、项目概述

**项目名称**：FileRadar（文件雷达）  
**目标**：Mac 桌面文件检索工具，功能对标 Windows Everything  
**核心价值**：秒级索引、毫秒级搜索、全局快捷键唤起

### 核心功能

- 全量扫描指定目录，建立文件元数据索引
- 实时监听文件系统变更，增量更新索引
- 支持文件名、路径模糊搜索，FTS5 全文索引
- 搜索结果支持排序、类型筛选、在 Finder 中打开
- 全局快捷键唤起（默认 `Cmd+Space` 可配置）
- 系统托盘常驻，开机自启动

---

## 二、技术栈

| 层级 | 技术 | 版本 | 说明 |
|---|---|---|---|
| 桌面框架 | Electron | ^28 | 主进程 + 渲染进程 |
| 前端框架 | React | ^18 | 渲染进程 UI |
| 类型系统 | TypeScript | ^5 | 全项目强类型 |
| 构建工具 | Vite + electron-vite | latest | 主/渲染进程统一构建 |
| 数据库 | better-sqlite3 | ^12 | SQLite，FTS5 全文索引（^9 无法在 node 24 编译，已升级） |
| 文件监听 | chokidar | ^3 | 跨平台文件系统监听 |
| UI 交互 | cmdk | ^1 | Command palette 搜索体验 |
| 样式 | Tailwind CSS | ^3 | 工具类样式 |
| 测试 | Vitest | latest | 单元测试 |
| 打包 | electron-builder | latest | Mac .dmg 打包 |
| 包管理 | pnpm | 11.9.0 | 经 corepack 启用（`packageManager` 字段锁定）；`.npmrc` 设 `node-linker=hoisted` |

---

## 三、目录结构

```
fileradar/
├── CLAUDE.md                    # 本文件，项目规范
├── package.json
├── electron.vite.config.ts      # 构建配置
├── electron-builder.config.ts   # 打包配置
├── tsconfig.json
│
├── src/
│   ├── shared/                  # 主/渲染进程共享代码（不含 Node.js 特有 API）
│   │   ├── types.ts             # 所有 TypeScript 类型定义
│   │   ├── ipc.ts               # IPC 通道名常量（唯一来源）
│   │   └── constants.ts         # 全局常量（默认配置、限制值等）
│   │
│   ├── main/                    # Electron 主进程
│   │   ├── index.ts             # 主进程入口，窗口管理
│   │   ├── indexer.ts           # 文件扫描 + SQLite 写入
│   │   ├── watcher.ts           # chokidar 文件监听，增量更新
│   │   ├── searcher.ts          # SQLite FTS5 查询
│   │   ├── ipcHandlers.ts       # 所有 IPC handle 注册
│   │   ├── tray.ts              # 系统托盘
│   │   └── db.ts                # SQLite 连接 + Schema 初始化
│   │
│   └── renderer/                # Electron 渲染进程（React）
│       ├── index.html
│       ├── main.tsx             # React 入口
│       ├── App.tsx              # 根组件
│       ├── components/
│       │   ├── SearchBar.tsx    # 搜索输入框（cmdk）
│       │   ├── ResultList.tsx   # 搜索结果列表（虚拟滚动）
│       │   ├── ResultItem.tsx   # 单条结果
│       │   ├── FilterBar.tsx    # 类型/日期筛选栏
│       │   ├── StatusBar.tsx    # 底部状态栏（索引数量、搜索耗时）
│       │   └── Settings.tsx     # 设置面板
│       ├── hooks/
│       │   ├── useSearch.ts     # 搜索逻辑 hook（防抖、IPC 调用）
│       │   ├── useIndex.ts      # 索引状态管理 hook
│       │   └── useSettings.ts   # 用户配置 hook
│       └── store/
│           └── settingsStore.ts # 用户配置持久化（electron-store）
│
├── resources/
│   ├── icon.icns                # Mac 图标
│   └── tray-icon.png            # 托盘图标
│
└── tests/
    ├── indexer.test.ts
    ├── searcher.test.ts
    └── watcher.test.ts
```

---

## 四、架构约定（必须遵守）

### 4.1 进程隔离

- **数据库操作只在主进程**：`better-sqlite3` 只在 `src/main/` 中使用，渲染进程通过 IPC 获取数据
- **渲染进程无 Node.js API**：不在渲染进程直接调用 `fs`、`path` 等 Node.js 模块
- **preload 脚本**：通过 `contextBridge` 暴露安全的 IPC 接口给渲染进程

### 4.2 IPC 规范

- **所有 IPC 通道名** 必须定义在 `src/shared/ipc.ts`，不允许在代码中硬编码字符串
- 命名格式：`模块:动作`，例如 `index:start`、`search:query`、`settings:get`
- 双向通信模式：请求用 `ipcRenderer.invoke`，推送用 `ipcMain.webContents.send`

```typescript
// src/shared/ipc.ts 示例结构
export const IPC = {
  INDEX: {
    START: 'index:start',
    STOP: 'index:stop',
    PROGRESS: 'index:progress',
    COMPLETE: 'index:complete',
  },
  SEARCH: {
    QUERY: 'search:query',
    RESULT: 'search:result',
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
  },
  FILE: {
    REVEAL: 'file:reveal',
    OPEN: 'file:open',
  },
} as const
```

### 4.3 类型规范

- 所有共享类型在 `src/shared/types.ts` 中定义，不允许在模块内部定义跨模块使用的类型
- 函数必须有明确的参数类型和返回类型，禁止使用 `any`

```typescript
// src/shared/types.ts 核心类型示例
export interface FileRecord {
  id: number
  path: string        // 完整路径
  name: string        // 文件名（含扩展名）
  ext: string         // 扩展名（小写，不含点）
  size: number        // 字节数
  mtime: number       // 修改时间 Unix timestamp
  isDir: boolean      // 是否为目录
}

export interface SearchQuery {
  keyword: string
  ext?: string        // 按扩展名筛选
  minSize?: number
  maxSize?: number
  startTime?: number
  endTime?: number
  limit: number       // 默认 200
  offset: number
}

export interface SearchResult {
  items: FileRecord[]
  total: number       // 匹配总数（不含分页限制）
  elapsedMs: number   // 搜索耗时
}

export interface IndexProgress {
  scanned: number     // 已扫描文件数
  total: number       // 预估总数（-1 表示未知）
  currentDir: string  // 当前扫描目录
  phase: 'scanning' | 'indexing' | 'complete' | 'error'
}

export interface AppSettings {
  watchDirs: string[]         // 监听目录列表
  excludePatterns: string[]   // 排除规则（glob）
  globalShortcut: string      // 全局快捷键
  launchAtLogin: boolean
  maxResults: number          // 搜索结果上限，默认 200
}
```

### 4.4 数据库规范

```sql
-- 主表
CREATE TABLE IF NOT EXISTS files (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  path  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL,
  ext   TEXT NOT NULL DEFAULT '',
  size  INTEGER NOT NULL DEFAULT 0,
  mtime INTEGER NOT NULL DEFAULT 0,
  is_dir INTEGER NOT NULL DEFAULT 0
);

-- FTS5 全文索引（对 name 和 path 建索引）
CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5 (
  name,
  path,
  content='files',
  content_rowid='id'
);

-- 触发器保持 FTS 同步
CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;
CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, path) VALUES('delete', old.id, old.name, old.path);
END;
CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, path) VALUES('delete', old.id, old.name, old.path);
  INSERT INTO files_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;
```

---

## 五、编码规范

- 使用 `async/await`，禁止回调风格
- 错误处理：主进程模块用 `try/catch` + 日志，不允许 silent fail
- 日志：使用 `electron-log`，区分 `info`、`warn`、`error` 级别
- Batch insert：每 1000 条文件记录做一次事务提交，避免大事务锁库
- 搜索防抖：渲染进程搜索输入防抖 **50ms**
- 虚拟滚动：结果列表使用 `@tanstack/react-virtual`，避免大量 DOM

---

## 六、开发阶段规划

### Phase 1：项目骨架 ✅

- [x] electron-vite 项目初始化
- [x] 目录结构创建（含占位文件）
- [x] TypeScript 配置
- [x] 基础窗口创建（无边框，居中，800×600）
- [x] preload 脚本 + contextBridge 基础设置

### Phase 2：数据层 ✅

- [x] `db.ts`：SQLite 连接、Schema 初始化、FTS5 触发器
- [x] `indexer.ts`：全量扫描、Batch insert、进度回调
- [x] `watcher.ts`：chokidar 监听、增量 add/change/unlink
- [x] `searcher.ts`：FTS5 查询、分页、筛选条件拼接

### Phase 3：IPC 层 ✅

- [x] `ipcHandlers.ts`：注册所有 handle
- [x] preload 暴露完整 API
- [x] 渲染进程 hooks 对接 IPC

### Phase 4：UI 层 ✅

- [x] `SearchBar.tsx`：自动聚焦搜索框（见下方 cmdk 取舍）
- [x] `ResultList.tsx`：虚拟滚动列表（@tanstack/react-virtual）
- [x] `ResultItem.tsx`：图标 + 文件名 + 路径 + 大小
- [x] `FilterBar.tsx`：文件类型快速筛选（扩展名）
- [x] `StatusBar.tsx`：索引统计 + 搜索耗时
- [x] `Settings.tsx`：目录配置（dialog 选择）、快捷键、自启、结果上限

### Phase 5：系统集成 ✅

- [x] `tray.ts`：系统托盘 + 右键菜单（左键切换窗口/右键菜单）
- [x] 全局快捷键注册（`system.ts`，注册失败仅记录日志）
- [x] 开机自启动（`app.setLoginItemSettings`）
- [x] 窗口失焦自动隐藏（生产模式；dev 禁用便于调试）

### Phase 6：打包

- [ ] electron-builder 配置（Mac DMG）
- [ ] 代码签名配置（占位）
- [ ] 图标资源

---

## 七、当前状态

**当前阶段**：Phase 6 — 打包（未开始）  
**最后更新**：Phase 5 完成 —— 系统集成。新增 `src/main/tray.ts`（托盘：左键切换窗口/右键菜单）、`src/main/system.ts`（全局快捷键 + 开机自启）、`resources/tray-icon.png`（Pillow 生成的放大镜 template 图标）。index.ts 集成：托盘常驻、关闭仅隐藏、生产模式失焦隐藏（dev 禁用）、退出清理（注销快捷键/关 watcher/关 db/销毁托盘）。**默认快捷键由 Cmd+Space 改为 Cmd+Shift+Space**（前者被 Spotlight 占用）。启动验证：main build 15.79 kB、「主进程已启动」无崩溃（托盘/快捷键/自启均执行）、typecheck 全绿；托盘图标 GUI 未截图（dev 后台进程被回收），建议正常终端 `pnpm dev` 查看菜单栏。

**Phase 4 完成**：完整 UI（组件拆分 + @tanstack/react-virtual 虚拟滚动 + 键盘导航 + 设置面板），GUI 实测 106 万文件索引、242ms 搜索。新增 `IPC.DIALOG.PICK_DIR`。

**cmdk 取舍**：CLAUDE.md 原定 SearchBar 用 cmdk，但 cmdk 的命令列表导航假设所有 item 已渲染，与「只渲染可见行」的虚拟滚动（十万级结果必需）冲突。取舍：SearchBar 用受控 input（cmdk 视觉风格）+ 自定义键盘导航，结果列表用 @tanstack/react-virtual。cmdk 依赖暂保留，未深度使用。

**Phase 3 完成内容**：main 初始化 db、ipcHandlers 接通 search/settings/index（索引后台+进度推送+watcher 生命周期）、renderer hooks（useSearch/useIndex/useSettings）、新增 `src/main/settings.ts`（electron-store 持久化，CLAUDE.md 目录外）、Electron 版本 better-sqlite3（ABI 119，runtime 端到端验证索引+FTS5 通过）。

⚠️ 当前状态注意：① better-sqlite3 现为 **Electron 版本**（rebuild:electron 后），跑 `pnpm test` 前须先 `pnpm rebuild` 切回 node 版本；② **沙箱环境下 Electron 无法创建 GUI 窗口**（启动即 `Command failed` 退出），需在正常终端跑 `pnpm dev`；③ Phase 4 已完成 GUI 实测（106 万文件索引 + 毫秒级搜索 + 完整 UI），renderer/IPC 端到端确认正常。

Phase 1-2 遗留约定（仍有效）：preload 在 `src/main/preload.ts`；pnpm 用 `pnpm-workspace.yaml` 的 `allowBuilds` + `blockExoticSubdeps:false`；`electron-builder` 推迟至 Phase 6；electron 二进制/headers 经 `ELECTRON_MIRROR=npmmirror`。

> 每完成一个 Phase，更新此处状态，并在对应 checklist 打勾。

---

## 八、已知约束与注意事项

1. **Mac 磁盘权限**：扫描根目录需要"完全磁盘访问权限"，`Info.plist` 需声明 `NSDesktopFolderUsageDescription` 等权限描述
2. **首次索引**：10 万文件约需 10-30 秒，必须有进度反馈，不能阻塞 UI
3. **默认排除目录**：`node_modules`、`.git`、`Library/Caches`、系统隐藏目录
4. **better-sqlite3 原生模块（双 ABI）**：测试跑在 node 24、app 跑在 Electron(node 18)，二者 ABI 不同需分别编译——`pnpm rebuild`（内置）出 node 版本供 Vitest，`pnpm rebuild:electron`（@electron/rebuild，Phase 3 安装）出 Electron 版本供 app。版本须 ≥12（^9 不支持 node 24 的 C++20）
5. **窗口行为**：关闭窗口不退出应用，只隐藏；托盘图标点击重新显示
6. **pnpm + Electron 适配**：项目根 `.npmrc` 必须保持 `node-linker=hoisted`，否则 electron-builder 打包时依赖无法正确写入 `app.asar`；`electron`、`esbuild` 等需要执行安装脚本的依赖须列入 `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 白名单（pnpm v10+ 默认拦截依赖的 install/postinstall 脚本；该设置在 pnpm 10+ 已从 package.json 迁移至 pnpm-workspace.yaml）。`better-sqlite3` 是给 Electron 运行时用的原生模块，**不**走 pnpm 的 node 端编译，而是经 `pnpm rebuild`（`@electron/rebuild`）针对 Electron 的 ABI 编译——这样还可避开本机 node 24 与 better-sqlite3 ^9 的源码兼容问题。本机经 `corepack enable pnpm` 启用，不全局安装 pnpm。

---

## 九、快速参考命令

```bash
# 首次准备（启用 pnpm 并安装依赖）
corepack enable pnpm
pnpm install

# 开发模式
pnpm dev

# 运行测试
pnpm test

# 打包
pnpm build

# 重新编译 better-sqlite3（双 ABI）
pnpm rebuild            # 内置命令，针对当前 node（Vitest 测试用）
pnpm rebuild:electron   # @electron/rebuild，针对 Electron（Phase 3 起，app 运行用）
```

> 包管理器统一用 **pnpm**（经 corepack 管理，版本锁定在 `package.json` 的 `packageManager` 字段）。
> 项目根的 `.npmrc` 已固定 `node-linker=hoisted`，请勿改回默认 isolated 模式，否则 electron-builder 打包会丢依赖。
