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

type GetWindow = () => BrowserWindow | null

// 增量监听实例，全量索引完成后启动；重新索引时先关闭旧实例。
let watcher: FSWatcher | null = null

/**
 * 执行全量索引（后台不阻塞），进度/完成经 webContents 推送，完成后（重）启动增量监听。
 * 供 IPC index:start 与托盘「重建索引」共用。
 */
export function runIndexing(db: AppDatabase, getWindow: GetWindow, dirs?: string[]): void {
  const settings = getSettings()
  const targets = dirs && dirs.length > 0 ? dirs : settings.watchDirs
  void startIndexing(db, targets, settings.excludePatterns, (progress) => {
    getWindow()?.webContents.send(IPC.INDEX.PROGRESS, progress)
  })
    .then(() => {
      getWindow()?.webContents.send(IPC.INDEX.COMPLETE)
      void watcher?.close()
      watcher = startWatching(db, targets, settings.excludePatterns)
    })
    .catch((error: unknown) => {
      log.error('索引失败', error)
    })
}

/** 停止增量监听（退出或手动停止时调用）。 */
export function stopWatcher(): void {
  void watcher?.close()
  watcher = null
}

/**
 * 注册所有 IPC handle。
 * @param db 已初始化的数据库连接
 * @param getWindow 返回当前主窗口，用于推送索引进度
 * @param onSettingsChanged 配置写入后回调（main 据此重新应用快捷键/自启）
 */
export function registerIpcHandlers(
  db: AppDatabase,
  getWindow: GetWindow,
  onSettingsChanged: (settings: AppSettings) => void,
): void {
  ipcMain.handle(IPC.SEARCH.QUERY, (_event, query: SearchQuery) => search(db, query))

  ipcMain.handle(IPC.SETTINGS.GET, () => getSettings())
  ipcMain.handle(IPC.SETTINGS.SET, (_event, patch: Partial<AppSettings>) => {
    const updated = updateSettings(patch)
    onSettingsChanged(updated)
    return updated
  })

  ipcMain.handle(IPC.INDEX.START, (_event, dirs?: string[]) => {
    runIndexing(db, getWindow, dirs)
  })
  ipcMain.handle(IPC.INDEX.STOP, () => {
    stopWatcher()
  })

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
