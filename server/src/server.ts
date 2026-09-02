import { app } from './app';
import { config } from './config/environment';
import { initDatabaseTables } from './database/connection';
import { seedDatabase } from './database/seed';

async function bootstrap() {
  try {
    initDatabaseTables();
    await seedDatabase();

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 39POS Enterprise Backend running at http://0.0.0.0:${config.port}`);
      console.log(`📊 Health Endpoint: http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('Fatal initialization error:', err);
    process.exit(1);
  }
}

bootstrap();
