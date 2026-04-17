/**
 * Script de limpeza de PDFs órfãos no storage.
 *
 * Lista arquivos *.pdf no DOCUMENTS_STORAGE_PATH que não são referenciados
 * por nenhum GeneratedDocument (pdfPath ou signedPdfPath). Por padrão roda em
 * dry-run (apenas lista). Use `--apply` para remover.
 *
 * Uso:
 *   npx tsx scripts/cleanup-orphan-pdfs.ts
 *   npx tsx scripts/cleanup-orphan-pdfs.ts --apply
 */
import "dotenv/config";
import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/prisma";

function storageRoot(): string {
  if (process.env.DOCUMENTS_STORAGE_PATH) {
    return process.env.DOCUMENTS_STORAGE_PATH;
  }
  return path.join(process.cwd(), ".data", "documents");
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    const s = await stat(full).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) {
      await walk(full, out);
    } else if (s.isFile() && name.toLowerCase().endsWith(".pdf")) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const root = storageRoot();

  console.log(`Storage root: ${root}`);
  console.log(`Modo: ${apply ? "APPLY (deletando órfãos)" : "DRY-RUN"}`);

  const allFiles = await walk(root);
  console.log(`\nArquivos PDF encontrados no storage: ${allFiles.length}`);

  // Coleta os paths referenciados no banco. Note que pdfPath é RELATIVO
  // (ex: "contract-id/nome-v1.pdf"), e absolutos diferem pelo prefixo.
  const referenced = await prisma.generatedDocument.findMany({
    select: { pdfPath: true, signedPdfPath: true },
  });

  const referencedAbs = new Set<string>();
  for (const doc of referenced) {
    if (doc.pdfPath) {
      referencedAbs.add(path.resolve(root, doc.pdfPath));
    }
    if (doc.signedPdfPath) {
      referencedAbs.add(path.resolve(root, doc.signedPdfPath));
    }
  }
  console.log(`Referências no banco: ${referencedAbs.size}`);

  const orphans: string[] = [];
  for (const file of allFiles) {
    if (!referencedAbs.has(path.resolve(file))) {
      orphans.push(file);
    }
  }

  if (orphans.length === 0) {
    console.log("\n✓ Nenhum órfão encontrado.");
    return;
  }

  console.log(`\n⚠ Órfãos encontrados: ${orphans.length}`);
  for (const f of orphans) {
    const size = (await stat(f)).size;
    console.log(`  ${f}  (${(size / 1024).toFixed(1)} KB)`);
  }

  if (!apply) {
    console.log(
      "\nDry-run: nada foi deletado. Rode com --apply para remover."
    );
    return;
  }

  let deleted = 0;
  for (const f of orphans) {
    try {
      await unlink(f);
      deleted++;
    } catch (e) {
      console.error(`Falhou: ${f}`, e);
    }
  }
  console.log(`\n✓ ${deleted}/${orphans.length} arquivos deletados.`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
