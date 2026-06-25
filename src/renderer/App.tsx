import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import type { FileRecord } from '@shared/types'
import { useSearch } from './hooks/useSearch'
import { useIndex } from './hooks/useIndex'
import { useSettings } from './hooks/useSettings'
import { SearchBar } from './components/SearchBar'
import { FilterBar } from './components/FilterBar'
import { ResultList } from './components/ResultList'
import { StatusBar } from './components/StatusBar'
import { Settings } from './components/Settings'

export default function App(): JSX.Element {
  const { keyword, setKeyword, ext, setExt, result, loading } = useSearch()
  const { progress, indexing, start } = useIndex()
  const { settings, update } = useSettings()
  const [selected, setSelected] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const items = result.items

  // 每次结果集变化重置选中项到首行
  useEffect(() => {
    setSelected(0)
  }, [result])

  const activate = useCallback((file: FileRecord) => {
    void window.fileRadar.file.reveal(file.path)
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
      if (keyword) setKeyword('')
      else if (showSettings) setShowSettings(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-white/70 text-zinc-900 dark:bg-zinc-900/70 dark:text-zinc-100">
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
        <ResultList items={items} selected={selected} onSelect={setSelected} onActivate={activate} />
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
    </div>
  )
}
