// 全局常量：默认配置与各类限制值。本文件不依赖任何 Node.js API，主/渲染进程通用。
import type { AppSettings } from './types'

/** 搜索结果默认上限。 */
export const DEFAULT_MAX_RESULTS = 200

/** 渲染进程搜索输入防抖（毫秒）。见 CLAUDE.md 第五节。 */
export const SEARCH_DEBOUNCE_MS = 50

/** 索引批量写入：每累计多少条记录提交一次事务，避免大事务锁库。 */
export const INDEX_BATCH_SIZE = 1000

/** 默认排除的目录/文件 glob 规则。见 CLAUDE.md 第八节第 3 条。 */
export const DEFAULT_EXCLUDE_PATTERNS: string[] = [
  '**/node_modules/**',
  '**/.git/**',
  '**/Library/Caches/**',
  '**/.Trash/**',
  '**/.DS_Store',
]

/**
 * 默认全局快捷键。Cmd+Space 被 macOS Spotlight 占用无法注册，故默认改用
 * Cmd+Shift+Space；用户可在设置中改为其它组合键（注册失败仅记录日志，不影响其它功能）。
 */
export const DEFAULT_GLOBAL_SHORTCUT = 'CommandOrControl+Shift+Space'

/**
 * 默认应用配置。watchDirs 留空，由主进程在首次启动时填入用户主目录
 * （shared 层不能调用 os.homedir 等 Node.js API）。
 */
export const DEFAULT_SETTINGS: AppSettings = {
  watchDirs: [],
  excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
  globalShortcut: DEFAULT_GLOBAL_SHORTCUT,
  launchAtLogin: false,
  maxResults: DEFAULT_MAX_RESULTS,
  searchMode: 'filename',
}
