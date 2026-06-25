import type { FileRecord } from '@shared/types'

interface ResultItemProps {
  file: FileRecord
}

// 单条搜索结果：图标 + 文件名 + 路径 + 大小。Phase 4 实现。
// TODO(Phase 4): 文件类型图标、路径高亮、双击在 Finder 中打开。
export function ResultItem({ file }: ResultItemProps): JSX.Element {
  return <div className="no-drag truncate px-4 py-1.5 text-sm">{file.name}</div>
}
