import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_MAX_RESULTS, SEARCH_DEBOUNCE_MS } from '@shared/constants'
import type { SearchMode, SearchResult, SortColumn, SortOrder } from '@shared/types'

const EMPTY_RESULT: SearchResult = { items: [], total: 0, elapsedMs: 0 }
const PERSIST_KEY = 'scout:search'

interface PersistedSearch {
  sortBy?: SortColumn | null
  sortOrder?: SortOrder
  ext?: string
}

function loadPersisted(): PersistedSearch {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PERSIST_KEY) ?? '{}')
    if (parsed && typeof parsed === 'object') {
      return parsed as PersistedSearch
    }
  } catch {
    /* 无持久化或解析失败 */
  }
  return {}
}

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
 * 搜索 hook：关键词/筛选/排序/模式变化后防抖经 IPC 查询。
 * mode 由调用方（按设置）传入，决定搜索模式（文件名/内容/语义）。
 * 排序列与扩展名筛选持久化到 localStorage。
 */
export function useSearch(mode: SearchMode = 'filename'): UseSearch {
  const [keyword, setKeyword] = useState('')
  const [ext, setExt] = useState<string>(() => loadPersisted().ext ?? '')
  const [sortBy, setSortBy] = useState<SortColumn | null>(() => loadPersisted().sortBy ?? null)
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => loadPersisted().sortOrder ?? 'asc')
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
    localStorage.setItem(PERSIST_KEY, JSON.stringify({ sortBy, sortOrder, ext }))
  }, [sortBy, sortOrder, ext])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setLoading(true)
      window.fileRadar.search
        .query({
          mode,
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
  }, [mode, keyword, ext, sortBy, sortOrder])

  return { keyword, setKeyword, ext, setExt, sortBy, sortOrder, toggleSort, result, loading }
}
