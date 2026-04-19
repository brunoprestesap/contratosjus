import "dotenv/config";
import { listTemplates } from "../src/lib/documents/templates/registry";

const all = listTemplates();
console.log(`Templates registrados: ${all.length}`);
for (const t of all) {
  const cntData = t.sections.filter((s) => s.kind === "DATA").length;
  const cntAI = t.sections.filter((s) => s.kind === "AI").length;
  const cntManual = t.sections.filter((s) => s.kind === "MANUAL").length;
  console.log(
    `  ${t.id} [${t.category}/${t.regimes.join(",")}] — ${t.sections.length} seções (DATA=${cntData}, AI=${cntAI}, MANUAL=${cntManual})`,
  );
}
