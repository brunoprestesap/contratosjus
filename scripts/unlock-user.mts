/**
 * Desbloqueia/reativa usuário para acesso em produção.
 *
 * Uso:
 *   npx tsx scripts/unlock-user.mts --email usuario@org.gov.br --yes
 *   npx tsx scripts/unlock-user.mts --id <userId> --yes
 *
 * Flags:
 *   --email <email>   E-mail do usuário
 *   --id <id>         ID do usuário
 *   --yes             Confirma execução de escrita (obrigatório sem --dry-run)
 *   --dry-run         Apenas exibe estado atual e o que mudaria
 */
import { existsSync } from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";

if (existsSync(path.resolve(process.cwd(), ".env.local"))) {
  dotenv.config({ path: ".env.local" });
}
dotenv.config();

const mod = await import("../src/generated/prisma/client");
const PrismaClient = mod.PrismaClient;

type Args = {
  email?: string;
  id?: string;
  dryRun: boolean;
  yes: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--email") {
      args.email = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--id") {
      args.id = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--yes") {
      args.yes = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelpAndExit(0);
    }
    console.error(`Argumento desconhecido: ${token}`);
    printHelpAndExit(1);
  }
  return args;
}

function printHelpAndExit(code: number): never {
  console.log(`
Uso:
  npx tsx scripts/unlock-user.mts --email <email> [--dry-run] [--yes]
  npx tsx scripts/unlock-user.mts --id <id> [--dry-run] [--yes]

Exemplos:
  npx tsx scripts/unlock-user.mts --email fiscal@jfap.jus.br --dry-run
  npx tsx scripts/unlock-user.mts --email fiscal@jfap.jus.br --yes
`);
  process.exit(code);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não definido.");
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if ((!args.email && !args.id) || (args.email && args.id)) {
    console.error("Informe exatamente um identificador: --email OU --id.");
    printHelpAndExit(1);
  }

  if (!args.dryRun && !args.yes) {
    console.error("Execução bloqueada: use --yes para confirmar a alteração.");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const where = args.email ? { email: args.email } : { id: args.id! };
    const user = await prisma.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    if (!user) {
      console.error("Usuário não encontrado.");
      process.exit(1);
    }

    console.log("[antes]", {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      failedAttempts: user.failedAttempts,
      lockedUntil: user.lockedUntil?.toISOString() ?? null,
    });

    const needsUpdate =
      user.status !== "ACTIVE" || user.failedAttempts !== 0 || user.lockedUntil !== null;

    if (!needsUpdate) {
      console.log("Nenhuma alteração necessária: usuário já está ativo e desbloqueado.");
      return;
    }

    if (args.dryRun) {
      console.log("[dry-run] Atualizaria para:", {
        status: "ACTIVE",
        failedAttempts: 0,
        lockedUntil: null,
      });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "ACTIVE",
        failedAttempts: 0,
        lockedUntil: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        failedAttempts: true,
        lockedUntil: true,
      },
    });

    console.log("[depois]", {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      status: updated.status,
      failedAttempts: updated.failedAttempts,
      lockedUntil: updated.lockedUntil,
    });
    console.log("OK: usuário desbloqueado/reativado com sucesso.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Falha ao executar desbloqueio:", error);
  process.exit(1);
});
