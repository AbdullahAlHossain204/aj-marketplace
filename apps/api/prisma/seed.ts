import { PrismaClient, Role, VendorStatus, ProductStatus } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding AJ Market database...");

  // --- Admin user ---
  const adminPassword = await argon2.hash("Admin@12345");
  const admin = await prisma.user.upsert({
    where: { email: "admin@ajmarket.com" },
    update: {},
    create: {
      email: "admin@ajmarket.com",
      password: adminPassword,
      name: "AJ Market Admin",
      role: Role.ADMIN,
    },
  });

  // --- Customer user ---
  const customerPassword = await argon2.hash("Customer@12345");
  const customer = await prisma.user.upsert({
    where: { email: "customer@ajmarket.com" },
    update: {},
    create: {
      email: "customer@ajmarket.com",
      password: customerPassword,
      name: "Test Customer",
      role: Role.CUSTOMER,
      cart: { create: {} },
      wishlist: { create: {} },
    },
  });

  // --- Vendor user + profile + store ---
  const vendorPassword = await argon2.hash("Vendor@12345");
  const vendorUser = await prisma.user.upsert({
    where: { email: "vendor@ajmarket.com" },
    update: {},
    create: {
      email: "vendor@ajmarket.com",
      password: vendorPassword,
      name: "Test Vendor",
      role: Role.VENDOR,
    },
  });

  const vendorProfile = await prisma.vendorProfile.upsert({
    where: { userId: vendorUser.id },
    update: {},
    create: {
      userId: vendorUser.id,
      businessName: "AJ Gadgets Co.",
      businessEmail: "contact@ajgadgets.com",
      status: VendorStatus.APPROVED,
      approvedAt: new Date(),
      store: {
        create: {
          name: "AJ Gadgets",
          slug: "aj-gadgets",
          description: "Quality electronics and accessories.",
        },
      },
    },
    include: { store: true },
  });

  const store = vendorProfile.store!;

  // --- Category ---
  const category = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {},
    create: {
      name: "Electronics",
      slug: "electronics",
      description: "Phones, gadgets, and accessories.",
    },
  });

  // --- Product with variant + inventory ---
  const product = await prisma.product.upsert({
    where: { slug: "wireless-earbuds-pro" },
    update: {},
    create: {
      storeId: store.id,
      categoryId: category.id,
      name: "Wireless Earbuds Pro",
      slug: "wireless-earbuds-pro",
      description: "Noise-cancelling wireless earbuds with 30h battery life.",
      basePrice: 250000, // 2500.00 in smallest currency unit
      status: ProductStatus.ACTIVE,
      images: {
        create: [{ url: "https://placehold.co/600x600", altText: "Wireless Earbuds Pro", position: 0 }],
      },
      variants: {
        create: [
          {
            name: "Standard",
            sku: "WEP-STD-001",
            inventory: { create: { quantity: 100, lowStockThreshold: 10 } },
          },
        ],
      },
    },
  });

  console.log("Seed complete:");
  console.log({ admin: admin.email, customer: customer.email, vendor: vendorUser.email, store: store.slug, product: product.slug });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
