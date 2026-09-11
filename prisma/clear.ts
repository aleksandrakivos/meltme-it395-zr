import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROTECTED_TABLES = new Set(["users", "_prisma_migrations"]);

const SEED_ADMIN = {
  email: "admin@meltme.local",
  name: "Ana Administrator",
  password: "Lozinka!123",
} as const;

function quoteIdent(name: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Unexpected table name: ${name}`);
  }
  return `"${name}"`;
}

async function truncateBusinessTables() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `;

  const toTruncate = tables
    .map((row) => row.tablename)
    .filter((name) => !PROTECTED_TABLES.has(name));

  if (toTruncate.length === 0) {
    return;
  }

  const list = toTruncate.map(quoteIdent).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`,
  );
}

async function ensureAdminExists() {
  const adminCount = await prisma.user.count({
    where: { role: Role.ADMIN },
  });
  if (adminCount > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash(SEED_ADMIN.password, 10);
  await prisma.user.create({
    data: {
      email: SEED_ADMIN.email,
      name: SEED_ADMIN.name,
      passwordHash,
      role: Role.ADMIN,
      active: true,
    },
  });
  console.log(
    `Nema admin naloga — kreiran seed nalog ${SEED_ADMIN.email}`,
  );
}

async function main() {
  await truncateBusinessTables();
  await prisma.user.deleteMany({
    where: { role: { not: Role.ADMIN } },
  });
  await ensureAdminExists();

  const admins = await prisma.user.findMany({
    where: { role: Role.ADMIN },
    select: { email: true },
    orderBy: { email: "asc" },
  });
  console.log("Baza očišćena. Zadržani admin nalozi:");
  for (const admin of admins) {
    console.log(`  - ${admin.email}`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
