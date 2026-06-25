import { useEffect, useRef, useState } from 'react'
import { DEFAULT_MAX_RESULTS, SEARCH_DEBOUNCE_MS } from '@shared/constants'
import type { SearchResult } from '@shared/types'

const EMPTY_RESULT: SearchResult = { items: [], total: 0, elapsedMs: 0 }

export interface UseSearch {
  keyword: string
  setKeyword: (keyword: string) => void
  ext: string
  setExt: (ext: string) => void
  result: SearchResult
  loading: boolean
}

/**
 * 搜索 hook：关键词/扩展名筛选变化后防抖 SEARCH_DEBOUNCE_MS 经 IPC 查询。
 * 关键词为空时也查询（返回最近修改的文件，类 Everything 行为）。
 */
export function useSearch(): UseSearch {
  const [keyword, setKeyword] = useState('')
  const [ext, setExt] = useState('')
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLoading(true)
      window.fileRadar.search
        .query({ keyword, ext: ext || undefined, limit: DEFAULT_MAX_RESULTS, offset: 0 })
        .then(setResult)
        .catch(() => setResult(EMPTY_RESULT))
        .finally(() => setLoading(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [keyword, ext])

  return { keyword, setKeyword, ext, setExt, result, loading }
}
