import { app, globalShortcut } from 'electron'
import log from 'electron-log/main'
import type { AppSettings } from '@shared/types'

/** 应用开机自启设置（macOS：登录时启动并隐藏到托盘）。 */
export function applyAutoLaunch(settings: AppSettings): void {
  app.setLoginItemSettings({ openAtLogin: settings.launchAtLogin, openAsHidden: true })
}

/**
 * 注册全局快捷键唤起：先清空旧注册再注册新键。
 * 注册失败（如默认 Cmd+Space 被 Spotlight 占用）不抛错，仅记录日志并返回 false，
 * 由用户在设置里改成可用的组合键。
 */
export function registerGlobalShortcut(settings: AppSettings, onTrigger: () => void): boolean {
  globalShortcut.unregisterAll()
  if (!settings.globalShortcut) {
    return false
  }
  try {
    const ok = globalShortcut.register(settings.globalShortcut, onTrigger)
    if (!ok) {
      log.warn(`全局快捷键注册失败（可能已被占用）：${settings.globalShortcut}`)
    }
    return ok
  } catch (error) {
    log.warn(`全局快捷键无效：${settings.globalShortcut}`, error)
    return false
  }
}
