import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../lib/utils/password';

const prisma = new PrismaClient();

const BASE_PERMISSIONS = [
  // seller
  'store.manage', 'product.manage', 'order.manage.own', 'inventory.manage', 'coupon.manage.own',
  // admin
  'user.manage', 'seller.approve', 'seller.suspend', 'product.approve', 'category.manage',
  'order.manage.all', 'commission.manage', 'refund.manage', 'review.moderate', 'audit.view',
];

async function main() {
  // ── Roles + permissions ────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });
  const sellerRole = await prisma.role.upsert({
    where: { name: 'seller' },
    update: {},
    create: { name: 'seller' },
  });
  await prisma.role.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  const permissions = await Promise.all(
    BASE_PERMISSIONS.map((name) =>
      prisma.permission.upsert({ where: { name }, update: {}, create: { name } })
    )
  );

  // Admin gets every permission; seller gets the "own"-scoped subset.
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: p.id },
      })
    )
  );
  const sellerPermissionNames = ['store.manage', 'product.manage', 'order.manage.own', 'inventory.manage', 'coupon.manage.own'];
  await Promise.all(
    permissions
      .filter((p) => sellerPermissionNames.includes(p.name))
      .map((p) =>
        prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: sellerRole.id, permissionId: p.id } },
          update: {},
          create: { roleId: sellerRole.id, permissionId: p.id },
        })
      )
  );

  // ── Admin bootstrap account ─────────────────────────────
  // Credentials come ONLY from environment variables — never hard-coded in
  // source. Set ADMIN_BOOTSTRAP_* in your deploy environment's secret
  // manager before running `npm run prisma:seed`, then rotate the password
  // immediately after first login in production.
  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  const adminUsername = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const adminPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD;

  if (!adminEmail || !adminUsername || !adminPassword) {
    throw new Error(
      'ADMIN_BOOTSTRAP_EMAIL, ADMIN_BOOTSTRAP_USERNAME, and ADMIN_BOOTSTRAP_PASSWORD must be set to seed the admin account.'
    );
  }

  const passwordHash = await hashPassword(adminPassword);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminUsername,
      passwordHash,
      status: 'ACTIVE',
      emailVerified: new Date(),
      roleId: adminRole.id,
    },
  });

  // ── Default global commission ───────────────────────────
  const defaultCommission = Number(process.env.DEFAULT_COMMISSION_PERCENTAGE ?? 10);
  const existingGlobal = await prisma.commission.findFirst({ where: { scope: 'GLOBAL' } });
  if (!existingGlobal) {
    await prisma.commission.create({
      data: { scope: 'GLOBAL', percentage: defaultCommission },
    });
  }

  console.log('Seed complete: roles, permissions, admin account, and default commission created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
