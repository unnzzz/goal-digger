const { prisma } = require('./src/lib/db');
const bcrypt = require('bcryptjs');

async function testSignup() {
  try {
    console.log('Testing database connection...');
    const users = await prisma.user.findMany();
    console.log('Database connected, users count:', users.length);
    
    console.log('Testing bcrypt...');
    const passwordHash = await bcrypt.hash('test123', 10);
    console.log('Bcrypt working, hash length:', passwordHash.length);
    
    console.log('Testing user creation...');
    const user = await prisma.user.create({
      data: {
        email: 'test@test.com',
        passwordHash,
        name: 'Test User',
        coins: 0,
        avatarKey: 'monkey',
      },
    });
    console.log('User created successfully:', user.id);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testSignup();




