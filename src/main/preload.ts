import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type IpcRendererApi } from '@shared/ipc'
import type { AppSettings, IndexProgress, SearchQuery, SearchResult } from '@shared/types'

// 经 contextBridge 暴露给渲染进程的唯一通信入口。渲染进程不直接接触 ipcRenderer。
const api: IpcRendererApi = {
  index: {
    start: (dirs) => ipcRenderer.invoke(IPC.INDEX.START, dirs),
    stop: () => ipcRenderer.invoke(IPC.INDEX.STOP),
    onProgress: (cb) => {
      const listener = (_event: IpcRendererEvent, progress: IndexProgress): void => cb(progress)
      ipcRenderer.on(IPC.INDEX.PROGRESS, listener)
      return () => {
        ipcRenderer.removeListener(IPC.INDEX.PROGRESS, listener)
      }
    },
    onComplete: (cb) => {
      const listener = (): void => cb()
      ipcRenderer.on(IPC.INDEX.COMPLETE, listener)
      return () => {
        ipcRenderer.removeListener(IPC.INDEX.COMPLETE, listener)
      }
    },
  },
  search: {
    query: (query: SearchQuery): Promise<SearchResult> => ipcRenderer.invoke(IPC.SEARCH.QUERY, query),
  },
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS.GET),
    set: (patch): Promise<AppSettings> => ipcRenderer.invoke(IPC.SETTINGS.SET, patch),
  },
  file: {
    reveal: (path: string) => ipcRenderer.invoke(IPC.FILE.REVEAL, path),
    open: (path: string) => ipcRenderer.invoke(IPC.FILE.OPEN, path),
  },
  dialog: {
    pickDir: (): Promise<string[]> => ipcRenderer.invoke(IPC.DIALOG.PICK_DIR),
  },
  menu: {
    onAction: (cb) => {
      const listener = (_event: IpcRendererEvent, action: string): void => cb(action)
      ipcRenderer.on(IPC.MENU.ACTION, listener)
      return () => {
        ipcRenderer.removeListener(IPC.MENU.ACTION, listener)
      }
    },
  },
}

contextBridge.exposeInMainWorld('fileRadar', api)
