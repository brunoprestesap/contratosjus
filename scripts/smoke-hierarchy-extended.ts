/**
 * Smoke test estendido — 5 objetos típicos (3 material, 2 serviço).
 */
import "dotenv/config";
import {
  suggestCatmatHierarchy,
  suggestCatserHierarchy,
} from "../src/lib/ai/generate";

const casos = [
  {
    tipo: "MATERIAL" as const,
    objeto: "Aquisição de papel A4 75g/m² branco para impressão",
  },
  {
    tipo: "MATERIAL" as const,
    objeto: "Café torrado e moído tradicional 500g, para copa",
  },
  {
    tipo: "MATERIAL" as const,
    objeto: "Cartucho de toner monocromático para impressora HP LaserJet",
  },
  {
    tipo: "SERVICO" as const,
    objeto:
      "Contratação de serviços continuados de limpeza e conservação predial",
  },
  {
    tipo: "SERVICO" as const,
    objeto: "Manutenção preventiva e corretiva de equipamentos de refrigeração",
  },
];

async function rodar() {
  for (const c of casos) {
    console.log(`\n=== ${c.tipo}: "${c.objeto}" ===`);
    const t0 = Date.now();
    const result =
      c.tipo === "MATERIAL"
        ? await suggestCatmatHierarchy(c.objeto)
        : await suggestCatserHierarchy(c.objeto);
    const elapsed = Date.now() - t0;
    if (!result.success) {
      console.log("✗ falhou:", result.reason);
      continue;
    }
    const final = result.trail.at(-1);
    const tokens = result.logs.reduce(
      (s, l) => s + l.inputTokens + l.outputTokens,
      0
    );
    console.log(`✓ ${elapsed}ms · ${tokens}t · conf=${final?.confidence}`);
    console.log(`  → [${final?.codigo}] ${final?.descricao?.slice(0, 90)}`);
    if (final?.alternativas?.length) {
      console.log(
        `  alt: ${final.alternativas.map((a) => `[${a.codigo}]${a.confidence}`).join(", ")}`
      );
    }
  }
}

rodar().then(() => process.exit(0));
