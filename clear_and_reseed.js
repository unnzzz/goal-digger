const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearAndReseed() {
  try {
    console.log('Clearing old data...');
    
    // Delete all user items first (since they reference shop items)
    await prisma.userItem.deleteMany({});
    console.log('User items cleared!');
    
    // Delete all existing shop items
    await prisma.shopItem.deleteMany({});
    console.log('Old shop items cleared!');
    
    console.log('Running new seed...');
    
    // Run the seed
    const { exec } = require('child_process');
    exec('DATABASE_URL=file:./prisma/dev.db npx prisma db seed', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running seed:', error);
        return;
      }
      console.log('Seed output:', stdout);
      if (stderr) console.log('Seed errors:', stderr);
      
      console.log('✅ Database cleared and re-seeded successfully!');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearAndReseed();
