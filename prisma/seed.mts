import dotenv from "dotenv";
// Carrega .env.local (dev) e depois .env como fallback
dotenv.config({ path: ".env.local" });
dotenv.config();
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";

const mod = await import("../src/generated/prisma/client.ts");
const PrismaClient = mod.PrismaClient;
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) {
    throw new Error(
      "SEED_PASSWORD não definida. Defina a variável de ambiente antes de rodar o seed."
    );
  }
  const passwordHash = hashSync(seedPassword, 12);

  await prisma.user.upsert({
    where: { email: "fiscal@jfap.jus.br" },
    update: { passwordHash },
    create: {
      name: "Fiscal NUTEC",
      email: "fiscal@jfap.jus.br",
      passwordHash,
      role: "FISCAL",
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { email: "diretor@jfap.jus.br" },
    update: { passwordHash },
    create: {
      name: "Diretor NUTEC",
      email: "diretor@jfap.jus.br",
      passwordHash,
      role: "DIRETOR",
      status: "ACTIVE",
    },
  });

  console.log("Seed concluído: 2 usuários criados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
