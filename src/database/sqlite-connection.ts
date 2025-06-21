import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '@/utils/config';

export class SQLiteConnection {
  private static instance: SQLiteConnection;
  private db: sqlite3.Database | null = null;

  private constructor() {
    this.initializeDatabase();
  }

  public static getInstance(): SQLiteConnection {
    if (!SQLiteConnection.instance) {
      SQLiteConnection.instance = new SQLiteConnection();
    }
    return SQLiteConnection.instance;
  }

  private initializeDatabase(): void {
    const dbPath = process.env.DB_PATH || './database/nomikai.db';
    const dbDir = path.dirname(dbPath);
    
    // Create database directory if it doesn't exist
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening SQLite database:', err);
      } else {
        console.log('Connected to SQLite database successfully');
        this.enableForeignKeys();
      }
    });
  }

  private enableForeignKeys(): void {
    if (this.db) {
      this.db.run('PRAGMA foreign_keys = ON');
    }
  }

  public async query(sql: string, params: unknown[] = []): Promise<unknown[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      if (sql.trim().toLowerCase().startsWith('select')) {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      } else {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve([{ changes: this.changes, lastID: this.lastID }]);
          }
        });
      }
    });
  }

  public async run(sql: string, params: unknown[] = []): Promise<{ changes: number; lastID: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes, lastID: this.lastID });
        }
      });
    });
  }

  public async get(sql: string, params: unknown[] = []): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  public async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT 1 as test');
      return true;
    } catch (error) {
      console.error('SQLite connection test failed:', error);
      return false;
    }
  }
}