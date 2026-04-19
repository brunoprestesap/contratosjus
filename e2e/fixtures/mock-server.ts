import { createServer, type Server } from "node:http";

/**
 * Mock HTTP server para as APIs externas consumidas pela pesquisa de
 * preços. Sobe em porta fixa (3002) antes da suíte e é fechado no
 * afterAll. Necessário porque os fetches vivem no processo do Next
 * (Server Action) — `page.route()` do Playwright só intercepta tráfego
 * do browser.
 *
 * Aponte `.env.test` para cá:
 *   COMPRAS_DADOSABERTOS_BASE_URL=http://localhost:3002/dadosabertos
 *   MARITACA_BASE_URL=http://localhost:3002/maritaca
 */

export const MOCK_PORT = 3002;

export interface MockSample {
  idCompra: string;
  idItemCompra: string;
  codigoItemCatalogo: number;
  descricaoItem: string;
  descricaoDetalhadaItem: string;
  quantidade: number;
  precoUnitario: number;
  nomeOrgao: string;
  niFornecedor: string;
  estado: string;
  modalidade: string;
  dataCompra: string;
}

export const DEFAULT_SAMPLES: MockSample[] = [
  {
    idCompra: "C-001",
    idItemCompra: "I-001",
    codigoItemCatalogo: 17523,
    descricaoItem: "Vigilância armada",
    descricaoDetalhadaItem: "Serviço de vigilância armada 12x36 diurno — post fixo",
    quantidade: 12,
    precoUnitario: 18_500,
    nomeOrgao: "Tribunal Regional Federal",
    niFornecedor: "11.111.111/0001-11",
    estado: "AP",
    modalidade: "Pregão Eletrônico",
    dataCompra: "2024-08-15",
  },
  {
    idCompra: "C-002",
    idItemCompra: "I-002",
    codigoItemCatalogo: 17523,
    descricaoItem: "Vigilância armada",
    descricaoDetalhadaItem: "Vigilância ostensiva armada — 12 postos",
    quantidade: 12,
    precoUnitario: 19_200,
    nomeOrgao: "Justiça Federal",
    niFornecedor: "22.222.222/0001-22",
    estado: "PA",
    modalidade: "Pregão Eletrônico",
    dataCompra: "2024-09-10",
  },
  {
    idCompra: "C-003",
    idItemCompra: "I-003",
    codigoItemCatalogo: 17523,
    descricaoItem: "Vigilância armada",
    descricaoDetalhadaItem: "Vigilância armada 24x7 — 3 postos",
    quantidade: 12,
    precoUnitario: 20_100,
    nomeOrgao: "MPF",
    niFornecedor: "33.333.333/0001-33",
    estado: "AM",
    modalidade: "Pregão Eletrônico",
    dataCompra: "2024-10-05",
  },
  {
    idCompra: "C-004",
    idItemCompra: "I-004",
    codigoItemCatalogo: 17523,
    descricaoItem: "Vigilância armada",
    descricaoDetalhadaItem: "Vigilância armada 12h — 5 postos",
    quantidade: 12,
    precoUnitario: 17_800,
    nomeOrgao: "TRE",
    niFornecedor: "44.444.444/0001-44",
    estado: "AP",
    modalidade: "Pregão Eletrônico",
    dataCompra: "2024-11-20",
  },
  {
    idCompra: "C-005-OUTLIER",
    idItemCompra: "I-005-OUTLIER",
    codigoItemCatalogo: 17523,
    descricaoItem: "Vigilância desarmada",
    descricaoDetalhadaItem: "Apenas portaria desarmada em edifício residencial",
    quantidade: 12,
    precoUnitario: 6_500,
    nomeOrgao: "Condomínio Edifício XYZ",
    niFornecedor: "55.555.555/0001-55",
    estado: "SP",
    modalidade: "Contratação Direta",
    dataCompra: "2024-07-01",
  },
];

function maritacaResponse(content: string) {
  return {
    choices: [{ index: 0, message: { role: "assistant", content } }],
    usage: { prompt_tokens: 200, completion_tokens: 80 },
    model: "sabia-3.1",
  };
}

interface FilterPromptSample {
  indice: number;
  id: string;
  objeto: string;
  valorGlobal: number;
}

interface ChatCompletionsBody {
  messages: Array<{ role: string; content: string }>;
}

