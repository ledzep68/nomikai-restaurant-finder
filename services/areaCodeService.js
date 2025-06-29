// エリアコード検索サービス
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AreaCodeService {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'database', 'nomikai.db');
    this.db = null;
  }

  // データベース接続
  async connect() {
    if (!this.db) {
      this.db = new sqlite3.Database(this.dbPath);
    }
  }

  // 地名からエリアコードを検索
  async getAreaCode(locationName) {
    await this.connect();
    
    try {
      // 1. 直接のエリア名検索
      const directMatch = await this.queryAreaCode(
        `SELECT area_code, area_name, area_type 
         FROM hotpepper_area_codes 
         WHERE area_name LIKE ? 
         ORDER BY area_type DESC, LENGTH(area_name) ASC 
         LIMIT 1`,
        [`%${locationName}%`]
      );
      
      if (directMatch) {
        console.log(`Direct match: ${locationName} -> ${directMatch.area_code} (${directMatch.area_name})`);
        return {
          area_code: directMatch.area_code,
          area_name: directMatch.area_name,
          match_type: 'direct'
        };
      }
      
      // 2. エイリアス検索
      const aliasMatch = await this.queryAreaCode(
        `SELECT a.area_code, h.area_name, h.area_type 
         FROM area_name_aliases a 
         JOIN hotpepper_area_codes h ON a.area_code = h.area_code 
         WHERE a.alias_name LIKE ? 
         ORDER BY h.area_type DESC, LENGTH(a.alias_name) ASC 
         LIMIT 1`,
        [`%${locationName}%`]
      );
      
      if (aliasMatch) {
        console.log(`Alias match: ${locationName} -> ${aliasMatch.area_code} (${aliasMatch.area_name})`);
        return {
          area_code: aliasMatch.area_code,
          area_name: aliasMatch.area_name,
          match_type: 'alias'
        };
      }
      
      // 3. 部分一致検索（より柔軟）
      const partialMatch = await this.queryAreaCode(
        `SELECT area_code, area_name, area_type 
         FROM hotpepper_area_codes 
         WHERE area_name LIKE ? OR district LIKE ? OR city LIKE ?
         ORDER BY area_type DESC, LENGTH(area_name) ASC 
         LIMIT 1`,
        [`%${locationName}%`, `%${locationName}%`, `%${locationName}%`]
      );
      
      if (partialMatch) {
        console.log(`Partial match: ${locationName} -> ${partialMatch.area_code} (${partialMatch.area_name})`);
        return {
          area_code: partialMatch.area_code,
          area_name: partialMatch.area_name,
          match_type: 'partial'
        };
      }
      
      // 4. デフォルト（東京全域）
      console.log(`No match for "${locationName}", using default Tokyo area`);
      return {
        area_code: 'Z011',
        area_name: '東京',
        match_type: 'default'
      };
      
    } catch (error) {
      console.error('Area code search error:', error);
      return {
        area_code: 'Z011',
        area_name: '東京',
        match_type: 'error'
      };
    }
  }

  // SQLクエリヘルパー
  queryAreaCode(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // 利用可能なエリア一覧取得
  async getAvailableAreas() {
    await this.connect();
    
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT area_code, area_name, area_type, prefecture 
         FROM hotpepper_area_codes 
         WHERE area_type = 'middle_area' 
         ORDER BY prefecture, area_name`,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // データベース接続終了
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = AreaCodeService;