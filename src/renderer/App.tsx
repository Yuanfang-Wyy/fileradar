// Phase 1 骨架界面：验证无边框窗口 + React + Tailwind 链路。
// 真实搜索框/结果列表/状态栏将在 Phase 4 由 components 下的组件替换。
export default function App(): JSX.Element {
  return (
    <div className="flex h-full flex-col bg-white/70 text-zinc-900 dark:bg-zinc-900/70 dark:text-zinc-100">
      {/* 顶部搜索栏：整条作为无边框窗口拖拽区，输入框本身禁止拖拽 */}
      <div className="drag-region flex items-center gap-3 border-b border-black/10 px-4 py-3 dark:border-white/10">
        <span className="text-base text-zinc-400" aria-hidden>
          🔍
        </span>
        <input
          autoFocus
          placeholder="搜索文件名或路径…"
          className="no-drag w-full bg-transparent text-base outline-none placeholder:text-zinc-400"
        />
      </div>

      {/* 结果区占位 */}
      <div className="flex flex-1 select-none items-center justify-center text-sm text-zinc-400">
        FileRadar 骨架已就绪 · Phase 1
      </div>

      {/* 底部状态栏占位 */}
      <div className="flex items-center justify-between border-t border-black/10 px-4 py-1.5 text-xs text-zinc-400 dark:border-white/10">
        <span>索引：0 个文件</span>
        <span>就绪</span>
      </div>
    </div>
  )
}
