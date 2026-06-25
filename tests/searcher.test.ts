import { describe, it, expect } from 'vitest'
import { openDatabase, makeUpsert, type AppDatabase, type FileInput } from '../src/main/db'
import { buildFtsMatch, buildFilters, buildOrderBy, search } from '../src/main/searcher'

function file(over: Partial<FileInput> & { path: string; name: string }): FileInput {
  return { ext: '', size: 0, mtime: 0, isDir: false, ...over }
}

function seed(db: AppDatabase, files: FileInput[]): void {
  const upsert = makeUpsert(db)
  for (const f of files) upsert(f)
}

describe('buildFtsMatch', () => {
  it('空输入返回 null', () => {
    expect(buildFtsMatch('')).toBeNull()
    expect(buildFtsMatch('   ')).toBeNull()
  })
  it('单词加前缀通配', () => {
    expect(buildFtsMatch('report')).toBe('"report"*')
  })
  it('多词以空格连接（FTS5 隐式 AND）', () => {
    expect(buildFtsMatch('annual report')).toBe('"annual"* "report"*')
  })
  it('转义内部双引号，防 FTS5 语法注入', () => {
    expect(buildFtsMatch('a"b')).toBe('"a""b"*')
  })
})

describe('buildFilters', () => {
  it('无筛选返回空 SQL', () => {
    expect(buildFilters({ keyword: '', limit: 10, offset: 0 }).sql).toBe('')
  })
  it('ext 归一化为小写', () => {
    const f = buildFilters({ keyword: '', ext: 'PDF', limit: 10, offset: 0 })
    expect(f.sql).toContain('files.ext = ?')
    expect(f.params).toContain('pdf')
  })
  it('size/time 范围按顺序入参', () => {
    const f = buildFilters({
      keyword: '',
      minSize: 100,
      maxSize: 200,
      startTime: 1,
      endTime: 2,
      limit: 10,
      offset: 0,
    })
    expect(f.params).toEqual([100, 200, 1, 2])
  })
})

describe('search (集成 :memory:)', () => {
  function makeDb(): AppDatabase {
    const db = openDatabase(':memory:')
    seed(db, [
      file({ path: '/docs/annual_report_2024.pdf', name: 'annual_report_2024.pdf', ext: 'pdf', size: 1000, mtime: 100 }),
      file({ path: '/docs/photo.jpg', name: 'photo.jpg', ext: 'jpg', size: 2000, mtime: 200 }),
      file({ path: '/docs/report_draft.txt', name: 'report_draft.txt', ext: 'txt', size: 50, mtime: 300 }),
    ])
    return db
  }

  it('关键词前缀匹配文件名', () => {
    const r = search(makeDb(), { keyword: 'report', limit: 50, offset: 0 })
    expect(r.total).toBe(2)
    expect(r.items.map((i) => i.name).sort()).toEqual([
      'annual_report_2024.pdf',
      'report_draft.txt',
    ])
  })
  it('ext 筛选与关键词叠加', () => {
    const r = search(makeDb(), { keyword: 'report', ext: 'pdf', limit: 50, offset: 0 })
    expect(r.total).toBe(1)
    expect(r.items[0]?.name).toBe('annual_report_2024.pdf')
  })
  it('空关键词返回全部，按 mtime 倒序', () => {
    const r = search(makeDb(), { keyword: '', limit: 50, offset: 0 })
    expect(r.total).toBe(3)
    expect(r.items[0]?.name).toBe('report_draft.txt') // mtime 300 最大
  })
  it('分页：total 不受 limit 影响', () => {
    const r = search(makeDb(), { keyword: '', limit: 1, offset: 0 })
    expect(r.items).toHaveLength(1)
    expect(r.total).toBe(3)
  })
  it('is_dir 映射为布尔 isDir', () => {
    const r = search(makeDb(), { keyword: 'photo', limit: 10, offset: 0 })
    expect(r.items[0]?.isDir).toBe(false)
  })

  it('按名称升序排序（不区分大小写）', () => {
    const r = search(makeDb(), { keyword: '', sortBy: 'name', sortOrder: 'asc', limit: 50, offset: 0 })
    expect(r.items.map((i) => i.name)).toEqual([
      'annual_report_2024.pdf',
      'photo.jpg',
      'report_draft.txt',
    ])
  })

  it('按大小降序排序', () => {
    const r = search(makeDb(), { keyword: '', sortBy: 'size', sortOrder: 'desc', limit: 50, offset: 0 })
    expect(r.items.map((i) => i.size)).toEqual([2000, 1000, 50])
  })
})

describe('buildOrderBy', () => {
  const base = { keyword: '', limit: 10, offset: 0 }
  it('无排序列 + 有匹配 → 相关度 rank', () => {
    expect(buildOrderBy({ ...base }, true)).toBe('ORDER BY files_fts.rank')
  })
  it('无排序列 + 无匹配 → 修改时间倒序', () => {
    expect(buildOrderBy({ ...base }, false)).toBe('ORDER BY files.mtime DESC')
  })
  it('名称升序用 COLLATE NOCASE', () => {
    expect(buildOrderBy({ ...base, sortBy: 'name', sortOrder: 'asc' }, false)).toBe(
      'ORDER BY files.name COLLATE NOCASE ASC',
    )
  })
  it('大小降序', () => {
    expect(buildOrderBy({ ...base, sortBy: 'size', sortOrder: 'desc' }, true)).toBe(
      'ORDER BY files.size DESC',
    )
  })
})
