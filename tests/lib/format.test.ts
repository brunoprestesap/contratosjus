import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatShortDate,
  formatMonthYear,
  formatDateTime,
  formatDateForInput,
  formatMonthForInput,
  formatCnpj,
  validateCNPJ,
  formatNumber,
  parseCurrencyInput,
  parseDateBR,
} from "@/lib/format";

const normalize = (s: string) => s.replace(/\u00a0/g, " ");

describe("formatCurrency", () => {
  it("formata zero", () => {
    expect(normalize(formatCurrency(0))).toBe("R$ 0,00");
  });

  it("formata inteiro positivo com separador de milhar", () => {
    expect(normalize(formatCurrency(35000))).toBe("R$ 35.000,00");
  });

  it("formata valor negativo", () => {
    expect(normalize(formatCurrency(-150))).toBe("-R$ 150,00");
  });

  it("arredonda decimais com múltiplas casas para 2", () => {
    expect(normalize(formatCurrency(1234.5678))).toBe("R$ 1.234,57");
  });

  it("aceita string numérica (serializada de Decimal)", () => {
    expect(normalize(formatCurrency("35000.5"))).toBe("R$ 35.000,50");
  });

  it("aceita objeto com toString() (tipo Prisma.Decimal)", () => {
    const decimalLike = { toString: () => "12345.67" };
    expect(normalize(formatCurrency(decimalLike))).toBe("R$ 12.345,67");
  });

  it("retorna placeholder para null", () => {
    expect(formatCurrency(null)).toBe("—");
  });

  it("retorna placeholder para undefined", () => {
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("retorna placeholder para string inválida", () => {
    expect(formatCurrency("abc")).toBe("—");
  });
});

describe("formatDate", () => {
  it("formata Date UTC como DD/MM/AAAA sem off-by-one", () => {
    const date = new Date("2026-04-18T00:00:00Z");
    expect(formatDate(date)).toBe("18/04/2026");
  });

  it("formata data no fim do ano sem voltar um dia", () => {
    const date = new Date("2026-12-31T00:00:00Z");
    expect(formatDate(date)).toBe("31/12/2026");
  });

  it("aceita string ISO", () => {
    expect(formatDate("2026-04-18T00:00:00Z")).toBe("18/04/2026");
  });

  it("retorna placeholder para null", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("retorna placeholder para undefined", () => {
    expect(formatDate(undefined)).toBe("—");
  });

  it("retorna placeholder para string inválida", () => {
    expect(formatDate("not-a-date")).toBe("—");
  });
});

describe("formatShortDate", () => {
  it("formata como DD/MM", () => {
    expect(formatShortDate(new Date("2026-04-18T00:00:00Z"))).toBe("18/04");
  });

  it("retorna placeholder para null", () => {
    expect(formatShortDate(null)).toBe("—");
  });
});

describe("formatMonthYear", () => {
  it("remove o ponto da abreviação do mês", () => {
    const result = formatMonthYear(new Date("2026-04-15T00:00:00Z"));
    expect(result).not.toContain(".");
    expect(result).toMatch(/2026/);
    expect(result.toLowerCase()).toContain("abr");
  });

  it("retorna placeholder para data inválida", () => {
    expect(formatMonthYear("xyz")).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("formata timestamp noturno em UTC convertido para Sao Paulo (UTC-3)", () => {
    const ts = new Date("2026-04-18T02:30:00Z");
    const result = normalize(formatDateTime(ts));
    expect(result).toBe("17/04/2026, 23:30");
  });

  it("formata timestamp diurno em Sao Paulo", () => {
    const ts = new Date("2026-04-18T17:30:00Z");
    const result = normalize(formatDateTime(ts));
    expect(result).toBe("18/04/2026, 14:30");
  });

  it("retorna placeholder para null", () => {
    expect(formatDateTime(null)).toBe("—");
  });
});

describe("formatDateForInput", () => {
  it("retorna YYYY-MM-DD", () => {
    expect(formatDateForInput(new Date("2026-04-18T00:00:00Z"))).toBe("2026-04-18");
  });

  it("retorna string vazia para null", () => {
    expect(formatDateForInput(null)).toBe("");
  });
});

describe("formatMonthForInput", () => {
  it("retorna YYYY-MM com zero à esquerda", () => {
    expect(formatMonthForInput(new Date("2026-04-15T00:00:00Z"))).toBe("2026-04");
  });

  it("retorna string vazia para undefined", () => {
    expect(formatMonthForInput(undefined)).toBe("");
  });
});

describe("formatCnpj", () => {
  it("aplica máscara em 14 dígitos puros", () => {
    expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("mantém CNPJ já mascarado após re-aplicar", () => {
    expect(formatCnpj("11.222.333/0001-81")).toBe("11.222.333/0001-81");
  });

  it("retorna só dígitos quando menos de 14 caracteres", () => {
    expect(formatCnpj("12345")).toBe("12345");
  });
});

describe("validateCNPJ", () => {
  it("aceita CNPJ válido", () => {
    expect(validateCNPJ("11.222.333/0001-81")).toBe(true);
  });

  it("aceita CNPJ válido sem máscara", () => {
    expect(validateCNPJ("11222333000181")).toBe(true);
  });

  it("rejeita todos os dígitos iguais", () => {
    expect(validateCNPJ("11.111.111/1111-11")).toBe(false);
  });

  it("rejeita dígito verificador errado", () => {
    expect(validateCNPJ("11.222.333/0001-99")).toBe(false);
  });

  it("rejeita string com menos de 14 dígitos", () => {
    expect(validateCNPJ("123")).toBe(false);
  });
});

describe("formatNumber", () => {
  it("formata com separador de milhar pt-BR", () => {
    expect(formatNumber(1234)).toBe("1.234");
  });

  it("preserva casas decimais por padrão", () => {
    expect(formatNumber(1234.5)).toBe("1.234,5");
  });

  it("aplica opções de formatação", () => {
    expect(formatNumber(1234.5, { minimumFractionDigits: 2 })).toBe("1.234,50");
  });

  it("retorna placeholder para NaN", () => {
    expect(formatNumber(NaN)).toBe("—");
  });
});

describe("parseCurrencyInput", () => {
  it("converte string com R$ e separadores pt-BR", () => {
    expect(parseCurrencyInput("R$ 35.000,00")).toBe(35000);
  });

  it("converte sem símbolo de moeda", () => {
    expect(parseCurrencyInput("35.000,50")).toBe(35000.5);
  });

  it("retorna 0 para input não numérico", () => {
    expect(parseCurrencyInput("abc")).toBe(0);
  });

  it("retorna 0 para string vazia", () => {
    expect(parseCurrencyInput("")).toBe(0);
  });
});

describe("parseDateBR", () => {
  it("converte DD/MM/AAAA em Date UTC", () => {
    const d = parseDateBR("18/04/2026");
    expect(d.getUTCDate()).toBe(18);
    expect(d.getUTCMonth()).toBe(3);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCHours()).toBe(0);
  });

  it("rejeita data inexistente (31/02)", () => {
    expect(() => parseDateBR("31/02/2026")).toThrow("Data inválida");
  });

  it("rejeita mês 13", () => {
    expect(() => parseDateBR("01/13/2026")).toThrow("Data inválida");
  });

  it("rejeita formato ISO", () => {
    expect(() => parseDateBR("2026-04-18")).toThrow("Data inválida");
  });

  it("rejeita string vazia", () => {
    expect(() => parseDateBR("")).toThrow("Data inválida");
  });

  it("aceita ano bissexto (29/02/2028)", () => {
    const d = parseDateBR("29/02/2028");
    expect(d.getUTCDate()).toBe(29);
    expect(d.getUTCMonth()).toBe(1);
  });

  it("rejeita 29/02 em ano não bissexto", () => {
    expect(() => parseDateBR("29/02/2026")).toThrow("Data inválida");
  });
});
