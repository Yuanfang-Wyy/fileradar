// 搜索结果列表（@tanstack/react-virtual 虚拟滚动）。Phase 4 实现。
// TODO(Phase 4): 用 useVirtualizer 渲染大量 ResultItem，避免一次性挂载全部 DOM。
export function ResultList(): JSX.Element {
  return <div className="no-drag flex-1 overflow-auto" />
}
