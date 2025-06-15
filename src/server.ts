import { App } from './app';
import { config } from '@/utils/config';
import { DatabaseConnection } from '@/database/connection';
import { DatabaseMigrator } from '@/database/migrate';

async function startServer(): Promise<void> {
  try {
    console.log('🔧 Starting server initialization...');

    const db = DatabaseConnection.getInstance();
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }
    console.log('✅ Database connection established');

    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();
    console.log('✅ Database migrations completed');

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