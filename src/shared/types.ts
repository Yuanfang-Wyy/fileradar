// 所有主/渲染进程共享的 TypeScript 类型定义。
// 跨模块使用的类型必须集中在此文件，禁止在各模块内部重复定义。

/** 单条文件元数据记录，对应 SQLite files 表。 */
export interface FileRecord {
  id: number
  path: string // 完整路径
  name: string // 文件名（含扩展名）
  ext: string // 扩展名（小写，不含点）
  size: number // 字节数
  mtime: number // 修改时间 Unix timestamp（毫秒）
  isDir: boolean // 是否为目录
}

/** 可排序的列。 */
export type SortColumn = 'name' | 'path' | 'size' | 'mtime'

/** 排序方向。 */
export type SortOrder = 'asc' | 'desc'

/** 搜索模式（可配置）。filename 已实现；content/semantic 见 ROADMAP，逐步上线。 */
export type SearchMode = 'filename' | 'content' | 'semantic'

/** 一次搜索请求的参数。 */
export interface SearchQuery {
  mode?: SearchMode // 缺省按文件名
  keyword: string
  ext?: string // 按扩展名筛选
  minSize?: number
  maxSize?: number
  startTime?: number
  endTime?: number
  sortBy?: SortColumn // 排序列；缺省时有关键词按相关度、否则按修改时间倒序
  sortOrder?: SortOrder
  limit: number // 默认 200
  offset: number
}

/** 一次搜索的返回结果。 */
export interface SearchResult {
  items: FileRecord[]
  total: number // 匹配总数（不含分页限制）
  elapsedMs: number // 搜索耗时
}

/** 索引扫描阶段。 */
export type IndexPhase = 'idle' | 'scanning' | 'indexing' | 'complete' | 'error'

/** 索引进度，由主进程通过 IPC 推送给渲染进程。 */
export interface IndexProgress {
  scanned: number // 已扫描文件数
  total: number // 预估总数（-1 表示未知）
  currentDir: string // 当前扫描目录
  phase: IndexPhase
}

/** 用户可配置项，持久化到 electron-store。 */
export interface AppSettings {
  watchDirs: string[] // 监听目录列表
  excludePatterns: string[] // 排除规则（glob）
  globalShortcut: string // 全局快捷键
  launchAtLogin: boolean
  maxResults: number // 搜索结果上限，默认 200
  searchMode: SearchMode // 搜索模式（文件名/内容/语义）
}
