import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

describe("documents/engine/storage", () => {
  let tempRoot: string;
  let originalEnv: string | undefined;

  beforeEach(async () => {
    tempRoot = await mkdtemp(path.join(tmpdir(), "docs-test-"));
    originalEnv = process.env.DOCUMENTS_STORAGE_PATH;
    process.env.DOCUMENTS_STORAGE_PATH = tempRoot;
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.DOCUMENTS_STORAGE_PATH;
    } else {
      process.env.DOCUMENTS_STORAGE_PATH = originalEnv;
    }
    await rm(tempRoot, { recursive: true, force: true });
  });

  it("resolveDocumentPath monta caminho por contrato e versão", async () => {
    const mod = await import("@/lib/documents/engine/storage");
    const { absolutePath, relativePath } = mod.resolveDocumentPath(
      "c1",
      "fiscalizacao.ateste-nf",
      3
    );
    expect(relativePath).toBe(
      path.join("c1", "fiscalizacao-ateste-nf-v3.pdf")
    );
    expect(absolutePath).toBe(path.join(tempRoot, relativePath));
  });

  it("sha256 retorna hash hex estável de 64 chars", async () => {
    const mod = await import("@/lib/documents/engine/storage");
    const buf = Buffer.from("payload-fixo", "utf-8");
    const expected = createHash("sha256").update(buf).digest("hex");
    expect(mod.sha256(buf)).toBe(expected);
    expect(mod.sha256(buf)).toHaveLength(64);
  });

  it("writeDocument grava arquivo, cria diretório e retorna checksum correto", async () => {
    const mod = await import("@/lib/documents/engine/storage");
    const { absolutePath } = mod.resolveDocumentPath(
      "contrato-123",
      "fiscalizacao.ateste-nf",
      1
    );
    const payload = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // "%PDF"
    const checksum = await mod.writeDocument(absolutePath, payload);

    const expected = createHash("sha256").update(payload).digest("hex");
    expect(checksum).toBe(expected);

    const written = await readFile(absolutePath);
    expect(written.length).toBe(payload.length);
    expect(written[0]).toBe(0x25);
  });

  it("resolveAbsoluteFromRelative usa STORAGE_ROOT do env", async () => {
    const mod = await import("@/lib/documents/engine/storage");
    const result = mod.resolveAbsoluteFromRelative("abc/foo-v1.pdf");
    expect(result).toBe(path.join(tempRoot, "abc/foo-v1.pdf"));
  });

  it("versões diferentes geram paths distintos", async () => {
    const mod = await import("@/lib/documents/engine/storage");
    const v1 = mod.resolveDocumentPath("c", "t", 1);
    const v2 = mod.resolveDocumentPath("c", "t", 2);
    expect(v1.relativePath).not.toBe(v2.relativePath);
  });

  describe("segurança de path", () => {
    it("rejeita contractId com travessal", async () => {
      const mod = await import("@/lib/documents/engine/storage");
      expect(() =>
        mod.resolveDocumentPath("../etc", "t", 1)
      ).toThrow(mod.UnsafePathError);
      expect(() =>
        mod.resolveDocumentPath("..", "t", 1)
      ).toThrow(mod.UnsafePathError);
      expect(() =>
        mod.resolveDocumentPath("a/b", "t", 1)
      ).toThrow(mod.UnsafePathError);
    });

    it("rejeita contractId com caractere nulo", async () => {
      const mod = await import("@/lib/documents/engine/storage");
      expect(() =>
        mod.resolveDocumentPath("c\0x", "t", 1)
      ).toThrow(mod.UnsafePathError);
    });

    it("rejeita templateId com separador", async () => {
      const mod = await import("@/lib/documents/engine/storage");
      expect(() =>
        mod.resolveDocumentPath("c", "a/b", 1)
      ).toThrow(mod.UnsafePathError);
    });

    it("rejeita version inválida", async () => {
      const mod = await import("@/lib/documents/engine/storage");
      expect(() =>
        mod.resolveDocumentPath("c", "t", 0)
      ).toThrow(mod.UnsafePathError);
      expect(() =>
        mod.resolveDocumentPath("c", "t", -1)
      ).toThrow(mod.UnsafePathError);
      expect(() =>
        mod.resolveDocumentPath("c", "t", 1.5)
      ).toThrow(mod.UnsafePathError);
    });

    it("resolveAbsoluteFromRelative rejeita travessal que sai do storage root", async () => {
      const mod = await import("@/lib/documents/engine/storage");
      expect(() =>
        mod.resolveAbsoluteFromRelative("../../etc/passwd")
      ).toThrow(mod.UnsafePathError);
      expect(() =>
        mod.resolveAbsoluteFromRelative("a/../../etc/passwd")
      ).toThrow(mod.UnsafePathError);
    });

    it("aceita paths normais (cuid, identifiers)", async () => {
      const mod = await import("@/lib/documents/engine/storage");
      // cuid gerado pelo Prisma
      const result = mod.resolveDocumentPath(
        "clxyz123abc456def789",
        "fiscalizacao.ateste-nf",
        3
      );
      expect(result.relativePath).toMatch(/^clxyz123abc456def789\//);
    });
  });
});
