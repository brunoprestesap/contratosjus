import { describe, it, expect } from "vitest";
import { contractItemSchema } from "@/lib/validators/contract-item";

const materialBase = {
  itemNumber: "01",
  itemType: "MATERIAL" as const,
  catalogType: "CATMAT" as const,
  catalogCode: "123456",
  description: "Notebook corporativo",
  detailedSpecification: "Notebook i7, 16GB RAM, 512GB SSD",
  unitOfMeasure: "UN" as const,
  quantity: 10,
  unitValue: 5000,
  deliveryLocation: "Almoxarifado Central — JFAP",
};

const serviceBase = {
  itemNumber: "02",
  itemType: "SERVICE" as const,
  catalogType: "CATSER" as const,
  catalogCode: "9999",
  description: "Limpeza predial",
  detailedSpecification: "Serviço contínuo de limpeza em 3 blocos",
  unitOfMeasure: "MES" as const,
  quantity: 12,
  unitValue: 8000,
};

const workBase = {
  itemNumber: "03",
  itemType: "WORK" as const,
  catalogType: "CATSER" as const,
  catalogCode: "77777",
  description: "Reforma da fachada",
  detailedSpecification: "Reforma incluindo pintura, troca de esquadrias e impermeabilização",
  unitOfMeasure: "M2" as const,
  quantity: 500,
  unitValue: 350,
  bdiPercentage: 25.5,
  socialChargesPercentage: 85.3,
};

const itSolutionBase = {
  itemNumber: "04",
  itemType: "IT_SOLUTION" as const,
  catalogType: "CATSER" as const,
  catalogCode: "45678",
  description: "Licença de software de virtualização",
  detailedSpecification: "Licença anual por CPU de hypervisor",
  unitOfMeasure: "OTHER" as const,
  unitOfMeasureOther: "CPU",
  quantity: 20,
  unitValue: 12000,
  pctiReference: "PCTI 2026 — item 4.2",
};

const schema14133 = contractItemSchema("LEI_14133_2021");
const schema8666 = contractItemSchema("LEI_8666_1993");

describe("contractItemSchema — campos obrigatórios base", () => {
  it("aceita MATERIAL completo", () => {
    expect(schema14133.safeParse(materialBase).success).toBe(true);
  });

  it("rejeita sem itemNumber", () => {
    const input = { ...materialBase, itemNumber: "" };
    expect(schema14133.safeParse(input).success).toBe(false);
  });

  it("rejeita quantidade zero ou negativa", () => {
    expect(schema14133.safeParse({ ...materialBase, quantity: 0 }).success).toBe(false);
    expect(schema14133.safeParse({ ...materialBase, quantity: -5 }).success).toBe(false);
  });

  it("rejeita descrição acima de 200 caracteres", () => {
    const input = { ...materialBase, description: "a".repeat(201) };
    expect(schema14133.safeParse(input).success).toBe(false);
  });
});

describe("contractItemSchema — catalogCode por regime", () => {
  it("exige catalogCode em Lei 14.133", () => {
    const input = { ...materialBase, catalogCode: "" };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
    const msgs = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(msgs.some((m) => m.includes("14.133"))).toBe(true);
  });

  it("permite catalogCode vazio em Lei 8.666", () => {
    const input = { ...materialBase, catalogCode: "" };
    expect(schema8666.safeParse(input).success).toBe(true);
  });
});

describe("contractItemSchema — coerência catalogType ↔ itemType", () => {
  it("rejeita MATERIAL com CATSER", () => {
    const input = { ...materialBase, catalogType: "CATSER" as const };
    expect(schema14133.safeParse(input).success).toBe(false);
  });

  it("rejeita SERVICE com CATMAT", () => {
    const input = { ...serviceBase, catalogType: "CATMAT" as const };
    expect(schema14133.safeParse(input).success).toBe(false);
  });

  it("aceita WORK com CATSER", () => {
    expect(schema14133.safeParse(workBase).success).toBe(true);
  });

  it("rejeita IT_SOLUTION com CATMAT", () => {
    const input = { ...itSolutionBase, catalogType: "CATMAT" as const };
    expect(schema14133.safeParse(input).success).toBe(false);
  });
});

describe("contractItemSchema — MATERIAL", () => {
  it("exige deliveryLocation", () => {
    const input = { ...materialBase, deliveryLocation: undefined };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("deliveryLocation");
  });
});

describe("contractItemSchema — WORK (engenharia)", () => {
  it("exige bdiPercentage", () => {
    const input = { ...workBase, bdiPercentage: undefined };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("bdiPercentage");
  });

  it("exige socialChargesPercentage", () => {
    const input = { ...workBase, socialChargesPercentage: undefined };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("socialChargesPercentage");
  });

  it("aceita obra com BDI e encargos sociais", () => {
    expect(schema14133.safeParse(workBase).success).toBe(true);
  });
});

describe("contractItemSchema — IT_SOLUTION", () => {
  it("exige pctiReference (Res. CNJ 182/2013)", () => {
    const input = { ...itSolutionBase, pctiReference: undefined };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("pctiReference");
  });

  it("aceita solução de TI com PCTI", () => {
    expect(schema14133.safeParse(itSolutionBase).success).toBe(true);
  });
});

describe("contractItemSchema — unidade de medida", () => {
  it("aceita unidade fixa do catálogo (UN, MES, M2…)", () => {
    expect(schema14133.safeParse(materialBase).success).toBe(true);
    expect(schema14133.safeParse(serviceBase).success).toBe(true);
    expect(schema14133.safeParse(workBase).success).toBe(true);
  });

  it("rejeita unidade fora do enum (texto livre)", () => {
    const input = { ...materialBase, unitOfMeasure: "unidade" };
    expect(schema14133.safeParse(input).success).toBe(false);
  });

  it("aceita OTHER com unitOfMeasureOther preenchido", () => {
    expect(schema14133.safeParse(itSolutionBase).success).toBe(true);
  });

  it("rejeita OTHER sem unitOfMeasureOther", () => {
    const input = { ...itSolutionBase, unitOfMeasureOther: undefined };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain("unitOfMeasureOther");
  });
});

describe("contractItemSchema — reajuste", () => {
  it("rejeita isAdjustable=true com adjustmentIndex=NONE", () => {
    const input = {
      ...serviceBase,
      isAdjustable: true,
      adjustmentIndex: "NONE" as const,
    };
    const result = schema14133.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("aceita isAdjustable=true com índice definido", () => {
    const input = {
      ...serviceBase,
      isAdjustable: true,
      adjustmentIndex: "IPCA" as const,
    };
    expect(schema14133.safeParse(input).success).toBe(true);
  });

  it("aceita isAdjustable=false com NONE (padrão)", () => {
    expect(schema14133.safeParse(serviceBase).success).toBe(true);
  });
});
