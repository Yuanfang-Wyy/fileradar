import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import log from 'electron-log/main'
import type { FSWatcher } from 'chokidar'
import { IPC } from '@shared/ipc'
import type { AppSettings, SearchQuery } from '@shared/types'
import type { AppDatabase } from './db'
import { search } from './searcher'
import { startIndexing } from './indexer'
import { startWatching } from './watcher'
import { getSettings, updateSettings } from './settings'

// 增量监听实例，全量索引完成后启动；重新索引时先关闭旧实例。
let watcher: FSWatcher | null = null

/**
 * 注册所有 IPC handle。
 * @param db 已初始化的数据库连接
 * @param getWindow 返回当前主窗口，用于向渲染进程推送索引进度
 */
export function registerIpcHandlers(
  db: AppDatabase,
  getWindow: () => BrowserWindow | null,
): void {
  // 搜索：同步查询直接返回结果
  ipcMain.handle(IPC.SEARCH.QUERY, (_event, query: SearchQuery) => search(db, query))

  // 配置读写
  ipcMain.handle(IPC.SETTINGS.GET, () => getSettings())
  ipcMain.handle(IPC.SETTINGS.SET, (_event, patch: Partial<AppSettings>) => updateSettings(patch))

  // 全量索引：后台执行（不阻塞 invoke），进度/完成经 webContents 推送
  ipcMain.handle(IPC.INDEX.START, (_event, dirs?: string[]) => {
    const settings = getSettings()
    const targets = dirs && dirs.length > 0 ? dirs : settings.watchDirs
    void startIndexing(db, targets, settings.excludePatterns, (progress) => {
      getWindow()?.webContents.send(IPC.INDEX.PROGRESS, progress)
    })
      .then(() => {
        getWindow()?.webContents.send(IPC.INDEX.COMPLETE)
        // 全量完成后（重）启动增量监听
        void watcher?.close()
        watcher = startWatching(db, targets, settings.excludePatterns)
      })
      .catch((error: unknown) => {
        log.error('索引失败', error)
      })
  })

  ipcMain.handle(IPC.INDEX.STOP, () => {
    // TODO(后续): 为 indexer 接入 AbortSignal 以支持中断全量扫描；当前仅停止增量监听
    void watcher?.close()
    watcher = null
  })

  // 在 Finder 中显示 / 用默认程序打开
  ipcMain.handle(IPC.FILE.REVEAL, (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
  ipcMain.handle(IPC.FILE.OPEN, async (_event, filePath: string) => {
    const error = await shell.openPath(filePath)
    if (error) {
      throw new Error(`无法打开文件：${error}`)
    }
  })

  // 目录选择对话框：设置面板添加监听目录用，返回所选目录路径（取消返回空数组）
  ipcMain.handle(IPC.DIALOG.PICK_DIR, async () => {
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory', 'multiSelections', 'createDirectory'],
    }
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    return result.canceled ? [] : result.filePaths
  })
}

