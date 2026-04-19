import { describe, it, expect } from "vitest";
import { validatePasswordStrength } from "@/lib/validators/usuario";

describe("validatePasswordStrength", () => {
  it("aceita senha válida com todas as categorias", () => {
    const result = validatePasswordStrength("SenhaForte@2026!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejeita senha muito curta", () => {
    const result = validatePasswordStrength("Abc@1234");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Mínimo de 12 caracteres");
  });

  it("rejeita senha sem letra maiúscula", () => {
    const result = validatePasswordStrength("senhaforte@2026!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Deve conter ao menos uma letra maiúscula");
  });

  it("rejeita senha sem letra minúscula", () => {
    const result = validatePasswordStrength("SENHAFORTE@2026!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Deve conter ao menos uma letra minúscula");
  });

  it("rejeita senha sem número", () => {
    const result = validatePasswordStrength("SenhaForte@Teste!");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Deve conter ao menos um número");
  });

  it("rejeita senha sem caractere especial", () => {
    const result = validatePasswordStrength("SenhaForte2026A");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Deve conter ao menos um caractere especial");
  });

  it("retorna múltiplos erros para string vazia", () => {
    const result = validatePasswordStrength("");
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(4);
    expect(result.errors).toContain("Mínimo de 12 caracteres");
    expect(result.errors).toContain("Deve conter ao menos uma letra maiúscula");
    expect(result.errors).toContain("Deve conter ao menos uma letra minúscula");
    expect(result.errors).toContain("Deve conter ao menos um número");
    expect(result.errors).toContain("Deve conter ao menos um caractere especial");
  });

  it("aceita senha exatamente com 12 caracteres válidos", () => {
    const result = validatePasswordStrength("Abcdefgh1@2x");
    expect(result.valid).toBe(true);
  });
});
