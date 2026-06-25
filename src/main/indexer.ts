import { readdir, stat } from 'node:fs/promises'
import type { Stats } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { INDEX_BATCH_SIZE } from '@shared/constants'
import type { IndexProgress } from '@shared/types'
import { clearAll, makeUpsert, type AppDatabase, type FileInput } from './db'

/** 从文件路径与 stat 结果提取入库元数据。纯函数，便于单元测试。 */
export function extractFileMeta(fullPath: string, stats: Stats): FileInput {
  const isDir = stats.isDirectory()
  const name = basename(fullPath)
  return {
    path: fullPath,
    name,
    ext: isDir ? '' : extname(name).slice(1).toLowerCase(),
    size: stats.size,
    mtime: Math.floor(stats.mtimeMs),
    isDir,
  }
}

/**
 * 将一条 glob 规则编译为锚定的正则。支持 `**`（跨目录任意）、`*`（单层任意）、`?`。
 * 纯函数，便于单元测试。
 */
export function globToRegExp(glob: string): RegExp {
  let re = ''
  let i = 0
  while (i < glob.length) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i += 2
        if (glob[i] === '/') i += 1 // 吞掉 **/ 的斜杠，使 **/x 也能匹配位于根部的 x
        re += '.*'
      } else {
        re += '[^/]*'
        i += 1
      }
    } else if (c === '?') {
      re += '[^/]'
      i += 1
    } else if ('.+^${}()|[]\\/'.includes(c)) {
      re += `\\${c}`
      i += 1
    } else {
      re += c
      i += 1
    }
  }
  return new RegExp(`^${re}$`)
}

/** 构造排除判断函数：任一 glob 命中即视为排除。 */
export function makeExcludeMatcher(patterns: string[]): (path: string) => boolean {
  const regexps = patterns.map(globToRegExp)
  return (path: string): boolean => regexps.some((re) => re.test(path))
}

// 目录是否应整棵跳过：目录自身被排除，或其内容会被排除（如 **/node_modules/**）。
function shouldSkipDir(matcher: (p: string) => boolean, dirPath: string): boolean {
  return matcher(dirPath) || matcher(`${dirPath}/`)
}

interface ScanItem {
  path: string
  stats: Stats
}

// 用显式栈做迭代式递归遍历，避免超深目录导致调用栈溢出；对无权限/失效路径静默跳过。
async function* walk(
  roots: string[],
  matcher: (p: string) => boolean,
): AsyncGenerator<ScanItem> {
  const stack = [...roots]
  while (stack.length > 0) {
    const current = stack.pop() as string
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      continue // 权限不足或目录消失，跳过
    }
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) {
        if (shouldSkipDir(matcher, full)) continue
        try {
          yield { path: full, stats: await stat(full) }
        } catch {
          continue
        }
        stack.push(full)
      } else if (entry.isFile()) {
        if (matcher(full)) continue
        try {
          yield { path: full, stats: await stat(full) }
        } catch {
          continue
        }
      }
      // 符号链接等其它类型忽略，避免环路
    }
  }
}

/**
 * 全量扫描 dirs 并重建索引：清空旧数据后逐目录遍历，按 INDEX_BATCH_SIZE 分批事务写入，
 * 并通过 onProgress 回报进度。
 */
export async function startIndexing(
  db: AppDatabase,
  dirs: string[],
  excludePatterns: string[],
  onProgress: (progress: IndexProgress) => void,
): Promise<void> {
  const matcher = makeExcludeMatcher(excludePatterns)
  const upsert = makeUpsert(db)
  const flush = db.transaction((items: FileInput[]) => {
    for (const item of items) upsert(item)
  })

  clearAll(db)
  onProgress({ scanned: 0, total: -1, currentDir: '', phase: 'scanning' })

  let scanned = 0
  let batch: FileInput[] = []
  for await (const { path, stats } of walk(dirs, matcher)) {
    batch.push(extractFileMeta(path, stats))
    scanned += 1
    if (batch.length >= INDEX_BATCH_SIZE) {
      flush(batch)
      batch = []
      onProgress({ scanned, total: -1, currentDir: dirname(path), phase: 'indexing' })
    }
  }
  if (batch.length > 0) {
    flush(batch)
  }

  onProgress({ scanned, total: scanned, currentDir: '', phase: 'complete' })
}
