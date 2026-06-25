import { useSearch } from './hooks/useSearch'
import { useIndex } from './hooks/useIndex'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

// Phase 3 最小可用界面：搜索框 + 结果列表 + 状态栏，验证 IPC 端到端。
// 虚拟滚动、组件拆分、筛选栏、设置面板在 Phase 4 完善。
export default function App(): JSX.Element {
  const { keyword, setKeyword, result, loading } = useSearch()
  const { progress, indexing, start } = useIndex()

  return (
    <div className="flex h-full flex-col bg-white/70 text-zinc-900 dark:bg-zinc-900/70 dark:text-zinc-100">
      {/* 顶部搜索栏：整条作为无边框窗口拖拽区，交互元素禁止拖拽 */}
      <div className="drag-region flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <span className="text-base text-zinc-400" aria-hidden>
          🔍
        </span>
        <input
          autoFocus
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索文件名或路径…"
          className="no-drag w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
        />
        <button
          type="button"
          onClick={() => start()}
          disabled={indexing}
          className="no-drag shrink-0 rounded-md bg-zinc-200/70 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-300/70 disabled:opacity-50 dark:bg-white/10 dark:text-zinc-300 dark:hover:bg-white/20"
        >
          {indexing ? '索引中…' : '重建索引'}
        </button>
      </div>

      {/* 结果列表 */}
      <div className="no-drag flex-1 overflow-auto">
        {result.items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            {keyword ? '无匹配结果' : '点击「重建索引」开始扫描，然后输入关键词搜索'}
          </div>
        ) : (
          result.items.map((item) => (
            <div
              key={item.id}
              onDoubleClick={() => void window.fileRadar.file.reveal(item.path)}
              title={`双击在 Finder 中显示\n${item.path}`}
              className="flex cursor-default items-baseline gap-3 px-4 py-1.5 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <span className="shrink-0 text-sm">{item.isDir ? '📁' : '📄'}</span>
              <span className="shrink-0 truncate text-sm font-medium">{item.name}</span>
              <span className="flex-1 truncate text-xs text-zinc-400">{item.path}</span>
              {!item.isDir && (
                <span className="shrink-0 text-xs tabular-nums text-zinc-400">
                  {formatSize(item.size)}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="flex items-center justify-between border-t border-black/10 px-4 py-1.5 text-xs text-zinc-400 dark:border-white/10">
        <span>
          {indexing
            ? `索引中：已扫描 ${progress?.scanned ?? 0} 个`
            : `${result.total} 个结果`}
        </span>
        <span>{loading ? '搜索中…' : `${result.elapsedMs} ms`}</span>
      </div>
    </div>
  )
}
