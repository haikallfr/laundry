import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  
  await prisma.user.upsert({
    where: { email: 'admin@laundry.com' },
    update: {},
    create: {
      name: 'Admin Laundry',
      email: 'admin@laundry.com',
      passwordHash: hash,
      role: 'OWNER',
      status: 'ACTIVE'
    }
  })

  await prisma.setting.upsert({
    where: { key: 'store' },
    update: {},
    create: {
      key: 'store',
      value: {
        name: 'Laundry POS Lokal',
        address: 'Jl. Localhost No. 1',
        phone: '081234567890'
      }
    }
  })
  console.log('Seed berhasil! Login dengan email: admin@laundry.com, password: admin123')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
