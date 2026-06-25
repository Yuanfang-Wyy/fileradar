import type { IndexProgress } from '@shared/types'

interface StatusBarProps {
  total: number
  shown: number
  elapsedMs: number
  loading: boolean
  indexing: boolean
  progress: IndexProgress | null
}

/** 底部状态栏：索引进度 / 结果数量 + 搜索耗时。 */
export function StatusBar({
  total,
  shown,
  elapsedMs,
  loading,
  indexing,
  progress,
}: StatusBarProps): JSX.Element {
  return (
    <div className="flex items-center justify-between border-t border-black/[0.07] bg-black/[0.015] px-4 py-1.5 text-[11px] text-zinc-400 dark:border-white/10 dark:bg-white/[0.02]">
      <span className="truncate">
        {indexing
          ? `索引中：已扫描 ${(progress?.scanned ?? 0).toLocaleString()} 个${progress?.currentDir ? ` · ${progress.currentDir}` : ''}`
          : `${total.toLocaleString()} 个结果${total > shown ? `（显示前 ${shown}）` : ''}`}
      </span>
      <span className="shrink-0 tabular-nums">{loading ? '搜索中…' : `${elapsedMs} ms`}</span>
    </div>
  )
}
