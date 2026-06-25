import { performance } from 'node:perf_hooks'
import type { AppDatabase } from './db'
import type { FileRecord, SearchQuery, SearchResult } from '@shared/types'

// 数据库行（snake_case）形状，用于映射到对外的 FileRecord（camelCase）。
interface FileRow {
  id: number
  path: string
  name: string
  ext: string
  size: number
  mtime: number
  is_dir: number
}

function rowToRecord(row: FileRow): FileRecord {
  return {
    id: row.id,
    path: row.path,
    name: row.name,
    ext: row.ext,
    size: row.size,
    mtime: row.mtime,
    isDir: row.is_dir !== 0,
  }
}

/**
 * 将用户输入转换为 FTS5 MATCH 表达式：按空白拆词，每个词用双引号包裹（转义内部引号，
 * 避免 FTS5 语法注入），并加 `*` 做前缀匹配。空输入返回 null，表示不做全文匹配。
 * 纯函数，便于单元测试。
 */
export function buildFtsMatch(keyword: string): string | null {
  const tokens = keyword.trim().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) {
    return null
  }
  return tokens.map((t) => `"${t.replace(/"/g, '""')}"*`).join(' ')
}

interface FilterClause {
  sql: string
  params: Array<string | number>
}

/**
 * 根据 SearchQuery 的筛选字段构造 WHERE 子句片段（不含 keyword 与分页）。
 * 纯函数，便于单元测试。
 */
export function buildFilters(query: SearchQuery): FilterClause {
  const clauses: string[] = []
  const params: Array<string | number> = []
  if (query.ext !== undefined && query.ext !== '') {
    clauses.push('files.ext = ?')
    params.push(query.ext.toLowerCase())
  }
  if (query.minSize !== undefined) {
    clauses.push('files.size >= ?')
    params.push(query.minSize)
  }
  if (query.maxSize !== undefined) {
    clauses.push('files.size <= ?')
    params.push(query.maxSize)
  }
  if (query.startTime !== undefined) {
    clauses.push('files.mtime >= ?')
    params.push(query.startTime)
  }
  if (query.endTime !== undefined) {
    clauses.push('files.mtime <= ?')
    params.push(query.endTime)
  }
  return { sql: clauses.join(' AND '), params }
}

/**
 * 执行一次搜索：有 keyword 时走 FTS5 MATCH 并按相关度（rank）排序，
 * 无 keyword 时仅按筛选条件并以修改时间倒序返回。
 */
export function search(db: AppDatabase, query: SearchQuery): SearchResult {
  const start = performance.now()
  const match = buildFtsMatch(query.keyword)
  const filters = buildFilters(query)

  const whereParts: string[] = []
  const whereParams: Array<string | number> = []

  if (match !== null) {
    whereParts.push('files_fts MATCH ?')
    whereParams.push(match)
  }
  if (filters.sql) {
    whereParts.push(filters.sql)
    whereParams.push(...filters.params)
  }
  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : ''

  // 有全文匹配时 JOIN FTS 索引并按 rank 排序；否则直接查主表按 mtime 倒序。
  const fromSql =
    match !== null ? 'FROM files JOIN files_fts ON files.id = files_fts.rowid' : 'FROM files'
  const orderSql = match !== null ? 'ORDER BY files_fts.rank' : 'ORDER BY files.mtime DESC'

  const totalRow = db
    .prepare(`SELECT COUNT(*) AS n ${fromSql} ${whereSql}`)
    .get(...whereParams) as { n: number }

  const rows = db
    .prepare(
      `SELECT files.id, files.path, files.name, files.ext, files.size, files.mtime, files.is_dir ` +
        `${fromSql} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    )
    .all(...whereParams, query.limit, query.offset) as FileRow[]

  return {
    items: rows.map(rowToRecord),
    total: totalRow.n,
    elapsedMs: Math.round((performance.now() - start) * 100) / 100,
  }
}
