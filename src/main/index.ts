import { join } from 'path'
import { app, BrowserWindow, shell } from 'electron'
import log from 'electron-log/main'
import { openDatabase, type AppDatabase } from './db'
import { registerIpcHandlers } from './ipcHandlers'

log.initialize()

let mainWindow: BrowserWindow | null = null
let db: AppDatabase | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    center: true,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
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

  // 应用内打开的外部链接交给系统浏览器，渲染进程不做站外导航。
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // 开发模式由 electron-vite 注入 renderer dev server 地址；生产加载打包产物。
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    void mainWindow.loadURL(rendererUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // 数据库存放于用户数据目录，跨启动持久化索引。
  db = openDatabase(join(app.getPath('userData'), 'fileradar.db'))
  registerIpcHandlers(db, () => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })

  log.info('FileRadar 主进程已启动')
})

// Phase 5 将改为「关闭窗口仅隐藏、托盘常驻」。当前在非 macOS 平台按惯例退出。
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  db?.close()
  db = null
})
