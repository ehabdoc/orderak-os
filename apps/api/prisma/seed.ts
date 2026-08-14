import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Users
  const adminPin = await bcrypt.hash('1234', 10);
  const cashierPin = await bcrypt.hash('0000', 10);

  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'المدير', pin: adminPin, role: 'ADMIN' },
  });

  await prisma.user.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'الكاشير', pin: cashierPin, role: 'CASHIER' },
  });

  // Categories (from mockup 04)
  const categories = [
    { name: 'مشاوي', icon: '🥩', sortOrder: 1 },
    { name: 'وجبات', icon: '🍱', sortOrder: 2 },
    { name: 'مشروبات', icon: '🥤', sortOrder: 3 },
    { name: 'حلويات', icon: '🍰', sortOrder: 4 },
    { name: 'إضافات', icon: '➕', sortOrder: 5 },
    { name: 'فطور', icon: '🍳', sortOrder: 6 },
  ];

  const catMap = new Map<string, number>();
  for (const c of categories) {
    const existing = await prisma.category.findFirst({ where: { name: c.name } });
    const cat = existing ?? (await prisma.category.create({ data: c }));
    catMap.set(c.name, cat.id);
  }

  // Menu items (from mockup 07)
  const items = [
    { category: 'مشاوي', name: 'شاورما لحم', description: 'خبز طازج وسلطة', price: 12500 },
    { category: 'مشاوي', name: 'كبدة إسكندراني', description: 'حارة أو عادية', price: 15000 },
    { category: 'مشاوي', name: 'كباب لحم', description: 'مع أرز أو خبز', price: 22000 },
    { category: 'مشاوي', name: 'دجاج مشوي نص', description: 'مشوي على الفحم', price: 18000 },
    { category: 'فطور', name: 'فول بالزيت', description: 'إفطار سوداني', price: 6000 },
    { category: 'مشروبات', name: 'عصير مانجو', description: 'طازج يومياً', price: 8000 },
  ];

  // Idempotent seed: upsert by name (avoid FK conflicts with OrderItems)
  for (const it of items) {
    const categoryId = catMap.get(it.category);
    if (!categoryId) continue;
    const existing = await prisma.menuItem.findFirst({ where: { name: it.name } });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { description: it.description, price: it.price, active: true },
      });
    } else {
      await prisma.menuItem.create({
        data: {
          categoryId,
          name: it.name,
          description: it.description,
          price: it.price,
          active: true,
        },
      });
    }
  }

  console.log('Seed complete:');
  console.log('  - 2 users (Admin PIN: 1234, Cashier PIN: 0000)');
  console.log(`  - ${categories.length} categories`);
  console.log(`  - ${items.length} menu items`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
