// SQLite 连接与 Schema 初始化（better-sqlite3 + FTS5）。Phase 2 实现。
//
// 注意：better-sqlite3 是原生模块，需经 @electron/rebuild 针对 Electron 的 ABI 重新
// 编译后才能在主进程 import（见 CLAUDE.md 第八节）。Phase 1 暂不建立实际连接，
// 以保证在原生模块尚未编译时主进程也能正常启动。

// TODO(Phase 2): 打开数据库、建表、创建 FTS5 虚拟表与同步触发器。
export function initDatabase(): void {
  throw new Error('initDatabase 未实现（Phase 2）')
}
