import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    console.log('Users count:', users.length);
    
    // Seed data if empty (this simulates what readPrismaStore does)
    if (users.length === 0) {
        console.log("Database empty. It might be failing during seeding.");
    }

    // Try a simple write
    const testUser = await prisma.user.create({
        data: {
            id: 'test-user-1',
            name: 'Test',
            email: 'test@example.com',
            passwordHash: 'hash',
            role: 'CASHIER',
        }
    });
    console.log('Created user:', testUser.id);
    
    // Clean it up
    await prisma.user.delete({ where: { id: 'test-user-1' } });
    console.log('Cleaned up test user.');
  } catch (e) {
    console.error('DATABASE ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
