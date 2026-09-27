import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Production seed — FAQAT boshlang'ich admin foydalanuvchi yaratiladi.
 *
 * Hech qanday demo/mock ma'lumot (kategoriya, mahsulot, banner, promokod,
 * related rules, store settings) seed qilinmaydi — har bir sotuvchi o'z
 * katalogini admin panelidan o'zi yaratadi.
 */
// Production'da default parol bilan seed QILINMAYDI — ADMIN_SEED_PASSWORD majburiy.
if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SEED_PASSWORD) {
  throw new Error('ADMIN_SEED_PASSWORD is required in production (refusing to seed a default password)');
}

async function main(): Promise<void> {
  const adminEmail = (process.env.ADMIN_SEED_EMAIL ?? 'admin@example.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? 'ChangeMe123!';
  const adminFullName = process.env.ADMIN_SEED_FULLNAME ?? 'Super Admin';

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  // update bilan parolni ham yangilaymiz — aks holda admin allaqachon mavjud
  // bo'lsa (qayta seed), ADMIN_SEED_PASSWORD o'zgargani kuchga kirmaydi.
  await prisma.admin.upsert({
    where: { email: adminEmail },
    update: { passwordHash, fullName: adminFullName },
    create: {
      email: adminEmail,
      passwordHash,
      fullName: adminFullName,
      role: AdminRole.SUPERADMIN,
    },
  });
  console.log(`✓ Admin upserted: ${adminEmail}`);

  console.log('\n✅ Seed completed (admin only — no mock data).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
