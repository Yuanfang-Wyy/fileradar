import { app } from 'electron'
import Store from 'electron-store'
import { DEFAULT_SETTINGS } from '@shared/constants'
import type { AppSettings } from '@shared/types'

// 主进程用户配置持久化（electron-store）。ipcHandlers 与 index.ts 共享此模块，
// 作为 settings 的唯一来源。
const store = new Store<AppSettings>({ defaults: DEFAULT_SETTINGS })

/**
 * 读取当前配置。watchDirs 为空时回退到用户主目录
 * （DEFAULT_SETTINGS 不能在 shared 层调用 Node API，故在此填充）。
 */
export function getSettings(): AppSettings {
  const current = store.store
  if (current.watchDirs.length === 0) {
    return { ...current, watchDirs: [app.getPath('home')] }
  }
  return current
}

/** 合并写入部分配置项，返回写入后的完整配置。 */
export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  for (const [key, value] of Object.entries(patch) as [keyof AppSettings, AppSettings[keyof AppSettings]][]) {
    if (value !== undefined) {
      store.set(key, value)
    }
  }
  return getSettings()
}
