// electron-builder 打包配置（Mac DMG）。
// 注：CLAUDE.md 目录约定为 .ts，此处用 .cjs 以免引入 ts-node 依赖来加载 TS 配置（配置等价）。
/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: 'com.scout.app',
  productName: 'Scout',
  directories: {
    output: 'release',
    buildResources: 'resources',
  },
  files: ['out/**/*', '!**/*.{map,md,ts}'],
  // 原生模块与外部 binary 必须解包到 asar 之外，运行时才能 require/spawn：
  //   better-sqlite3 → .node 原生模块；node-global-key-listener → MacKeyServer binary
  asarUnpack: [
    '**/node_modules/better-sqlite3/**',
    '**/node_modules/node-global-key-listener/**',
  ],
  mac: {
    category: 'public.app-category.utilities',
    icon: 'resources/icon.png',
    target: [{ target: 'dmg', arch: ['arm64'] }],
    identity: null, // 不做正式签名（Phase 6 占位）；electron-builder 对 arm64 自动 ad-hoc 签名
    extendInfo: {
      // 扫描受保护目录所需的权限描述（见 CLAUDE.md 第八节第 1 条）
      NSDesktopFolderUsageDescription: 'Scout 需要访问桌面以建立文件索引。',
      NSDocumentsFolderUsageDescription: 'Scout 需要访问文稿以建立文件索引。',
      NSDownloadsFolderUsageDescription: 'Scout 需要访问下载以建立文件索引。',
    },
  },
  dmg: {
    title: 'Scout ${version}',
    contents: [
      { x: 140, y: 200, type: 'file' },
      { x: 400, y: 200, type: 'link', path: '/Applications' },
    ],
  },
}
