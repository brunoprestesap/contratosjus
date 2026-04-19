import { test, expect } from "@playwright/test";
import { seedE2E, type SeededData } from "../fixtures/seed";
import { loginAs } from "../fixtures/auth";
import { startMockServer, type MockHandle } from "../fixtures/mock-server";

/**
 * E2E do wizard de Pesquisa de Preços — happy path.
 *
 * Cobre o fluxo completo: criar pesquisa → código manual →
 * consultar API (mockada) → filtrar com IA (mockada) → calcular
 * stats → escrever justificativa → finalizar e validar PDF.
 *
 * Os fetches das APIs externas acontecem no processo do Next (Server
 * Action), então subimos um HTTP server em porta 3002 via beforeAll
 * e apontamos .env.test para ele — interceptação de browser
 * (`page.route`) não alcança tráfego server-side.
 */

test.describe("Wizard de Pesquisa de Preços", () => {
  let seeded: SeededData;
  let mockServer: MockHandle;

  test.beforeAll(async () => {
    mockServer = await startMockServer();
    seeded = await seedE2E();
  });

  test.afterAll(async () => {
    await mockServer?.stop();
  });

  test("happy path: criar pesquisa, consultar, filtrar, calcular, justificar, finalizar", async ({
    page,
    context,
  }) => {
    // ── Setup: cookie de sessão (mock server já subiu em beforeAll)
    await loginAs(context, { ...seeded.user, role: "FISCAL" });

    // ── Passo inicial: abrir a lista de pesquisas do contrato
    await page.goto(`/contratos/${seeded.contract.id}/pesquisas`);
    await expect(page.getByRole("heading", { name: /Pesquisas de Preço/i })).toBeVisible();

    // ── Criar nova pesquisa tipo SERVICE (default do radio)
    await page.getByRole("link", { name: /Nova pesquisa/i }).click();
    await expect(page).toHaveURL(/\/pesquisas\/nova$/);
    await page.getByRole("button", { name: /Criar pesquisa/i }).click();

    // Após criar, redireciona para detalhe — wizard abre na aba "codigo"
    await expect(page).toHaveURL(/\/pesquisas\/[^/]+$/);
    await expect(page.getByRole("tab", { name: /1\. Código/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // ── Step 1: digitar CATSER manualmente e confirmar
    await page.getByRole("textbox", { name: "Código" }).fill("17523");
    await page.getByRole("button", { name: /^Confirmar$/ }).click();
    await expect(page.getByText("Código confirmado")).toBeVisible();

    // router.refresh() re-hidrata RSC — aba "Consulta" deve destravar
    // (aria-disabled volta a "false" quando há código confirmado).
    await expect(page.getByRole("tab", { name: /2\. Consulta/i })).toHaveAttribute(
      "aria-disabled",
      "false",
      { timeout: 10_000 },
    );
    await page.getByRole("tab", { name: /2\. Consulta/i }).click();

    // ── Step 2: consultar com filtros default
    await page.getByRole("button", { name: /^Consultar$/ }).click();
    // Mock devolve 5 amostras; uma é filtrada por precoUnitario > 0,
    // mas nossa outlier também tem valor > 0 — entra nas 5.
    await expect(page.getByText(/5 amostras inseridas/i)).toBeVisible({ timeout: 15_000 });

    // Wizard roteia automaticamente para "amostras" após nova consulta
    await page.getByRole("tab", { name: /3\. Amostras/i }).click();
    await expect(page.getByText(/Amostras \(5 válidas de 5\)/i)).toBeVisible({
      timeout: 10_000,
    });

    // ── Step 3: filtrar com IA (mock exclui a outlier de portaria desarmada)
    await page.getByRole("button", { name: /Filtrar com IA/i }).click();
    await expect(page.getByText(/IA excluiu 1 amostra/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Amostras \(4 válidas de 5\)/i)).toBeVisible();

    // Badge "Excluída · IA" deve aparecer na row outlier
    await expect(page.getByText(/Excluída · IA/i)).toBeVisible();

    // ── Step 4: calcular estatísticas
    await page.getByRole("tab", { name: /4\. Justificativa/i }).click();
    await page.getByRole("button", { name: /Recalcular stats/i }).click();
    await expect(page.getByText(/Estatísticas recalculadas/i)).toBeVisible({ timeout: 10_000 });

    // Cards de stats devem ter valores não-zero (format pt-BR)
    await expect(page.getByText("R$", { exact: false }).first()).toBeVisible();

    // ── Step 4b: escrever justificativa manualmente (não depende da IA aqui)
    const justificativa =
      "Com base na média de mercado apurada (R$ 228.600,00), o valor praticado é economicamente vantajoso e adequado conforme art. 23 da Lei 14.133/2021.";
    await page
      .getByRole("textbox", { name: /Justificativa de economicidade/i })
      .fill(justificativa);
    await page.getByRole("button", { name: /Salvar justificativa/i }).click();
    await expect(page.getByText(/Justificativa salva/i)).toBeVisible({ timeout: 10_000 });

    // ── Step 5: finalizar
    await page.getByRole("tab", { name: /5\. Finalizar/i }).click();

    // Pré-requisitos visíveis como checklist ok
    await expect(page.getByText(/4 amostras válidas/i)).toBeVisible();
    await expect(page.getByText(/Estatísticas calculadas/i)).toBeVisible();
    await expect(page.getByText(/Justificativa preenchida/i)).toBeVisible();

    await page.getByRole("button", { name: /Finalizar e gerar PDF/i }).click();
    await expect(page.getByText(/Pesquisa finalizada — PDF gerado/i)).toBeVisible({
      timeout: 30_000,
    });

    // Banner verde "Pesquisa finalizada" + link para o documento gerado
    await expect(page.getByText(/Pesquisa finalizada$/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Abrir documento gerado/i })).toBeVisible();
  });
});
