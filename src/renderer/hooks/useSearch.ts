import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_MAX_RESULTS, SEARCH_DEBOUNCE_MS } from '@shared/constants'
import type { SearchResult, SortColumn, SortOrder } from '@shared/types'

const EMPTY_RESULT: SearchResult = { items: [], total: 0, elapsedMs: 0 }

export interface UseSearch {
  keyword: string
  setKeyword: (keyword: string) => void
  ext: string
  setExt: (ext: string) => void
  sortBy: SortColumn | null
  sortOrder: SortOrder
  toggleSort: (column: SortColumn) => void
  result: SearchResult
  loading: boolean
}

/**
 * 搜索 hook：关键词/筛选/排序变化后防抖 SEARCH_DEBOUNCE_MS 经 IPC 查询。
 * toggleSort：点同列切换升降序，点新列则以该列升序开始。
 */
export function useSearch(): UseSearch {
  const [keyword, setKeyword] = useState('')
  const [ext, setExt] = useState('')
  const [sortBy, setSortBy] = useState<SortColumn | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [result, setResult] = useState<SearchResult>(EMPTY_RESULT)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const toggleSort = useCallback(
    (column: SortColumn) => {
      if (sortBy === column) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortBy(column)
        setSortOrder('asc')
      }
    },
    [sortBy],
  )

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLoading(true)
      window.fileRadar.search
        .query({
          keyword,
          ext: ext || undefined,
          sortBy: sortBy ?? undefined,
          sortOrder,
          limit: DEFAULT_MAX_RESULTS,
          offset: 0,
        })
        .then(setResult)
        .catch(() => setResult(EMPTY_RESULT))
        .finally(() => setLoading(false))
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [keyword, ext, sortBy, sortOrder])

  return { keyword, setKeyword, ext, setExt, sortBy, sortOrder, toggleSort, result, loading }
}
