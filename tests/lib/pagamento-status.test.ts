import { describe, it, expect } from "vitest";
import { getPaymentStatus } from "@/lib/utils";

describe("getPaymentStatus", () => {
  it("retorna Pendente quando todos os campos são null", () => {
    expect(
      getPaymentStatus({
        attestDate: null,
        settlementDate: null,
        paidAt: null,
      })
    ).toBe("Pendente");
  });

  it("retorna Atestado quando apenas ateste preenchido", () => {
    expect(
      getPaymentStatus({
        attestDate: new Date("2026-01-15"),
        settlementDate: null,
        paidAt: null,
      })
    ).toBe("Atestado");
  });

  it("retorna Liquidado quando ateste e liquidação preenchidos", () => {
    expect(
      getPaymentStatus({
        attestDate: new Date("2026-01-15"),
        settlementDate: new Date("2026-01-20"),
        paidAt: null,
      })
    ).toBe("Liquidado");
  });

  it("retorna Pago quando todos preenchidos", () => {
    expect(
      getPaymentStatus({
        attestDate: new Date("2026-01-15"),
        settlementDate: new Date("2026-01-20"),
        paidAt: new Date("2026-01-25"),
      })
    ).toBe("Pago");
  });

  it("retorna Pendente quando apenas campos intermediários estão undefined", () => {
    expect(
      getPaymentStatus({
        attestDate: undefined,
        settlementDate: undefined,
        paidAt: undefined,
      })
    ).toBe("Pendente");
  });
});
