// 渲染侧用户配置缓存（真实持久化在主进程 electron-store，经 IPC 同步）。
// Phase 4 实现：可用轻量 store 缓存 AppSettings，避免每个组件各自 IPC 拉取。
// TODO(Phase 4)
export {}
