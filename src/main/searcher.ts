import type { SearchQuery, SearchResult } from '@shared/types'

// 基于 SQLite FTS5 的查询。Phase 2 实现。
// TODO(Phase 2): 拼接 FTS5 MATCH + 扩展名/大小/时间筛选 + 分页，返回结果与总数。
export function search(_query: SearchQuery): SearchResult {
  return { items: [], total: 0, elapsedMs: 0 }
}
