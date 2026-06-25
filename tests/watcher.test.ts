import { describe, it, expect, afterEach } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { openDatabase, countFiles } from '../src/main/db'
import { makeWatchHandlers } from '../src/main/watcher'

// 直接驱动事件处理器，验证「文件变更正确反映到索引」这一关键风险，
// 不依赖 chokidar 的真实事件时序（其端到端连接在 dev 阶段验证）。
describe('makeWatchHandlers', () => {
  let root: string | undefined
  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true })
      root = undefined
    }
  })

  it('onUpsert 入库文件、onUnlink 删除', async () => {
    root = await mkdtemp(join(tmpdir(), 'fr-wh-'))
    const db = openDatabase(':memory:')
    const h = makeWatchHandlers(db)
    const filePath = join(root, 'new.txt')
    await writeFile(filePath, 'hello')

    await h.onUpsert(filePath)
    expect(countFiles(db)).toBe(1)

    h.onUnlink(filePath)
    expect(countFiles(db)).toBe(0)
  })

  it('onUpsert 幂等：同一路径重复 upsert 不产生重复行', async () => {
    root = await mkdtemp(join(tmpdir(), 'fr-wh-'))
    const db = openDatabase(':memory:')
    const h = makeWatchHandlers(db)
    const filePath = join(root, 'dup.txt')
    await writeFile(filePath, 'v1')
    await h.onUpsert(filePath)
    await writeFile(filePath, 'v2-longer')
    await h.onUpsert(filePath)
    expect(countFiles(db)).toBe(1)
  })

  it('onUnlinkDir 级联删除目录及其子树', async () => {
    root = await mkdtemp(join(tmpdir(), 'fr-wh-'))
    const db = openDatabase(':memory:')
    const h = makeWatchHandlers(db)
    const sub = join(root, 'sub')
    await mkdir(sub)
    const f1 = join(sub, 'a.txt')
    const f2 = join(sub, 'b.txt')
    await writeFile(f1, 'a')
    await writeFile(f2, 'b')
    await h.onUpsert(sub)
    await h.onUpsert(f1)
    await h.onUpsert(f2)
    expect(countFiles(db)).toBe(3)

    h.onUnlinkDir(sub)
    expect(countFiles(db)).toBe(0)
  })

  it('onUpsert 对不存在路径静默跳过', async () => {
    const db = openDatabase(':memory:')
    const h = makeWatchHandlers(db)
    await h.onUpsert('/nonexistent/path/xyz-should-not-throw')
    expect(countFiles(db)).toBe(0)
  })
})
