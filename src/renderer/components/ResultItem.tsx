import type { CSSProperties, MouseEvent } from 'react'
import type { FileRecord } from '@shared/types'

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

const IMAGE = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'bmp', 'ico'])
const VIDEO = new Set(['mp4', 'mov', 'avi', 'mkv', 'webm'])
const AUDIO = new Set(['mp3', 'wav', 'flac', 'aac', 'm4a'])
const ARCHIVE = new Set(['zip', 'tar', 'gz', 'rar', '7z', 'dmg'])
const CODE = new Set(['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'json', 'md', 'sh', 'css', 'html'])

function iconFor(file: FileRecord): string {
  if (file.isDir) return '📁'
  const ext = file.ext
  if (IMAGE.has(ext)) return '🖼️'
  if (VIDEO.has(ext)) return '🎬'
  if (AUDIO.has(ext)) return '🎵'
  if (ext === 'pdf') return '📕'
  if (ARCHIVE.has(ext)) return '🗜️'
  if (CODE.has(ext)) return '📜'
  return '📄'
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

/** 表格化的单条结果：名称（图标+名）| 路径 | 大小 | 修改时间。列宽由 gridCols 动态决定。 */
export function ResultItem({
  file,
  selected,
  style,
  gridCols,
  onSelect,
  onActivate,
  onContextMenu,
}: ResultItemProps): JSX.Element {
  return (
    <div
      style={{ ...style, display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center' }}
      onClick={onSelect}
      onDoubleClick={onActivate}
      onContextMenu={onContextMenu}
      title={file.path}
      className={`cursor-default text-sm ${
        selected ? 'bg-blue-500/15 dark:bg-blue-400/20' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <span className="flex items-center gap-2 truncate px-3">
        <span className="shrink-0">{iconFor(file)}</span>
        <span className="truncate">{file.name}</span>
      </span>
      <span className="truncate px-2 text-xs text-zinc-400">{file.path}</span>
      <span className="truncate px-2 text-right text-xs tabular-nums text-zinc-400">
        {file.isDir ? '—' : formatSize(file.size)}
      </span>
      <span className="truncate px-3 text-right text-xs tabular-nums text-zinc-400">
        {formatTime(file.mtime)}
      </span>
    </div>
  )
}
