import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FileRecord, SortColumn, SortOrder } from '@shared/types'
import { ResultItem } from './ResultItem'

const ROW_HEIGHT = 30
const MIN_COL_WIDTH = 60
const WIDTHS_KEY = 'fileradar:colWidths'
const DEFAULT_WIDTHS = [220, 380, 96, 150] // 名称 / 路径 / 大小 / 修改时间

const COLUMNS: { col: SortColumn; label: string; align: 'left' | 'right' }[] = [
  { col: 'name', label: '名称', align: 'left' },
  { col: 'path', label: '路径', align: 'left' },
  { col: 'size', label: '大小', align: 'right' },
  { col: 'mtime', label: '修改时间', align: 'right' },
]

function loadWidths(): number[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(WIDTHS_KEY) ?? '')
    if (Array.isArray(parsed) && parsed.length === 4 && parsed.every((n) => typeof n === 'number')) {
      return parsed as number[]
    }
  } catch {
    /* 无持久化或解析失败，用默认 */
  }
  return [...DEFAULT_WIDTHS]
}

interface ResultListProps {
  items: FileRecord[]
  selected: number
  onSelect: (index: number) => void
  onActivate: (file: FileRecord) => void
  onContextMenu: (file: FileRecord, event: MouseEvent) => void
  sortBy: SortColumn | null
  sortOrder: SortOrder
  onSort: (column: SortColumn) => void
}

/** 表格式结果列表：可排序、可拖拽调宽的列头（持久化列宽）+ 虚拟滚动行区。 */
export function ResultList({
  items,
  selected,
  onSelect,
  onActivate,
  onContextMenu,
  sortBy,
  sortOrder,
  onSort,
}: ResultListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)
  const [widths, setWidths] = useState<number[]>(loadWidths)
  const gridCols = widths.map((w) => `${w}px`).join(' ')

  useEffect(() => {
    localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths))
  }, [widths])

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  useEffect(() => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(selected, { align: 'auto' })
    }
  }, [selected, items.length, virtualizer])

  // 拖拽列分隔条调整列宽：基于按下时的起始宽度 + 鼠标位移
  const startResize = (index: number, event: MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    const startX = event.clientX
    const startWidth = widths[index] ?? DEFAULT_WIDTHS[index] ?? 120
    const onMove = (e: globalThis.MouseEvent): void => {
      const next = [...widths]
      next[index] = Math.max(MIN_COL_WIDTH, startWidth + (e.clientX - startX))
      setWidths(next)
    }
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 列头：可点排序 + 列间分隔条可拖拽调宽 */}
      <div
        style={{ display: 'grid', gridTemplateColumns: gridCols }}
        className="no-drag shrink-0 border-b border-black/10 dark:border-white/10"
      >
        {COLUMNS.map((column, index) => {
          const active = sortBy === column.col
          return (
            <div key={column.col} className="relative flex items-center">
              <button
                type="button"
                onClick={() => onSort(column.col)}
                className={`flex flex-1 items-center gap-1 truncate px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 ${
                  column.align === 'right' ? 'justify-end' : ''
                } ${active ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400'}`}
              >
                <span className="truncate">{column.label}</span>
                {active && <span aria-hidden>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </button>
              {index < COLUMNS.length - 1 && (
                <div
                  onMouseDown={(e) => startResize(index, e)}
                  className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-blue-500/50"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 虚拟滚动行区 */}
      <div ref={parentRef} className="no-drag flex-1 overflow-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((row) => {
            const file = items[row.index]
            if (!file) return null
            return (
              <ResultItem
                key={file.id}
                file={file}
                selected={row.index === selected}
                gridCols={gridCols}
                onSelect={() => onSelect(row.index)}
                onActivate={() => onActivate(file)}
                onContextMenu={(event) => onContextMenu(file, event)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${row.size}px`,
                  transform: `translateY(${row.start}px)`,
                }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
