import type { KeyboardEvent, RefObject } from 'react'

interface SearchBarProps {
  keyword: string
  onKeyword: (keyword: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onReindex: () => void
  onOpenSettings: () => void
  indexing: boolean
  inputRef: RefObject<HTMLInputElement>
}

/**
 * 顶部搜索栏：自动聚焦的受控输入框（cmdk 视觉风格）+ 重建索引 / 设置按钮。
 * 键盘导航（↑↓/Enter/Esc）由父组件经 onKeyDown 统一处理，以配合虚拟滚动列表。
 */
export function SearchBar({
  keyword,
  onKeyword,
  onKeyDown,
  onReindex,
  onOpenSettings,
  indexing,
  inputRef,
}: SearchBarProps): JSX.Element {
  return (
    <div className="drag-region flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
      <span className="text-base text-zinc-400" aria-hidden>
        🔍
      </span>
      <input
        ref={inputRef}
        autoFocus
        value={keyword}
        onChange={(e) => onKeyword(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="搜索文件名或路径…"
        spellCheck={false}
        className="no-drag w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
      />
      <button
        type="button"
        onClick={onReindex}
        disabled={indexing}
        className="no-drag shrink-0 rounded-md bg-zinc-200/70 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-300/70 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
      >
        {indexing ? '索引中…' : '重建索引'}
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        title="设置"
        className="no-drag shrink-0 rounded-md px-1.5 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
      >
        ⚙️
      </button>
    </div>
  )
}
