import { ipcMain, shell } from 'electron'
import { IPC } from '@shared/ipc'

// 注册所有 IPC handle。完整实现见 Phase 3。
// Phase 1 先接通与数据层无关的文件操作通道，便于端到端验证 IPC 链路。
export function registerIpcHandlers(): void {
  ipcMain.handle(IPC.FILE.REVEAL, (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle(IPC.FILE.OPEN, async (_event, filePath: string) => {
    const error = await shell.openPath(filePath)
    if (error) {
      throw new Error(`无法打开文件：${error}`)
    }
  })

  // TODO(Phase 3): 注册 index:start/stop、search:query、settings:get/set。
}
