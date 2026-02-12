import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });

const run = async (): Promise<void> => {
  // Intentionally minimal in build phase. Add deterministic seed sets when needed.
  console.log('No seed data configured.');
};

if (require.main === module) {
  run().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
}

export { run as runSeed };
