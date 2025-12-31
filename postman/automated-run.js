import newman from 'newman';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COLLECTION_PATH = path.join(__dirname, 'pluto-hub.postman_collection.json');
const ENVIRONMENT_PATH = path.join(__dirname, 'Production.postman_environment.json');

console.log('🚀 Starting Pluto Hub API Automation...');

newman.run({
    collection: COLLECTION_PATH,
    environment: ENVIRONMENT_PATH,
    reporters: 'cli',
    folder: ['Health', 'Admin - Dev'], // Start with setup steps that don't need auth
}, function (err, summary) {
    if (err) {
        console.error('❌ Newman run failed:', err);
        process.exit(1);
    }

    if (summary.run.failures.length > 0) {
        console.error(`❌ Automation finished with ${summary.run.failures.length} failures.`);
        process.exit(1);
    }

    console.log('✅ Setup Journeys (Health & Admin) completed successfully!');

    // Note: Journey 2, 3 and Player parts of 4 require a valid firebaseToken.
    console.log('\nℹ️  To run the full Player Journey, please set a valid "firebaseToken" in your Postman Environment.');
});
