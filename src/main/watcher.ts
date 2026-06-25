import { stat } from 'node:fs/promises'
import chokidar, { type FSWatcher } from 'chokidar'
import { deleteByPath, deleteByPathPrefix, makeUpsert, type AppDatabase } from './db'
import { extractFileMeta } from './indexer'

export interface WatchHandlers {
  onUpsert: (path: string) => Promise<void>
  onUnlink: (path: string) => void
  onUnlinkDir: (path: string) => void
}

/**
 * 构造文件系统事件处理器，与 chokidar 解耦以便直接单元测试：
 *   add/change/addDir → 重新 stat 后 upsert；unlink → 删单条；unlinkDir → 删目录子树。
 */
export function makeWatchHandlers(db: AppDatabase): WatchHandlers {
  const upsert = makeUpsert(db)
  return {
    onUpsert: async (path: string): Promise<void> => {
      try {
        upsert(extractFileMeta(path, await stat(path)))
      } catch {
        // 文件出现后又被迅速移除等竞态，忽略本次事件
      }
    },
    onUnlink: (path: string): void => {
      deleteByPath(db, path)
    },
    onUnlinkDir: (path: string): void => {
      deleteByPathPrefix(db, path)
    },
  }
}

/**
 * 启动文件系统监听做增量索引维护。ignoreInitial=true，因为全量索引已由 indexer 完成，
 * 这里只跟进后续变更。返回 FSWatcher，调用方负责退出/重配置时 close()。
 */
export function startWatching(
  db: AppDatabase,
  dirs: string[],
  excludePatterns: string[],
): FSWatcher {
  const handlers = makeWatchHandlers(db)

  const watcher = chokidar.watch(dirs, {
    ignored: excludePatterns,
    ignoreInitial: true,
    persistent: true,
    followSymlinks: false,
    // 等待写入稳定，避免大文件复制过程中反复触发 change。
    awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
  })

  watcher
    .on('add', (path) => {
      void handlers.onUpsert(path)
    })
    .on('change', (path) => {
      void handlers.onUpsert(path)
    })
    .on('addDir', (path) => {
      void handlers.onUpsert(path)
    })
    .on('unlink', (path) => {
      handlers.onUnlink(path)
    })
    .on('unlinkDir', (path) => {
      handlers.onUnlinkDir(path)
    })

  return watcher
}
