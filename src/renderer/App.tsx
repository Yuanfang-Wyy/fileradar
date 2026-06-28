import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { FileRecord, SearchMode } from '@shared/types'
import { useSearch } from './hooks/useSearch'
import { useIndex } from './hooks/useIndex'
import { useSettings } from './hooks/useSettings'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { ResultList } from './components/ResultList'
import { StatusBar } from './components/StatusBar'
import { Settings } from './components/Settings'

const SEARCH_MODES: { mode: SearchMode; label: string; ready: boolean }[] = [
  { mode: 'filename', label: '文件名', ready: true },
  { mode: 'content', label: '文件内容', ready: false },
  { mode: 'semantic', label: '语义', ready: false },
]
const MODE_LABEL: Record<SearchMode, string> = {
  filename: '文件名',
  content: '文件内容',
  semantic: '语义',
}

/** 搜索模式切换条：文件名可用，内容/语义标「开发中」（见 ROADMAP）。 */
function ModeBar({ mode, onChange }: { mode: SearchMode; onChange: (m: SearchMode) => void }): JSX.Element {
  return (
    <div className="no-drag flex items-center gap-1.5 border-b border-black/[0.07] px-3 py-1.5 dark:border-white/10">
      <span className="mr-0.5 text-[11px] text-zinc-400">搜索模式</span>
      {SEARCH_MODES.map(({ mode: m, label, ready }) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          title={ready ? '' : '开发中，见 ROADMAP'}
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs transition-colors ${
            mode === m
              ? 'bg-blue-500 text-white'
              : 'text-zinc-500 hover:bg-black/[0.06] dark:text-zinc-400 dark:hover:bg-white/10'
          }`}
        >
          {label}
          {!ready && <span className="ml-1 opacity-60">·开发中</span>}
        </button>
      ))}
    </div>
  )
}

interface ContextMenuState {
  x: number
  y: number
  file: FileRecord
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
    >
      {label}
    </button>
  )
}

function ContextMenu({ menu, onClose }: { menu: ContextMenuState; onClose: () => void }): JSX.Element {
  const { x, y, file } = menu
  const run = (fn: () => void) => (): void => {
    fn()
    onClose()
  }
  return (
    <div
      className="no-drag fixed z-20 min-w-44 rounded-lg border border-black/10 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-zinc-800"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem label="在 Finder 中显示" onClick={run(() => void window.fileRadar.file.reveal(file.path))} />
      <MenuItem label="用默认程序打开" onClick={run(() => void window.fileRadar.file.open(file.path))} />
      <div className="my-1 border-t border-black/5 dark:border-white/5" />
      <MenuItem label="复制完整路径" onClick={run(() => void navigator.clipboard.writeText(file.path))} />
      <MenuItem label="复制文件名" onClick={run(() => void navigator.clipboard.writeText(file.name))} />
    </div>
  )
}

export default function App(): JSX.Element {
  const { settings, update } = useSettings()
  const searchMode = settings?.searchMode ?? 'filename'
  const { keyword, setKeyword, ext, setExt, sortBy, sortOrder, toggleSort, result, loading } =
    useSearch(searchMode)
  const { progress, indexing, start } = useIndex()
  const [selected, setSelected] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = result.items

  useEffect(() => {
    setSelected(0)
  }, [result])

  // 双击 / Enter：用默认程序打开文件（「在 Finder 中显示」见右键菜单）
  const activate = useCallback((file: FileRecord) => {
    void window.fileRadar.file.open(file.path)
  }, [])

  const openContextMenu = useCallback((file: FileRecord, event: MouseEvent) => {
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY, file })
  }, [])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelected((s) => Math.min(s + 1, items.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelected((s) => Math.max(s - 1, 0))
    } else if (event.key === 'Enter') {
      const file = items[selected]
      if (file) activate(file)
    } else if (event.key === 'Escape') {
      if (menu) setMenu(null)
      else if (keyword) setKeyword('')
      else if (showSettings) setShowSettings(false)
    }
  }

  const emptyHint =
    searchMode !== 'filename'
      ? `「${MODE_LABEL[searchMode]}」搜索正在开发中（见 ROADMAP），请先切回「文件名」模式`
      : keyword || ext
        ? '无匹配结果'
        : '点击「重建索引」开始扫描，然后输入关键词搜索'

  return (
    <div
      className="flex h-full flex-col bg-white/70 text-zinc-900 dark:bg-zinc-900/70 dark:text-zinc-100"
      onClick={() => menu && setMenu(null)}
    >
      <SearchBar
        keyword={keyword}
        onKeyword={setKeyword}
        onKeyDown={onKeyDown}
        onReindex={() => start()}
        onOpenSettings={() => setShowSettings(true)}
        indexing={indexing}
        inputRef={inputRef}
      />
      <ModeBar mode={searchMode} onChange={(m) => update({ searchMode: m })} />
      <FilterBar ext={ext} onExt={setExt} />

      {items.length === 0 ? (
        <div className="flex flex-1 select-none items-center justify-center px-6 text-center text-sm text-zinc-400">
          {emptyHint}
        </div>
      ) : (
        <ResultList
          items={items}
          selected={selected}
          onSelect={setSelected}
          onActivate={activate}
          onContextMenu={openContextMenu}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={toggleSort}
        />
      )}

      <StatusBar
        total={result.total}
        shown={items.length}
        elapsedMs={result.elapsedMs}
        loading={loading}
        indexing={indexing}
        progress={progress}
      />

      {showSettings && settings && (
        <Settings settings={settings} onUpdate={update} onClose={() => setShowSettings(false)} />
      )}
      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
    </div>
  )
}
