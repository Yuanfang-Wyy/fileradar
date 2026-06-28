# Scout · 极速文件检索

> Mac 桌面文件检索工具，对标 Windows [Everything](https://www.voidtools.com/)。秒级索引、毫秒搜索、双击 Cmd 全局唤起。

基于 Electron + React + SQLite FTS5，实测在 **106 万个文件**的索引上保持毫秒级搜索响应。

## ✨ 特性

- **秒级索引**：全量扫描指定目录，建立文件元数据索引（实测 100 万+ 文件）
- **毫秒搜索**：SQLite FTS5 全文索引，文件名/路径前缀匹配
- **实时增量**：chokidar 监听文件系统变更，自动更新索引
- **多列表格**：名称 / 路径 / 大小 / 修改时间，**每列可点击排序**，列宽可拖拽调整
- **类型筛选**：按扩展名快速筛选，彩色类型图标（Word 蓝 / Excel 绿 / PDF 红…一眼区分）
- **虚拟滚动**：`@tanstack/react-virtual` 渲染十万级结果不卡顿
- **全局唤起**：托盘常驻 + 全局快捷键 + **双击 Command 键**唤起 + 失焦自动隐藏
- **顺手操作**：双击打开文件、右键在 Finder 显示 / 复制路径、键盘上下导航
- **记住偏好**：排序方式、筛选、列宽持久化

## 📦 安装

下载 `release/Scout-<version>-arm64.dmg`（Apple Silicon），或自行构建（见下）。

1. 打开 DMG，将 **Scout** 拖入「应用程序」
2. **首次打开**：右键 → 「打开」（应用为 ad-hoc 签名未公证，需绕过 Gatekeeper 一次）
3. 授权两项权限：
   - **完全磁盘访问**（扫描受保护目录）：系统设置 → 隐私与安全性 → 完全磁盘访问
   - **辅助功能**（双击 Cmd 唤起所需）：系统设置 → 隐私与安全性 → 辅助功能
4. 点「重建索引」开始扫描，然后输入关键词搜索

## 🛠 开发

需要 Node.js ≥ 20、pnpm（经 corepack）。

```bash
corepack enable pnpm
pnpm install

pnpm dev              # 开发模式（无边框窗口 + HMR）
pnpm test             # Vitest 单元/集成测试
pnpm typecheck        # 类型检查
pnpm build            # 构建并打包 macOS DMG（产物在 release/）
```

> **双 ABI 注意**：better-sqlite3 是原生模块。测试跑在系统 Node（`pnpm rebuild`），打包/运行 app 用 Electron ABI（`pnpm rebuild:electron`）。

## 🏗 架构

Electron 三进程隔离：

```
src/
├── shared/      # 主/渲染进程共享：类型、IPC 通道常量、全局常量
├── main/        # 主进程：窗口、SQLite、索引、监听、搜索、托盘、全局快捷键
│   ├── db.ts          # better-sqlite3 连接 + FTS5 schema/触发器
│   ├── indexer.ts     # 全量扫描 + 批量事务写入
│   ├── watcher.ts     # chokidar 增量监听
│   ├── searcher.ts    # FTS5 查询 + 筛选 + 排序
│   ├── ipcHandlers.ts # IPC 注册
│   ├── tray.ts        # 系统托盘
│   ├── system.ts      # 全局快捷键 + 开机自启 + 双击 Cmd
│   └── preload.ts     # contextBridge 暴露安全 IPC
└── renderer/    # 渲染进程（React）：搜索框、虚拟滚动列表、筛选、设置
```

- **进程隔离**：数据库只在主进程，渲染进程经 IPC 取数据，preload 用 `contextBridge` 暴露受控接口
- **数据层**：核心逻辑（SQL 拼接、glob 排除、元数据提取）拆为纯函数，单元测试覆盖

## 🧰 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 28 |
| 构建 | electron-vite + Vite 5 |
| 前端 | React 18 + TypeScript 5 + Tailwind CSS 3 |
| 数据库 | better-sqlite3 12（SQLite FTS5） |
| 文件监听 | chokidar 3 |
| 虚拟滚动 | @tanstack/react-virtual |
| 全局键盘 | node-global-key-listener |
| 测试 | Vitest |
| 打包 | electron-builder（DMG） |

## ⚠️ 已知限制

- 仅打包 Apple Silicon（arm64）DMG；Intel 需自行调整 `electron-builder.config.cjs` 的 target
- 未做正式代码签名 / 公证，首次打开需右键绕过 Gatekeeper
- 暂未实现：书签 / 保存搜索、高级搜索语法（正则、`size:>1mb` 等）

## 📄 License

MIT
