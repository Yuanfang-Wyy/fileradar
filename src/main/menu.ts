import { app, dialog, Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron'
import { IPC } from '@shared/ipc'

export interface MenuActions {
  getWindow: () => BrowserWindow | null
  onReindex: () => void
}

// 将需要渲染进程处理的菜单动作经 IPC 推送给前端（聚焦搜索、排序、打开设置等）。
function sendAction(getWindow: () => BrowserWindow | null, action: string): void {
  getWindow()?.webContents.send(IPC.MENU.ACTION, action)
}

/** 构建并设置应用菜单（对标 Everything 的菜单栏，映射到 FileRadar 功能）。 */
export function buildAppMenu(actions: MenuActions): void {
  const isMac = process.platform === 'darwin'
  const send = (action: string): void => sendAction(actions.getWindow, action)

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: '文件',
      submenu: [
        { label: '重建索引', accelerator: 'CmdOrCtrl+R', click: () => actions.onReindex() },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭窗口' } : { role: 'quit', label: '退出' },
      ],
    },
    { role: 'editMenu', label: '编辑' },
    {
      label: '视图',
      submenu: [
        { label: '聚焦搜索框', accelerator: 'CmdOrCtrl+F', click: () => send('focus-search') },
        { label: '清空搜索', click: () => send('clear-search') },
        { type: 'separator' },
        { label: '按名称排序', click: () => send('sort:name') },
        { label: '按路径排序', click: () => send('sort:path') },
        { label: '按大小排序', click: () => send('sort:size') },
        { label: '按修改时间排序', click: () => send('sort:mtime') },
        { type: 'separator' },
        { role: 'reload', label: '刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
      ],
    },
    {
      label: '工具',
      submenu: [{ label: '设置…', accelerator: 'CmdOrCtrl+,', click: () => send('open-settings') }],
    },
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '关于 FileRadar',
          click: () => {
            void dialog.showMessageBox({
              type: 'info',
              title: 'FileRadar',
              message: `FileRadar ${app.getVersion()}`,
              detail: 'Mac 桌面文件检索工具，功能对标 Windows Everything。',
            })
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
