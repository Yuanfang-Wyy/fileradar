import { app, globalShortcut } from 'electron'
import log from 'electron-log/main'
import { GlobalKeyboardListener } from 'node-global-key-listener'
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

let keyListener: GlobalKeyboardListener | null = null

// 双击间隔阈值（毫秒）：两次 Cmd 释放间隔小于此值视为双击。
const DOUBLE_TAP_MS = 400

/**
 * 注册「双击 Command 键」全局唤起（macOS 需辅助功能权限，首次会弹系统授权）。
 * 检测连续两次 Cmd 释放间隔 < DOUBLE_TAP_MS，且其间没有其它按键按下
 * （以排除 Cmd+C 等组合键的误触发）。注册失败仅记录日志，不影响其它功能。
 */
export function registerDoubleCmd(onTrigger: () => void): void {
  if (keyListener) {
    return
  }
  let lastCmdUp = 0
  let sawOtherKey = false
  try {
    keyListener = new GlobalKeyboardListener()
    keyListener.addListener((event) => {
      const isCmd = event.name === 'LEFT META' || event.name === 'RIGHT META'
      if (event.state === 'DOWN' && !isCmd) {
        sawOtherKey = true
        return
      }
      if (event.state === 'UP' && isCmd) {
        const now = Date.now()
        if (now - lastCmdUp < DOUBLE_TAP_MS && !sawOtherKey) {
          onTrigger()
          lastCmdUp = 0
        } else {
          lastCmdUp = now
        }
        sawOtherKey = false
      }
    })
  } catch (error) {
    log.warn('双击 Cmd 监听注册失败（可能缺少辅助功能权限）', error)
  }
}

/** 停止全局键盘监听（退出时调用）。 */
export function stopDoubleCmd(): void {
  keyListener?.kill()
  keyListener = null
}
