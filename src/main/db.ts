import Database from 'better-sqlite3'
import type { FileRecord } from '@shared/types'

// 数据库实例类型别名，供其他模块（indexer/searcher）以类型安全方式接收连接。
export type AppDatabase = Database.Database

// Schema 见 CLAUDE.md 第四节 4.4：
//   - files：主表，path 唯一
//   - files_fts：FTS5 外部内容索引（content='files'），对 name/path 建全文索引
//   - 三个触发器（ai/ad/au）保持 FTS 与主表增删改同步
// 额外加了 ext/mtime/size 普通索引，用于筛选与排序（不在原 schema 中，属性能优化）。
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS files (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  path   TEXT NOT NULL UNIQUE,
  name   TEXT NOT NULL,
  ext    TEXT NOT NULL DEFAULT '',
  size   INTEGER NOT NULL DEFAULT 0,
  mtime  INTEGER NOT NULL DEFAULT 0,
  is_dir INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_files_ext   ON files(ext);
CREATE INDEX IF NOT EXISTS idx_files_mtime ON files(mtime);
CREATE INDEX IF NOT EXISTS idx_files_size  ON files(size);

CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name,
  path,
  content='files',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, path) VALUES('delete', old.id, old.name, old.path);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, path) VALUES('delete', old.id, old.name, old.path);
  INSERT INTO files_fts(rowid, name, path) VALUES (new.id, new.name, new.path);
END;
`

/**
 * 在给定连接上创建/迁移 schema，并设置适合「大量写入 + 频繁查询」桌面索引场景的 PRAGMA。
 * 与 openDatabase 分离，便于测试直接传入 :memory: 连接。
 */
export function createSchema(db: AppDatabase): void {
  db.pragma('journal_mode = WAL') // 读写并发：索引写入不阻塞搜索读取
  db.pragma('synchronous = NORMAL') // WAL 下兼顾安全与吞吐
  db.exec(SCHEMA_SQL)
}

/**
 * 打开（或创建）数据库文件并确保 schema 就绪。
 * @param filePath 数据库文件绝对路径；传入 ':memory:' 则使用内存库（测试用）。
 */
export function openDatabase(filePath: string): AppDatabase {
  const db = new Database(filePath)
  createSchema(db)
  return db
}

// 写入参数：FileRecord 去掉自增 id。
export type FileInput = Omit<FileRecord, 'id'>

/**
 * 返回绑定到该连接的 upsert 函数（内部复用 prepared statement）。
 * 按 path 唯一键插入或更新，供 indexer 批量与 watcher 单条复用。
 */
export function makeUpsert(db: AppDatabase): (file: FileInput) => void {
  const stmt = db.prepare(
    `INSERT INTO files (path, name, ext, size, mtime, is_dir)
     VALUES (@path, @name, @ext, @size, @mtime, @is_dir)
     ON CONFLICT(path) DO UPDATE SET
       name = @name, ext = @ext, size = @size, mtime = @mtime, is_dir = @is_dir`,
  )
  return (file: FileInput): void => {
    stmt.run({
      path: file.path,
      name: file.name,
      ext: file.ext,
      size: file.size,
      mtime: file.mtime,
      is_dir: file.isDir ? 1 : 0,
    })
  }
}

/** 删除单条路径记录。 */
export function deleteByPath(db: AppDatabase, filePath: string): void {
  db.prepare('DELETE FROM files WHERE path = ?').run(filePath)
}

/** 删除某目录及其所有子孙记录（目录被移除时级联清理）。 */
export function deleteByPathPrefix(db: AppDatabase, dirPath: string): void {
  db.prepare('DELETE FROM files WHERE path = ? OR path LIKE ? ESCAPE ?').run(
    dirPath,
    `${dirPath.replace(/([%_\\])/g, '\\$1')}/%`,
    '\\',
  )
}

/** 当前已索引文件总数。 */
export function countFiles(db: AppDatabase): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM files').get() as { n: number }).n
}

/** 清空索引（重新全量扫描前调用）。 */
export function clearAll(db: AppDatabase): void {
  db.exec('DELETE FROM files')
}
