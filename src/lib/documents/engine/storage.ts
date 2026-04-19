import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export class UnsafePathError extends Error {
  constructor(segment: string) {
    super(`Segmento de path não seguro: ${segment}`);
    this.name = "UnsafePathError";
  }
}

function storageRoot(): string {
  if (process.env.DOCUMENTS_STORAGE_PATH) {
    return process.env.DOCUMENTS_STORAGE_PATH;
  }
  // Desenvolvimento local: evita exigir /var/... (EACCES sem permissão de root).
  // Produção/Docker: defina DOCUMENTS_STORAGE_PATH (ex.: /var/jfap-contratos/documents).
  return path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "documents");
}

function resolvedStorageRoot(): string {
  return path.resolve(storageRoot());
}

/**
 * Rejeita segmentos com travessal de path, separadores ou caracteres nulos.
 * Aceita apenas alfanuméricos, ponto, hífen, sublinhado — cobre cuids, ids
 * escaped com replace(/./g, "-") e versões numéricas.
 */
function assertSafeSegment(segment: string): void {
  if (!segment || segment === "." || segment === "..") {
    throw new UnsafePathError(segment);
  }
  if (/[/\\\0]/.test(segment)) {
    throw new UnsafePathError(segment);
  }
  if (/(^|\/)\.\.(\/|$)/.test(segment)) {
    throw new UnsafePathError(segment);
  }
}

/**
 * Valida que o path absoluto resolvido permanece dentro da raiz de storage.
 * Essencial contra `pdfPath` malicioso persistido no banco.
 */
function assertInsideStorage(absolutePath: string): void {
  const root = resolvedStorageRoot() + path.sep;
  const resolved = path.resolve(absolutePath);
  if (resolved !== path.resolve(storageRoot()) && !resolved.startsWith(root)) {
    throw new UnsafePathError(absolutePath);
  }
}

export function sha256(buffer: Uint8Array | Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function resolveDocumentPath(
  contractId: string,
  templateId: string,
  version: number,
): { absolutePath: string; relativePath: string } {
  assertSafeSegment(contractId);
  const sanitizedTemplate = templateId.replace(/\./g, "-");
  assertSafeSegment(sanitizedTemplate);
  if (!Number.isInteger(version) || version < 1) {
    throw new UnsafePathError(`version=${version}`);
  }
  const fileName = `${sanitizedTemplate}-v${version}.pdf`;
  const relativePath = path.join(contractId, fileName);
  const absolutePath = path.join(storageRoot(), relativePath);
  assertInsideStorage(absolutePath);
  return { absolutePath, relativePath };
}

export function resolveSignedPath(
  contractId: string,
  templateId: string,
  version: number,
): { absolutePath: string; relativePath: string } {
  assertSafeSegment(contractId);
  const sanitizedTemplate = templateId.replace(/\./g, "-");
  assertSafeSegment(sanitizedTemplate);
  if (!Number.isInteger(version) || version < 1) {
    throw new UnsafePathError(`version=${version}`);
  }
  const fileName = `${sanitizedTemplate}-v${version}-signed.pdf`;
  const relativePath = path.join(contractId, fileName);
  const absolutePath = path.join(storageRoot(), relativePath);
  assertInsideStorage(absolutePath);
  return { absolutePath, relativePath };
}

export async function writeDocument(absolutePath: string, buffer: Uint8Array): Promise<string> {
  assertInsideStorage(absolutePath);
  const dir = path.dirname(absolutePath);
  await mkdir(dir, { recursive: true });
  await writeFile(absolutePath, buffer);
  return sha256(buffer);
}

export function resolveAbsoluteFromRelative(relativePath: string): string {
  // relativePath vem do banco — sempre validar antes de usar em I/O.
  const candidate = path.join(storageRoot(), relativePath);
  assertInsideStorage(candidate);
  return candidate;
}
