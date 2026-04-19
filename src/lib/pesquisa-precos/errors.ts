/**
 * Erro de domínio cujo `.message` é seguro expor ao cliente.
 * Ex.: "Pesquisa não encontrada", "Código do catálogo inválido".
 * Capturado na action via `SAFE_ERROR_NAMES` + `handleError`.
 */
export class ResearchDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchDomainError";
  }
}
