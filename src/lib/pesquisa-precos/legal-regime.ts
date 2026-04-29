import { LegalRegime } from "@/generated/prisma/client";

/**
 * Data de corte para heurística de inferência de regime em modalidades
 * ambíguas (pregão, concorrência, dispensa, inexigibilidade, leilão, concurso).
 * Em abril/2023 a Lei 14.133 consolidou sua vigência: editais novos passaram a
 * se enquadrar no novo regime. É heurística, não prova — fiscal sempre pode
 * desligar o filtro e reincluir amostras manualmente.
 */
const LEI_14133_CUTOFF = new Date("2023-04-01T00:00:00Z");

/**
 * Modalidades exclusivas de cada lei — permitem inferência direta sem data.
 * Valores cobrem strings (rótulos humanos normalizados) e números (códigos SIASGnet).
 * Códigos numéricos com incerteza ficam em AMBIGUOUS para que a data decida.
 */
const EXCLUSIVE_14133 = new Set<string>(["dialogo competitivo", "diálogo competitivo"]);

const EXCLUSIVE_8666 = new Set<string>([
  "tomada de precos",
  "tomada de preços",
  "convite",
  "1", // Convite (SIASGnet)
  "2", // Tomada de Preços (SIASGnet)
]);

/**
 * Normaliza o campo modalidade para comparação (lowercase, remove acentos,
 * colapsa espaços, converte número em string).
 */
export function normalizeModalidade(modalidade: string | number | null | undefined): string | null {
  if (modalidade == null) return null;
  const raw = typeof modalidade === "number" ? String(modalidade) : modalidade;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  return trimmed
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Inferência de regime legal a partir da modalidade (+ data de assinatura
 * como desempate para modalidades ambíguas). Retorna `null` quando dados
 * são insuficientes — nesse caso, `isSampleCompatible` adota fail-open
 * (não exclui na dúvida).
 */
export function inferLegalRegime(
  modalidade: string | number | null | undefined,
  dataAssinatura: Date | null | undefined,
): LegalRegime | null {
  const normalized = normalizeModalidade(modalidade);
  if (normalized == null) return null;

  if (EXCLUSIVE_14133.has(normalized)) return LegalRegime.LEI_14133_2021;
  if (EXCLUSIVE_8666.has(normalized)) return LegalRegime.LEI_8666_1993;

  if (!dataAssinatura) return null;
  const ts = dataAssinatura.getTime();
  if (Number.isNaN(ts)) return null;
  return ts >= LEI_14133_CUTOFF.getTime() ? LegalRegime.LEI_14133_2021 : LegalRegime.LEI_8666_1993;
}

export interface SampleRegimeInput {
  legalRegimeInferred: LegalRegime | null;
}

/**
 * Compatibilidade fail-open: amostras sem regime inferido sempre passam
 * (evita excluir em massa quando a API não devolve modalidade nem data).
 */
export function isSampleCompatible(sample: SampleRegimeInput, regime: LegalRegime): boolean {
  if (sample.legalRegimeInferred == null) return true;
  return sample.legalRegimeInferred === regime;
}

export const LEGAL_REGIME_FILTER_REASON = "Regime legal incompatível (filtro automático)";