/**
 * Extrai o payload do prompt enviado pela action. O formato da API
 * Maritaca é OpenAI-compatible: `{ messages: [{role, content}] }`.
 * O use-case coloca o JSON estruturado em `content` da mensagem `user`.
 */
function extractUserJson<T>(requestBody: string): T | null {
  try {
    const envelope = JSON.parse(requestBody) as ChatCompletionsBody;
    const userMsg = envelope.messages.find((m) => m.role === "user");
    if (!userMsg) return null;
    return JSON.parse(userMsg.content) as T;
  } catch {
    return null;
  }
}

/**
 * Marca como excluídas as amostras cujo `objeto` contém
 * "portaria desarmada" — nosso outlier plantado em `DEFAULT_SAMPLES`.
 * Usar o conteúdo em vez de índice fixo elimina dependência da ordem
 * que o Prisma devolve em `findUnique` sem orderBy.
 */
function buildFilterResponse(requestBody: string): {
  mantidas: number[];
  excluidas: Array<{ indice: number; motivo: string }>;
} {
  const prompt = extractUserJson<{ amostras?: FilterPromptSample[] }>(requestBody);
  if (!prompt?.amostras) return { mantidas: [], excluidas: [] };
  const mantidas: number[] = [];
  const excluidas: Array<{ indice: number; motivo: string }> = [];
  for (const s of prompt.amostras) {
    if (/portaria desarmada/i.test(s.objeto)) {
      excluidas.push({
        indice: s.indice,
        motivo: "Objeto divergente (portaria desarmada residencial)",
      });
    } else {
      mantidas.push(s.indice);
    }
  }
  return { mantidas, excluidas };
}

const DEFAULT_JUSTIFICATIVA = [
  "A pesquisa de preços demonstra que o valor praticado neste contrato",
  "é compatível com a média de mercado apurada em contratações análogas.",
  "Referência: API Dados Abertos compras.gov.br, módulo de pesquisa de preços.",
  "Conclui-se pela economicidade e adequação do preço pactuado, nos termos",
  "do art. 23 da Lei 14.133/2021 e do Manual CNJ de Pesquisa de Preços.",
].join(" ");

export interface MockHandle {
  stop(): Promise<void>;
}

/**
 * Sobe o mock server e retorna um handle para parar depois.
 * Idempotente: se já há server rodando na porta, falha ruidosamente.
 */
export function startMockServer(): Promise<MockHandle> {
  return new Promise((resolve, reject) => {
    const server: Server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${MOCK_PORT}`);
      if (process.env.E2E_MOCK_VERBOSE === "true") {
        // Log bruto — útil apenas em triagem de falha intermitente.
        console.log(`[mock] ${req.method} ${url.pathname}`);
      }

      // ── Dados Abertos: /dadosabertos/modulo-pesquisa-preco/*
      if (url.pathname.startsWith("/dadosabertos/modulo-pesquisa-preco/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            _embedded: { resultado: DEFAULT_SAMPLES },
            totalPaginas: 1,
            totalRegistros: DEFAULT_SAMPLES.length,
            pagina: 1,
            quantidade: DEFAULT_SAMPLES.length,
          }),
        );
        return;
      }

      // ── Maritaca: /maritaca/chat/completions
      if (url.pathname === "/maritaca/chat/completions" && req.method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (c: Buffer) => chunks.push(c));
        req.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          let content: string;
          // `content` do Maritaca envelopa o prompt como string; `amostras`
          // aparece escapado (`\"amostras\"`). Verificamos o substring sem
          // as aspas para robustez.
          if (body.includes("amostras")) {
            content = JSON.stringify(buildFilterResponse(body));
          } else if (body.includes("estatisticas") || body.includes("periodoReferencia")) {
            content = DEFAULT_JUSTIFICATIVA;
          } else {
            // Fallback neutro para outros purposes (hierarchy ranking etc.)
            content = JSON.stringify({ escolhas: [] });
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(maritacaResponse(content)));
        });
        return;
      }

      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: `mock: endpoint não mockado ${url.pathname}` }));
    });

    server.once("error", reject);
    server.listen(MOCK_PORT, () => {
      resolve({
        stop: () =>
          new Promise<void>((r, rj) => {
            server.close((err) => (err ? rj(err) : r()));
          }),
      });
    });
  });
}
