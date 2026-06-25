import { join } from 'path'
import { Menu, Tray, nativeImage } from 'electron'

export interface TrayCallbacks {
  onToggle: () => void
  onReindex: () => void
  onQuit: () => void
}

let tray: Tray | null = null

/** 创建系统托盘：左键切换主窗口显隐，右键弹出菜单。 */
export function createTray(callbacks: TrayCallbacks): Tray {
  const icon = nativeImage.createFromPath(join(__dirname, '../../resources/tray-icon.png'))
  if (!icon.isEmpty()) {
    icon.setTemplateImage(true) // macOS 模板图：随菜单栏明暗自动反色
  }

  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  if (icon.isEmpty()) {
    tray.setTitle('🔍') // 图标缺失时回退为菜单栏文字
  }
  tray.setToolTip('FileRadar — 文件检索')

  const menu = Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: callbacks.onToggle },
    { label: '重建索引', click: callbacks.onReindex },
    { type: 'separator' },
    { label: '退出 FileRadar', click: callbacks.onQuit },
  ])

  // 不用 setContextMenu，以便左键单击直接切换窗口（否则 macOS 左键也会弹菜单）
  tray.on('click', () => callbacks.onToggle())
  tray.on('right-click', () => tray?.popUpContextMenu(menu))

  return tray
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
