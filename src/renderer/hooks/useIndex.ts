import { useCallback, useEffect, useState } from 'react'
import type { IndexProgress } from '@shared/types'

export interface UseIndex {
  progress: IndexProgress | null
  indexing: boolean
  start: (dirs?: string[]) => void
}

/**
 * 索引状态 hook：订阅主进程推送的进度/完成事件，并提供触发全量索引的方法。
 */
export function useIndex(): UseIndex {
  const [progress, setProgress] = useState<IndexProgress | null>(null)
  const [indexing, setIndexing] = useState(false)

  useEffect(() => {
    const offProgress = window.fileRadar.index.onProgress((p) => {
      setProgress(p)
      setIndexing(p.phase !== 'complete' && p.phase !== 'error')
    })
    const offComplete = window.fileRadar.index.onComplete(() => {
      setIndexing(false)
    })
    return () => {
      offProgress()
      offComplete()
    }
  }, [])

  const start = useCallback((dirs?: string[]) => {
    setIndexing(true)
    void window.fileRadar.index.start(dirs)
  }, [])

  return { progress, indexing, start }
}
