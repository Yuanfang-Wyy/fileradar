import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { FileRecord } from '@shared/types'
import { ResultItem } from './ResultItem'

const ROW_HEIGHT = 30

interface ResultListProps {
  items: FileRecord[]
  selected: number
  onSelect: (index: number) => void
  onActivate: (file: FileRecord) => void
}

/** 虚拟滚动结果列表：仅渲染可见行，支撑十万级结果不卡顿。 */
export function ResultList({ items, selected, onSelect, onActivate }: ResultListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  })

  // 键盘移动选中项时滚动到可见区域
  useEffect(() => {
    if (items.length > 0) {
      virtualizer.scrollToIndex(selected, { align: 'auto' })
    }
  }, [selected, items.length, virtualizer])

  return (
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
  )
}
