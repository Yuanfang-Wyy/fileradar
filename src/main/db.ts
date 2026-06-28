import Database from 'better-sqlite3'
import type { FileRecord } from '@shared/types'

// 数据库实例类型别名，供其他模块（indexer/searcher）以类型安全方式接收连接。
export type AppDatabase = Database.Database

// Schema：files 主表 + files_fts（FTS5 外部内容索引，对 name/path/pinyin 全文索引）+ 同步触发器。
// pinyin 列存文件名的拼音首字母与全拼，使「yddz」「yidong」能命中「移动底座」。
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS files (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  path   TEXT NOT NULL UNIQUE,
  name   TEXT NOT NULL,
  ext    TEXT NOT NULL DEFAULT '',
  size   INTEGER NOT NULL DEFAULT 0,
  mtime  INTEGER NOT NULL DEFAULT 0,
  is_dir INTEGER NOT NULL DEFAULT 0,
  pinyin TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_files_ext   ON files(ext);
CREATE INDEX IF NOT EXISTS idx_files_mtime ON files(mtime);
CREATE INDEX IF NOT EXISTS idx_files_size  ON files(size);

CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
  name,
  path,
  pinyin,
  content='files',
  content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS files_ai AFTER INSERT ON files BEGIN
  INSERT INTO files_fts(rowid, name, path, pinyin) VALUES (new.id, new.name, new.path, new.pinyin);
END;

CREATE TRIGGER IF NOT EXISTS files_ad AFTER DELETE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, path, pinyin) VALUES('delete', old.id, old.name, old.path, old.pinyin);
END;

CREATE TRIGGER IF NOT EXISTS files_au AFTER UPDATE ON files BEGIN
  INSERT INTO files_fts(files_fts, rowid, name, path, pinyin) VALUES('delete', old.id, old.name, old.path, old.pinyin);
  INSERT INTO files_fts(rowid, name, path, pinyin) VALUES (new.id, new.name, new.path, new.pinyin);
END;
`

/**
 * 在给定连接上创建/迁移 schema 并设置 PRAGMA。
 * 迁移：检测到旧表（无 pinyin 列）则丢弃重建（开发期简单策略，用户重建一次索引）。
 */
export function createSchema(db: AppDatabase): void {
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')

  const columns = db.prepare('PRAGMA table_info(files)').all() as { name: string }[]
  if (columns.length > 0 && !columns.some((c) => c.name === 'pinyin')) {
    db.exec('DROP TABLE IF EXISTS files_fts; DROP TABLE IF EXISTS files;')
  }
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

// 写入参数：FileRecord 去掉自增 id，附带 pinyin（仅入库供拼音匹配，不对外返回）。
export type FileInput = Omit<FileRecord, 'id'> & { pinyin: string }

/**
 * 返回绑定到该连接的 upsert 函数（内部复用 prepared statement）。
 * 按 path 唯一键插入或更新，供 indexer 批量与 watcher 单条复用。
 */
export function makeUpsert(db: AppDatabase): (file: FileInput) => void {
  const stmt = db.prepare(
    `INSERT INTO files (path, name, ext, size, mtime, is_dir, pinyin)
     VALUES (@path, @name, @ext, @size, @mtime, @is_dir, @pinyin)
     ON CONFLICT(path) DO UPDATE SET
       name = @name, ext = @ext, size = @size, mtime = @mtime, is_dir = @is_dir, pinyin = @pinyin`,
  )
  return (file: FileInput): void => {
    stmt.run({
      path: file.path,
      name: file.name,
      ext: file.ext,
      size: file.size,
      mtime: file.mtime,
      is_dir: file.isDir ? 1 : 0,
      pinyin: file.pinyin,
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
