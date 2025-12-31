import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('🔍 Testing Supabase database connection...\n');

        // Test: Basic connection and table queries
        await prisma.$connect();
        console.log('✅ Database connected successfully!');

        // Test: Count records in each table
        console.log('\n📋 Table record counts:');
        const users = await prisma.user.count();
        const games = await prisma.game.count();
        const contracts = await prisma.contract.count();
        const developers = await prisma.developerApplication.count();
        const sessions = await prisma.gameSession.count();
        const lobbies = await prisma.lobby.count();
        const ledger = await prisma.ledgerEntry.count();

        console.log(`   - Users: ${users}`);
        console.log(`   - Games: ${games}`);
        console.log(`   - Contracts: ${contracts}`);
        console.log(`   - Developer Applications: ${developers}`);
        console.log(`   - Game Sessions: ${sessions}`);
        console.log(`   - Lobbies: ${lobbies}`);
        console.log(`   - Ledger Entries: ${ledger}`);

        console.log('\n✨ All tests passed! Your Supabase database is working perfectly.');
        console.log('🎯 Database is ready for use!\n');

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
