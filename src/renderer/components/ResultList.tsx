import { useEffect, useRef } from 'react'
import type { MouseEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FileRecord, SortColumn, SortOrder } from '@shared/types'
import { GRID_COLS, ResultItem } from './ResultItem'

const ROW_HEIGHT = 30

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

interface HeaderCellProps {
  label: string
  column: SortColumn
  sortBy: SortColumn | null
  sortOrder: SortOrder
  onSort: (column: SortColumn) => void
  align?: 'left' | 'right'
}

function HeaderCell({ label, column, sortBy, sortOrder, onSort, align = 'left' }: HeaderCellProps): JSX.Element {
  const active = sortBy === column
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:hover:bg-white/10 ${
        align === 'right' ? 'justify-end' : ''
      } ${active ? 'text-zinc-700 dark:text-zinc-200' : 'text-zinc-400'}`}
    >
      <span className="truncate">{label}</span>
      {active && <span aria-hidden>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
    </button>
  )
}

/** 表格式结果列表：可排序列头（不滚动）+ 虚拟滚动行区。 */
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* 列头：与行共用 GRID_COLS 模板保证对齐 */}
      <div
        style={{ display: 'grid', gridTemplateColumns: GRID_COLS }}
        className="no-drag shrink-0 border-b border-black/10 dark:border-white/10"
      >
        <HeaderCell label="名称" column="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
        <HeaderCell label="路径" column="path" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
        <HeaderCell label="大小" column="size" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />
        <HeaderCell label="修改时间" column="mtime" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />
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
