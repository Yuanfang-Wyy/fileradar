// 所有 IPC 通道名的唯一来源。禁止在业务代码中硬编码通道字符串。
// 命名格式：模块:动作。
import type { AppSettings, IndexProgress, SearchQuery, SearchResult } from './types'

export const IPC = {
  INDEX: {
    START: 'index:start',
    STOP: 'index:stop',
    PROGRESS: 'index:progress',
    COMPLETE: 'index:complete',
  },
  SEARCH: {
    QUERY: 'search:query',
    RESULT: 'search:result',
  },
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
  },
  FILE: {
    REVEAL: 'file:reveal',
    OPEN: 'file:open',
  },
  DIALOG: {
    PICK_DIR: 'dialog:pickDir',
  },
} as const

/**
 * preload 通过 contextBridge 暴露给渲染进程的 API 形状。
 * renderer 只能经由此接口与主进程通信，不直接接触 ipcRenderer。
 * 各 onXxx 订阅方法返回一个取消订阅函数。
 */
export interface IpcRendererApi {
  index: {
    start: (dirs?: string[]) => Promise<void>
    stop: () => Promise<void>
    onProgress: (cb: (progress: IndexProgress) => void) => () => void
    onComplete: (cb: () => void) => () => void
  }
  search: {
    query: (query: SearchQuery) => Promise<SearchResult>
  }
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  file: {
    reveal: (path: string) => Promise<void>
    open: (path: string) => Promise<void>
  }
  dialog: {
    pickDir: () => Promise<string[]>
  }
}
