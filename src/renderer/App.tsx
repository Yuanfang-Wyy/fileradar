import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import type { FileRecord, SortColumn } from '@shared/types'
import { useSearch } from './hooks/useSearch'
import { useIndex } from './hooks/useIndex'
import { useSettings } from './hooks/useSettings'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { ResultList } from './components/ResultList'
import { StatusBar } from './components/StatusBar'
import { Settings } from './components/Settings'

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
  const { keyword, setKeyword, ext, setExt, sortBy, sortOrder, toggleSort, result, loading } = useSearch()
  const { progress, indexing, start } = useIndex()
  const { settings, update } = useSettings()
  const [selected, setSelected] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = result.items

  useEffect(() => {
    setSelected(0)
  }, [result])

  // 响应应用菜单（系统菜单栏）触发的动作
  useEffect(() => {
    return window.fileRadar.menu.onAction((action) => {
      if (action === 'focus-search') {
        inputRef.current?.focus()
      } else if (action === 'clear-search') {
        setKeyword('')
      } else if (action === 'open-settings') {
        setShowSettings(true)
      } else if (action.startsWith('sort:')) {
        toggleSort(action.slice('sort:'.length) as SortColumn)
      }
    })
  }, [setKeyword, toggleSort])

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
      <FilterBar ext={ext} onExt={setExt} />

      {items.length === 0 ? (
        <div className="flex flex-1 select-none items-center justify-center px-6 text-center text-sm text-zinc-400">
          {keyword || ext ? '无匹配结果' : '点击「重建索引」开始扫描，然后输入关键词搜索'}
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
