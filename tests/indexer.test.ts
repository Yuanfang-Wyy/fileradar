import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, countFiles, type AppDatabase } from '../src/main/db'
import {
  globToRegExp,
  makeExcludeMatcher,
  extractFileMeta,
  startIndexing,
  toPinyin,
} from '../src/main/indexer'
import { DEFAULT_EXCLUDE_PATTERNS } from '../src/shared/constants'

describe('toPinyin', () => {
  it('中文转拼音首字母 + 全拼', () => {
    const r = toPinyin('移动底座')
    expect(r).toContain('yddz')
    expect(r).toContain('yidongdizuo')
  })
  it('纯英文返回空串', () => {
    expect(toPinyin('annual_report.pdf')).toBe('')
  })
  it('中英混合只取中文部分', () => {
    expect(toPinyin('移动report')).toContain('yd')
  })
})

describe('globToRegExp / makeExcludeMatcher', () => {
  it('** 跨目录匹配子路径', () => {
    const re = globToRegExp('**/node_modules/**')
    expect(re.test('/a/b/node_modules/c')).toBe(true)
    expect(re.test('/a/b/src/c')).toBe(false)
  })
  it('* 不跨目录分隔符', () => {
    expect(globToRegExp('*.txt').test('a.txt')).toBe(true)
    expect(globToRegExp('*.txt').test('a/b.txt')).toBe(false)
  })
  it('默认排除集命中常见目录', () => {
    const m = makeExcludeMatcher(DEFAULT_EXCLUDE_PATTERNS)
    expect(m('/x/node_modules/y')).toBe(true)
    expect(m('/x/.git/config')).toBe(true)
    expect(m('/x/project/main.ts')).toBe(false)
  })
})

describe('extractFileMeta', () => {
  it('提取名称/小写扩展名/目录标志/大小', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'fr-meta-'))
    try {
      const filePath = join(dir, 'Hello.PDF')
      await writeFile(filePath, 'content')
      const meta = extractFileMeta(filePath, await stat(filePath))
      expect(meta.name).toBe('Hello.PDF')
      expect(meta.ext).toBe('pdf')
      expect(meta.isDir).toBe(false)
      expect(meta.size).toBeGreaterThan(0)

      const dirMeta = extractFileMeta(dir, await stat(dir))
      expect(dirMeta.isDir).toBe(true)
      expect(dirMeta.ext).toBe('')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})

describe('startIndexing (集成)', () => {
  let root: string
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fr-scan-'))
    await writeFile(join(root, 'a.txt'), 'a')
    await mkdir(join(root, 'sub'))
    await writeFile(join(root, 'sub', 'b.md'), 'b')
    await mkdir(join(root, 'node_modules'))
    await writeFile(join(root, 'node_modules', 'pkg.js'), 'x') // 应被排除
  })
  afterEach(async () => {
    await rm(root, { recursive: true, force: true })
  })

  it('全量扫描入库，并跳过 node_modules 子树', async () => {
    const db: AppDatabase = openDatabase(':memory:')
    const phases: string[] = []
    await startIndexing(db, [root], DEFAULT_EXCLUDE_PATTERNS, (p) => phases.push(p.phase))

    // a.txt + sub(目录) + sub/b.md = 3；node_modules 整棵被排除
    expect(countFiles(db)).toBe(3)
    expect(phases[0]).toBe('scanning')
    expect(phases.at(-1)).toBe('complete')

    const leaked = db.prepare('SELECT path FROM files WHERE path LIKE ?').all('%node_modules%')
    expect(leaked).toHaveLength(0)
  })
})
