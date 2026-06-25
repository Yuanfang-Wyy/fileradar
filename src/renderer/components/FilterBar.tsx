interface FilterBarProps {
  ext: string
  onExt: (ext: string) => void
}

// 常见扩展名快捷筛选。空串表示「全部」。当前 searcher 按单一扩展名精确匹配。
const QUICK_EXTS = ['', 'pdf', 'docx', 'xlsx', 'png', 'jpg', 'mp4', 'mp3', 'zip', 'md', 'ts']
const LABELS: Record<string, string> = { '': '全部' }

/** 扩展名快速筛选栏。 */
export function FilterBar({ ext, onExt }: FilterBarProps): JSX.Element {
  return (
    <div className="no-drag flex items-center gap-1 overflow-x-auto border-b border-black/10 px-3 py-1.5 dark:border-white/10">
      {QUICK_EXTS.map((value) => {
        const active = ext === value
        return (
          <button
            key={value || 'all'}
            type="button"
            onClick={() => onExt(value)}
            className={`shrink-0 rounded px-2 py-0.5 text-xs ${
              active
                ? 'bg-blue-500 text-white'
                : 'text-zinc-500 hover:bg-black/5 dark:text-zinc-400 dark:hover:bg-white/10'
            }`}
          >
            {LABELS[value] ?? value.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
