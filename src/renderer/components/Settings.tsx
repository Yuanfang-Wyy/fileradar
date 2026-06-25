import type { AppSettings } from '@shared/types'

interface SettingsProps {
  settings: AppSettings
  onUpdate: (patch: Partial<AppSettings>) => void
  onClose: () => void
}

/** 设置面板（模态）：监听目录增删、全局快捷键、开机自启、最大结果数。 */
export function Settings({ settings, onUpdate, onClose }: SettingsProps): JSX.Element {
  const addDirs = async (): Promise<void> => {
    const picked = await window.fileRadar.dialog.pickDir()
    if (picked.length > 0) {
      const merged = Array.from(new Set([...settings.watchDirs, ...picked]))
      onUpdate({ watchDirs: merged })
    }
  }

  const removeDir = (dir: string): void => {
    onUpdate({ watchDirs: settings.watchDirs.filter((d) => d !== dir) })
  }

  return (
    <div
      className="no-drag absolute inset-0 z-10 flex items-start justify-center bg-black/30 pt-12"
      onClick={onClose}
    >
      <div
        className="max-h-[80%] w-[28rem] overflow-auto rounded-xl bg-white p-5 shadow-xl dark:bg-zinc-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 text-sm text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* 监听目录 */}
        <section className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">监听目录</span>
            <button
              type="button"
              onClick={() => void addDirs()}
              className="rounded bg-blue-500 px-2 py-0.5 text-xs text-white hover:bg-blue-600"
            >
              + 添加
            </button>
          </div>
          {settings.watchDirs.length === 0 ? (
            <p className="text-xs text-zinc-400">未配置，默认索引用户主目录</p>
          ) : (
            <ul className="space-y-1">
              {settings.watchDirs.map((dir) => (
                <li
                  key={dir}
                  className="flex items-center justify-between gap-2 rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/5"
                >
                  <span className="truncate" title={dir}>
                    {dir}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeDir(dir)}
                    className="shrink-0 text-zinc-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 全局快捷键 */}
        <section className="mb-4">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            全局快捷键（Phase 5 生效）
          </label>
          <input
            type="text"
            value={settings.globalShortcut}
            onChange={(e) => onUpdate({ globalShortcut: e.target.value })}
            className="w-full rounded border border-black/10 bg-transparent px-2 py-1 text-xs outline-none dark:border-white/10"
          />
        </section>

        {/* 开机自启 */}
        <section className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">开机自启动（Phase 5 生效）</span>
          <input
            type="checkbox"
            checked={settings.launchAtLogin}
            onChange={(e) => onUpdate({ launchAtLogin: e.target.checked })}
          />
        </section>

        {/* 最大结果数 */}
        <section className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500">最大结果数</span>
          <input
            type="number"
            min={10}
            max={5000}
            value={settings.maxResults}
            onChange={(e) => onUpdate({ maxResults: Number(e.target.value) || 200 })}
            className="w-24 rounded border border-black/10 bg-transparent px-2 py-1 text-xs outline-none dark:border-white/10"
          />
        </section>
      </div>
    </div>
  )
}
