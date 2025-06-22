import { App } from './app';
import { config } from '@/utils/config';
import { SQLiteConnection } from '@/database/sqlite-connection';
import { SQLiteMigration } from '@/database/sqlite-migrate';

async function startServer(): Promise<void> {
  try {
    console.log('🔧 Starting server initialization...');

    const db = SQLiteConnection.getInstance();
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to SQLite database');
    }
    console.log('✅ SQLite database connection established');

    const migrator = new SQLiteMigration();
    await migrator.runMigrations();
    console.log('✅ SQLite database migrations completed');

    const app = new App();
    app.listen(config.app.port);

    process.on('SIGTERM', async () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      await db.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Unhandled error during server startup:', error);
    process.exit(1);
  });
}