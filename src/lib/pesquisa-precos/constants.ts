/**
 * Constantes do domínio de pesquisa de preços.
 *
 * Este módulo é *puro* (sem imports server-only como Prisma ou pg).
 * Pode ser importado tanto por Server Actions/use-cases quanto por
 * Client Components — evita arrastar a árvore do Prisma para o bundle
 * do browser.
 */

/**
 * Amostras válidas mínimas para finalizar uma pesquisa. Exigência do
 * Manual CNJ de Pesquisa de Preços (para contratações amparadas na
 * Lei 14.133/2021, art. 23).
 */
export const MIN_SAMPLES_TO_FINALIZE = 3;
