import { SQLiteConnection } from './sqlite-connection';
import fs from 'fs';
import path from 'path';

export class SQLiteMigration {
  private db: SQLiteConnection;

  constructor() {
    this.db = SQLiteConnection.getInstance();
  }

  public async runMigrations(): Promise<void> {
    try {
      console.log('Starting SQLite migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Run SQLite migration
      const migrationDir = process.env.MIGRATION_PATH || path.join(__dirname, 'migrations');
      const migrationPath = path.join(migrationDir, '001_create_tables_sqlite.sql');
      
      if (fs.existsSync(migrationPath)) {
        const migrationName = '001_create_tables_sqlite';
        
        // Check if migration already ran
        const existingMigration = await this.db.get(
          'SELECT id FROM migrations WHERE name = ?',
          [migrationName]
        );
        
        if (!existingMigration) {
          console.log(`Running migration: ${migrationName}`);
          
          const sql = fs.readFileSync(migrationPath, 'utf8');
          
          // Split by semicolon and execute each statement
          const statements = sql.split(';').filter(stmt => stmt.trim());
          
          for (const statement of statements) {
            if (statement.trim()) {
              await this.db.run(statement.trim());
            }
          }
          
          // Record migration as completed
          await this.db.run(
            'INSERT INTO migrations (name, executed_at) VALUES (?, ?)',
            [migrationName, new Date().toISOString()]
          );
          
          console.log(`Migration ${migrationName} completed successfully`);
        } else {
          console.log(`Migration ${migrationName} already executed`);
        }
      }
      
      // Insert sample data if needed
      await this.insertSampleData();
      
      console.log('All migrations completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  private async createMigrationsTable(): Promise<void> {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async insertSampleData(): Promise<void> {
    try {
      // Check if sample data already exists
      const existingRestaurants = await this.db.query('SELECT COUNT(*) as count FROM restaurants');
      const count = (existingRestaurants as any)[0]?.count || 0;
      
      if (count === 0) {
        console.log('Inserting sample restaurant data...');
        
        const sampleRestaurants = [
          {
            name: '渋谷タワレコ前焼き鳥',
            genre: 'yakitori',
            location: '渋谷',
            address: '東京都渋谷区道玄坂2-6-2',
            phone: '03-1234-5678',
            price_min: 2000,
            price_max: 4000,
            lat: 35.659,
            lng: 139.700
          },
          {
            name: '新宿韓国料理チング',
            genre: 'korean',
            location: '新宿',
            address: '東京都新宿区歌舞伎町1-1-1',
            phone: '03-2345-6789',
            price_min: 3000,
            price_max: 5000,
            lat: 35.694,
            lng: 139.703
          },
          {
            name: '六本木タイ料理レストラン',
            genre: 'thai',
            location: '六本木',
            address: '東京都港区六本木6-1-20',
            phone: '03-3456-7890',
            price_min: 2500,
            price_max: 4500,
            lat: 35.663,
            lng: 139.732
          },
          {
            name: '表参道スイーツカフェ',
            genre: 'sweets',
            location: '表参道',
            address: '東京都渋谷区神宮前4-12-10',
            phone: '03-4567-8901',
            price_min: 1000,
            price_max: 2500,
            lat: 35.669,
            lng: 139.703
          },
          {
            name: '銀座高級寿司',
            genre: 'sushi',
            location: '銀座',
            address: '東京都中央区銀座8-2-1',
            phone: '03-5678-9012',
            price_min: 8000,
            price_max: 15000,
            lat: 35.671,
            lng: 139.765
          }
        ];
        
        for (const restaurant of sampleRestaurants) {
          await this.db.run(`
            INSERT INTO restaurants (
              name, genre, location, address, phone, 
              price_range_min, price_range_max, latitude, longitude
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            restaurant.name,
            restaurant.genre,
            restaurant.location,
            restaurant.address,
            restaurant.phone,
            restaurant.price_min,
            restaurant.price_max,
            restaurant.lat,
            restaurant.lng
          ]);
        }
        
        console.log(`Inserted ${sampleRestaurants.length} sample restaurants`);
      }
    } catch (error) {
      console.error('Error inserting sample data:', error);
    }
  }
}

// Run migrations if called directly
if (require.main === module) {
  const migration = new SQLiteMigration();
  migration.runMigrations()
    .then(() => {
      console.log('Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}