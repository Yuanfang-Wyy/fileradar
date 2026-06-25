interface TypeStyle {
  color: string
  label: string
}

// 扩展名 → 颜色 + 角标缩写（office 用其品牌色，便于一眼区分 docx/xlsx/pptx）。
const TYPE_MAP: Record<string, TypeStyle> = {
  doc: { color: '#2b579a', label: 'DOC' },
  docx: { color: '#2b579a', label: 'DOC' },
  rtf: { color: '#2b579a', label: 'RTF' },
  xls: { color: '#217346', label: 'XLS' },
  xlsx: { color: '#217346', label: 'XLS' },
  csv: { color: '#217346', label: 'CSV' },
  ppt: { color: '#c43e1c', label: 'PPT' },
  pptx: { color: '#c43e1c', label: 'PPT' },
  key: { color: '#c43e1c', label: 'KEY' },
  pdf: { color: '#d93831', label: 'PDF' },
  png: { color: '#7c6bbb', label: 'IMG' },
  jpg: { color: '#7c6bbb', label: 'IMG' },
  jpeg: { color: '#7c6bbb', label: 'IMG' },
  gif: { color: '#7c6bbb', label: 'GIF' },
  webp: { color: '#7c6bbb', label: 'IMG' },
  svg: { color: '#7c6bbb', label: 'SVG' },
  heic: { color: '#7c6bbb', label: 'IMG' },
  bmp: { color: '#7c6bbb', label: 'IMG' },
  ico: { color: '#7c6bbb', label: 'ICO' },
  mp4: { color: '#d6577f', label: 'VID' },
  mov: { color: '#d6577f', label: 'VID' },
  avi: { color: '#d6577f', label: 'VID' },
  mkv: { color: '#d6577f', label: 'VID' },
  webm: { color: '#d6577f', label: 'VID' },
  mp3: { color: '#1aa179', label: 'AUD' },
  wav: { color: '#1aa179', label: 'WAV' },
  flac: { color: '#1aa179', label: 'AUD' },
  aac: { color: '#1aa179', label: 'AUD' },
  m4a: { color: '#1aa179', label: 'AUD' },
  zip: { color: '#b7791f', label: 'ZIP' },
  tar: { color: '#b7791f', label: 'TAR' },
  gz: { color: '#b7791f', label: 'GZ' },
  rar: { color: '#b7791f', label: 'RAR' },
  '7z': { color: '#b7791f', label: '7Z' },
  dmg: { color: '#b7791f', label: 'DMG' },
  ts: { color: '#4571a8', label: 'TS' },
  tsx: { color: '#4571a8', label: 'TSX' },
  js: { color: '#caa92e', label: 'JS' },
  jsx: { color: '#caa92e', label: 'JSX' },
  json: { color: '#caa92e', label: '{ }' },
  py: { color: '#4571a8', label: 'PY' },
  go: { color: '#4571a8', label: 'GO' },
  rs: { color: '#a8553a', label: 'RS' },
  sh: { color: '#4b5563', label: 'SH' },
  html: { color: '#d6577f', label: '< >' },
  css: { color: '#4571a8', label: 'CSS' },
  md: { color: '#64748b', label: 'MD' },
  txt: { color: '#64748b', label: 'TXT' },
}

function typeStyle(ext: string): TypeStyle {
  return TYPE_MAP[ext] ?? { color: '#94a3b8', label: ext ? ext.slice(0, 3).toUpperCase() : '' }
}

interface FileIconProps {
  ext: string
  isDir: boolean
  size?: number
}

/** 按文件类型着色的矢量图标：文件夹用蓝色文件夹，文件用品牌色卡片 + 类型角标。 */
export function FileIcon({ ext, isDir, size = 18 }: FileIconProps): JSX.Element {
  if (isDir) {
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
        <path
          d="M2 6 a1.6 1.6 0 0 1 1.6 -1.6 H8 l1.8 1.8 h6.6 A1.6 1.6 0 0 1 18 7.8 V15 a1.6 1.6 0 0 1 -1.6 1.6 H3.6 A1.6 1.6 0 0 1 2 15 Z"
          fill="#54a0e0"
        />
        <path d="M2 7.6 h16 V15 a1.6 1.6 0 0 1 -1.6 1.6 H3.6 A1.6 1.6 0 0 1 2 15 Z" fill="#6db0ee" />
      </svg>
    )
  }
  const { color, label } = typeStyle(ext)
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden className="shrink-0">
      <path
        d="M5 1.6 h6.6 L16 6 v11.4 a1.4 1.4 0 0 1 -1.4 1.4 H5 a1.4 1.4 0 0 1 -1.4 -1.4 V3 A1.4 1.4 0 0 1 5 1.6 Z"
        fill={color}
      />
      <path d="M11.4 1.7 v3.5 a0.9 0.9 0 0 0 0.9 0.9 H15.9 Z" fill="#000" opacity="0.16" />
      <text
        x="9.7"
        y="14.6"
        fontSize="5.4"
        fontWeight="700"
        fill="#fff"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
      >
        {label}
      </text>
    </svg>
  )
}
