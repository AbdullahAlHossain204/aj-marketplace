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

  // ── Demo catalog (local dev / Phase 3 verification only) ────
  // Gated behind SEED_DEMO_CATALOG so a real deploy's seed run doesn't
  // create fake storefront data — set it in your local .env, not in staging/prod.
  if (process.env.SEED_DEMO_CATALOG === 'true') {
    await seedDemoCatalog(sellerRole.id);
  }

  console.log('Seed complete: roles, permissions, admin account, and default commission created.');
}

async function seedDemoCatalog(sellerRoleId: string) {
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  });
  const phones = await prisma.category.upsert({
    where: { slug: 'phones' },
    update: {},
    create: { name: 'Phones', slug: 'phones', parentId: electronics.id },
  });
  await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: { name: 'Fashion', slug: 'fashion' },
  });

  const brand = await prisma.brand.upsert({
    where: { slug: 'demo-brand' },
    update: {},
    create: { name: 'Demo Brand', slug: 'demo-brand' },
  });

  const store = await prisma.store.upsert({
    where: { slug: 'demo-store' },
    update: {},
    create: { name: 'Demo Store', slug: 'demo-store', status: 'ACTIVE' },
  });

  const sellerPasswordHash = await hashPassword('DemoSeller123');
  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@ajmarketplace.example' },
    update: {},
    create: {
      email: 'seller@ajmarketplace.example',
      name: 'Demo Seller',
      passwordHash: sellerPasswordHash,
      status: 'ACTIVE',
      emailVerified: new Date(),
      roleId: sellerRoleId,
    },
  });
  await prisma.seller.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: { userId: sellerUser.id, storeId: store.id },
  });

  const demoProducts = [
    {
      slug: 'aurora-wireless-headphones',
      name: 'Aurora Wireless Headphones',
      basePrice: 4500,
      discountPrice: 3999,
      variants: [{ sku: 'AUR-BLK', attributes: { color: 'Black' }, price: 3999, stock: 25 }],
    },
    {
      slug: 'pulse-smartphone-x1',
      name: 'Pulse Smartphone X1',
      basePrice: 32000,
      discountPrice: null,
      variants: [
        { sku: 'PLS-64', attributes: { storage: '64GB' }, price: 32000, stock: 10 },
        { sku: 'PLS-128', attributes: { storage: '128GB' }, price: 36000, stock: 8 },
      ],
    },
  ];

  for (const p of demoProducts) {
    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        storeId: store.id,
        categoryId: phones.id,
        brandId: brand.id,
        name: p.name,
        slug: p.slug,
        description: `${p.name} — demo product seeded for local Phase 3 testing.`,
        shortDescription: p.name,
        sku: `${p.slug}-base`,
        basePrice: p.basePrice,
        discountPrice: p.discountPrice ?? undefined,
        status: 'ACTIVE',
      },
    });

    for (const v of p.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: v.sku },
        update: {},
        create: {
          productId: product.id,
          sku: v.sku,
          price: v.price,
          attributes: v.attributes,
        },
      });
      await prisma.inventory.upsert({
        where: { variantId: variant.id },
        update: {},
        create: { variantId: variant.id, quantity: v.stock, reserved: 0 },
      });
    }
  }

  console.log('Demo catalog seeded (category/brand/store/seller/products).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
