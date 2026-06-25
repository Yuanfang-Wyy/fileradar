import type { CSSProperties, MouseEvent } from 'react'
import type { FileRecord } from '@shared/types'
import { FileIcon } from './FileIcon'

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}

export function formatTime(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  const p = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

interface ResultItemProps {
  file: FileRecord
  selected: boolean
  style: CSSProperties
  gridCols: string
  onSelect: () => void
  onActivate: () => void
  onContextMenu: (event: MouseEvent) => void
}

/** 表格化的单条结果：彩色类型图标 + 名称 | 路径 | 大小 | 修改时间。选中态为 Finder 风格蓝底白字。 */
export function ResultItem({
  file,
  selected,
  style,
  gridCols,
  onSelect,
  onActivate,
  onContextMenu,
}: ResultItemProps): JSX.Element {
  const sub = selected ? 'text-white/75' : 'text-zinc-400 dark:text-zinc-500'
  return (
    <div
      style={{ ...style, display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
      onClick={onSelect}
      onDoubleClick={onActivate}
      onContextMenu={onContextMenu}
      title={file.path}
      className={`cursor-default text-[13px] ${
        selected
          ? 'bg-blue-500 text-white'
          : 'text-zinc-800 hover:bg-black/[0.04] dark:text-zinc-100 dark:hover:bg-white/[0.05]'
      }`}
    >
      <span className="flex items-center gap-2.5 truncate pl-3 pr-2">
        <FileIcon ext={file.ext} isDir={file.isDir} size={17} />
        <span className="truncate">{file.name}</span>
      </span>
      <span className={`truncate px-2 text-xs ${sub}`}>{file.path}</span>
      <span className={`truncate px-2 text-right text-xs tabular-nums ${sub}`}>
        {file.isDir ? '—' : formatSize(file.size)}
      </span>
      <span className={`truncate px-3 text-right text-xs tabular-nums ${sub}`}>
        {formatTime(file.mtime)}
      </span>
    </div>
  )
}
