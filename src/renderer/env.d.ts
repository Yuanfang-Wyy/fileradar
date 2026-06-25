/// <reference types="vite/client" />
import type { IpcRendererApi } from '@shared/ipc'

// preload 通过 contextBridge 注入的全局对象，供渲染进程类型安全地调用。
declare global {
  interface Window {
    fileRadar: IpcRendererApi
  }
}

export {}
