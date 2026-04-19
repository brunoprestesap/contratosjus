/**
 * Utilitário de match textual leve, tolerante a acento e caixa, usado para
 * pré-filtrar candidatos antes de enviar à IA (reduz ruído).
 */

const STOPWORDS_PT = new Set([
  "de",
  "da",
  "do",
  "para",
  "e",
  "a",
  "o",
  "os",
  "as",
  "em",
  "com",
  "sem",
  "por",
  "ao",
  "que",
  "na",
  "no",
  "dos",
  "das",
  "pelo",
  "pela",
  "ou",
  "um",
  "uma",
  "uns",
  "umas",
  "sobre",
  "entre",
  "este",
  "esta",
  "isso",
  "aqui",
  "ali",
  "lá",
  "tipo",
  "ser",
  "ter",
  "bem",
  "apenas",
  "mais",
  "menos",
  "muito",
  "pouco",
  "aquisicao",
  "aquisicão",
  "contratacao",
  "contratacão",
  "servico",
  "servicos",
  "servicos",
  "serviço",
  "material",
  "materiais",
  "objeto",
  "objetos",
  "empresa",
  "empresas",
  "destinada",
  "destinado",
  "destinados",
  "destinadas",
  "atender",
  "atender",
]);

export interface Candidate {
  codigo: number;
  descricao: string;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function extractKeywords(text: string): string[] {
  const normalized = normalize(text);
  // 2+ chars; aceitar alfanuméricos curtos com dígito (ex: "a4", "4x4")
  const tokens = normalized.match(/\b[a-z0-9]{2,}\b/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tokens) {
    if (STOPWORDS_PT.has(t)) continue;
    if (seen.has(t)) continue;
    // Reject 2-letter tokens without digit (provavelmente stopword PT)
    if (t.length === 2 && !/[0-9]/.test(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/**
 * Dos candidatos, retorna aqueles cuja descricao contém pelo menos
 * `minMatches` das keywords do objeto. Se a filtragem zerar, devolve
 * todos (fallback), pois é melhor que IA receba ruído do que nada.
 */
export function prefilterByKeywords<T extends Candidate>(
  objeto: string,
  candidates: T[],
  opts: { minMatches?: number; maxReturn?: number } = {},
): T[] {
  const keywords = extractKeywords(objeto);
  if (keywords.length === 0 || candidates.length === 0) return candidates;
  const minMatches = opts.minMatches ?? 1;
  const maxReturn = opts.maxReturn ?? 120;

  const scored = candidates
    .map((c) => {
      const desc = normalize(c.descricao);
      let matches = 0;
      for (const kw of keywords) {
        if (desc.includes(kw)) matches++;
      }
      return { c, matches };
    })
    .filter((s) => s.matches >= minMatches)
    .sort((a, b) => b.matches - a.matches);

  if (scored.length === 0) return candidates.slice(0, maxReturn);
  return scored.slice(0, maxReturn).map((s) => s.c);
}
