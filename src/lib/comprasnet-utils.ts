/**
 * Utilitários compartilhados para parsing de dados da API Comprasnet.
 * Usados por: importação de contratos, sincronização de empenhos.
 */

/**
 * Converte valores monetários da API (string com formatação BR ou number) para
 * string numérica segura para campos Prisma Decimal. Retorna "0" para nulos.
 */
export function parseVal(value: string | number | null | undefined): string {
  if (value == null) return "0";
  if (typeof value === "number") return value.toString();
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? "0" : parsed.toString();
}

export function safeDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Converte string ISO para Date. Se inválida, retorna fallback (default: agora).
 * ATENÇÃO: datas inválidas como "0000-00-00" resultam em fallback silencioso.
 * O chamador deve filtrar registros com datas ausentes antes de usar esta função
 * para campos financeiros críticos (ex: commitmentDate).
 */
export function safeDateOrFallback(value: string | null | undefined, fallback: Date = new Date()): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}
