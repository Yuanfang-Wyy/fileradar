import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

// 数据层测试跑在系统 node（better-sqlite3 的 node 版本二进制）。
export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
