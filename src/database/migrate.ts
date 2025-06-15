import fs from 'fs';
import path from 'path';
import { DatabaseConnection } from './connection';

export class DatabaseMigrator {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  public async runMigrations(): Promise<void> {
    try {
      console.log('Starting database migrations...');
      
      const migrationsDir = path.join(__dirname, 'migrations');
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();

      for (const file of migrationFiles) {
        console.log(`Running migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');
        
        await this.db.query(sql);
        console.log(`Migration completed: ${file}`);
      }

      console.log('All migrations completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    return await this.db.testConnection();
  }
}

if (require.main === module) {
  const migrator = new DatabaseMigrator();
  
  migrator.runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}