import type { CSSProperties } from 'react'
import type { FileRecord } from '@shared/types'

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
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
  onSelect: () => void
  onActivate: () => void
}

/** 单条搜索结果：图标 + 文件名 + 路径 + 大小。双击/激活在 Finder 中显示。 */
export function ResultItem({ file, selected, style, onSelect, onActivate }: ResultItemProps): JSX.Element {
  return (
    <div
      style={style}
      onClick={onSelect}
      onDoubleClick={onActivate}
      title={`双击在 Finder 中显示\n${file.path}`}
      className={`flex cursor-default items-center gap-3 px-4 text-sm ${
        selected ? 'bg-blue-500/15 dark:bg-blue-400/20' : 'hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      <span className="shrink-0">{iconFor(file)}</span>
      <span className="shrink-0 truncate font-medium" style={{ maxWidth: '40%' }}>
        {file.name}
      </span>
      <span className="flex-1 truncate text-xs text-zinc-400">{file.path}</span>
      {!file.isDir && (
        <span className="shrink-0 text-xs tabular-nums text-zinc-400">{formatSize(file.size)}</span>
      )}
    </div>
  )
}
