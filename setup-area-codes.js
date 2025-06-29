// エリアコードテーブル作成スクリプト
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

async function setupAreaCodes() {
  const dbPath = path.join(__dirname, 'database', 'nomikai.db');
  const sqlPath = path.join(__dirname, 'database', 'create-area-codes.sql');
  
  console.log('🗄️ エリアコードテーブルセットアップ開始...');
  
  try {
    // SQLファイル読み込み
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // データベース接続
    const db = new sqlite3.Database(dbPath);
    
    // SQLを分割して実行
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await new Promise((resolve, reject) => {
          db.run(statement, (err) => {
            if (err) {
              console.error('SQL Error:', err.message);
              console.error('Statement:', statement.substring(0, 100) + '...');
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    }
    
    // 作成確認
    await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM hotpepper_area_codes", (err, row) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✅ エリアコードテーブル作成完了: ${row.count}件`);
          resolve();
        }
      });
    });
    
    await new Promise((resolve, reject) => {
      db.get("SELECT COUNT(*) as count FROM area_name_aliases", (err, row) => {
        if (err) {
          reject(err);
        } else {
          console.log(`✅ エイリアステーブル作成完了: ${row.count}件`);
          resolve();
        }
      });
    });
    
    db.close();
    console.log('🎉 セットアップ完了！');
    
  } catch (error) {
    console.error('❌ セットアップエラー:', error);
    process.exit(1);
  }
}

setupAreaCodes();