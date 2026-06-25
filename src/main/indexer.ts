import type { IndexProgress } from '@shared/types'

// 全量扫描指定目录并批量写入 SQLite。Phase 2 实现。
// TODO(Phase 2): 递归扫描、按 INDEX_BATCH_SIZE 批量事务写入、通过 onProgress 回调进度。
export async function startIndexing(
  _dirs: string[],
  _onProgress: (progress: IndexProgress) => void,
): Promise<void> {
  throw new Error('startIndexing 未实现（Phase 2）')
}
