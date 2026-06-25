import { join } from 'path'
import { app, BrowserWindow, globalShortcut, shell } from 'electron'
import log from 'electron-log/main'
import type { AppSettings } from '@shared/types'
import { openDatabase, type AppDatabase } from './db'
import { registerIpcHandlers, runIndexing, stopWatcher } from './ipcHandlers'
import { createTray, destroyTray } from './tray'
import { applyAutoLaunch, registerGlobalShortcut } from './system'
import { buildAppMenu } from './menu'
import { getSettings } from './settings'

log.initialize()

const isDev = Boolean(process.env['ELECTRON_RENDERER_URL'])

let mainWindow: BrowserWindow | null = null
let db: AppDatabase | null = null
let isQuitting = false

const getWindow = (): BrowserWindow | null => mainWindow

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 14, y: 22 }, // 红绿灯垂直对齐搜索栏，避免与 🔍 重叠
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // 关闭按钮仅隐藏窗口，应用驻留托盘（仅在真正退出时放行）
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  // 失焦自动隐藏（Everything 风格的「唤起→用完即走」）。开发模式禁用以便调试。
  if (!isDev) {
    mainWindow.on('blur', () => {
      mainWindow?.hide()
    })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/** 切换主窗口显隐：可见且聚焦时隐藏，否则显示并聚焦。 */
function toggleWindow(): void {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isVisible() && mainWindow.isFocused()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

/** 应用与系统相关的配置：开机自启 + 全局快捷键。配置变更后也会调用。 */
function applySystemSettings(settings: AppSettings): void {
  applyAutoLaunch(settings)
  registerGlobalShortcut(settings, toggleWindow)
}

app.whenReady().then(() => {
  db = openDatabase(join(app.getPath('userData'), 'fileradar.db'))
  registerIpcHandlers(db, getWindow, applySystemSettings)
  createWindow()
  const reindex = (): void => {
    if (db) runIndexing(db, getWindow)
  }
  createTray({
    onToggle: toggleWindow,
    onReindex: reindex,
    onQuit: () => app.quit(),
  })
  buildAppMenu({ getWindow, onReindex: reindex })
  applySystemSettings(getSettings())

  app.on('activate', () => {
    if (!mainWindow) {
      createWindow()
    } else {
      mainWindow.show()
    }
  })

  log.info('FileRadar 主进程已启动')
})

// 托盘常驻：关闭窗口不退出应用（靠托盘/快捷键重新唤起）。
app.on('window-all-closed', () => {
  // 有意为空：不调用 app.quit()，应用驻留托盘。
})

app.on('before-quit', () => {
  isQuitting = true
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopWatcher()
  destroyTray()
  db?.close()
  db = null
})
