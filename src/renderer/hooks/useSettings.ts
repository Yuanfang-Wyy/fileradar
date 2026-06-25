import { useCallback, useEffect, useState } from 'react'
import type { AppSettings } from '@shared/types'

export interface UseSettings {
  settings: AppSettings | null
  update: (patch: Partial<AppSettings>) => void
}

/** 用户配置 hook：启动时经 IPC 拉取，update 写回后同步本地状态。 */
export function useSettings(): UseSettings {
  const [settings, setSettings] = useState<AppSettings | null>(null)

  useEffect(() => {
    void window.fileRadar.settings.get().then(setSettings)
  }, [])

  const update = useCallback((patch: Partial<AppSettings>) => {
    void window.fileRadar.settings.set(patch).then(setSettings)
  }, [])

  return { settings, update }
}
