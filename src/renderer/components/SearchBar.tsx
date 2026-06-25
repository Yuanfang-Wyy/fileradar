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
 * 顶部搜索栏：左侧留出 84px 给 macOS 红绿灯，自动聚焦输入框 + 重建索引/设置按钮。
 * 键盘导航（↑↓/Enter/Esc）由父组件经 onKeyDown 处理，以配合虚拟滚动列表。
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
    <div
      className="drag-region flex items-center gap-2.5 border-b border-black/[0.07] dark:border-white/10"
      style={{ paddingLeft: 84, paddingRight: 12, height: 52 }}
    >
      <svg width="16" height="16" viewBox="0 0 20 20" className="shrink-0 text-zinc-400" aria-hidden>
        <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <line x1="12.7" y1="12.7" x2="17" y2="17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        autoFocus
        value={keyword}
        onChange={(e) => onKeyword(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="搜索文件名或路径…"
        spellCheck={false}
        className="no-drag flex-1 bg-transparent text-[15px] outline-none placeholder:text-zinc-400"
      />
      <button
        type="button"
        onClick={onReindex}
        disabled={indexing}
        className="no-drag shrink-0 rounded-md bg-black/[0.06] px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-black/[0.1] disabled:opacity-50 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.16]"
      >
        {indexing ? '索引中…' : '重建索引'}
      </button>
      <button
        type="button"
        onClick={onOpenSettings}
        title="设置"
        className="no-drag shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-black/[0.06] hover:text-zinc-600 dark:hover:bg-white/10"
      >
        <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
          />
        </svg>
      </button>
    </div>
  )
}
