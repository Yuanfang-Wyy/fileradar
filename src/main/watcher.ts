// chokidar 文件系统监听，增量更新索引。Phase 2 实现。
// TODO(Phase 2): 监听 add/change/unlink 事件，增量维护 files 表。
export function startWatching(_dirs: string[]): void {
  throw new Error('startWatching 未实现（Phase 2）')
}

export function stopWatching(): void {
  // TODO(Phase 2): 关闭 chokidar watcher。
}
