"use server";

import { UnauthorizedError, requireAuth } from "@/lib/auth-guard";
import { logger } from "@/lib/logger";
import type { ActionResponse } from "@/types";
import {
  ComprasApiError,
  listClassesMaterial,
  listDivisoesServico,
  listGruposMaterial,
  listItensMaterialByClasse,
  listItensServicoByDivisao,
  listSecoesServico,
} from "@/lib/compras-dadosabertos";

export interface CatalogNode {
  code: number;
  name: string;
}

export interface CatalogItem {
  code: number;
  name: string;
  groupCode?: number | null;
  groupName?: string | null;
  className?: string | null;
  sustainable?: boolean;
}

function handleError(err: unknown, action: string): ActionResponse<never> {
  if (err instanceof UnauthorizedError) {
    return { success: false, error: err.message };
  }
  if (err instanceof ComprasApiError) {
    logger.warn({ err, action }, "Erro ao consultar catálogo compras.gov");
    return {
      success: false,
      error: "Não foi possível consultar o catálogo agora. Tente novamente.",
    };
  }
  logger.error({ err, action }, "Erro inesperado no catálogo");
  return { success: false, error: "Erro ao consultar catálogo" };
}

// ─── CATMAT ─────────────────────────────────────────────

export async function fetchCatmatGrupos(): Promise<ActionResponse<CatalogNode[]>> {
  try {
    await requireAuth();
    const res = await listGruposMaterial({ tamanhoPagina: 500 });
    return {
      success: true,
      data: (res.resultado ?? [])
        .map((g) => ({ code: g.codigoGrupo, name: g.nomeGrupo }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  } catch (err) {
    return handleError(err, "fetchCatmatGrupos");
  }
}

export async function fetchCatmatClasses(
  codigoGrupo: number,
): Promise<ActionResponse<CatalogNode[]>> {
  try {
    await requireAuth();
    const res = await listClassesMaterial(codigoGrupo, { tamanhoPagina: 500 });
    return {
      success: true,
      data: (res.resultado ?? [])
        .map((c) => ({ code: c.codigoClasse, name: c.nomeClasse }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  } catch (err) {
    return handleError(err, "fetchCatmatClasses");
  }
}

export async function fetchCatmatItens(
  codigoClasse: number,
): Promise<ActionResponse<CatalogItem[]>> {
  try {
    await requireAuth();
    const res = await listItensMaterialByClasse(codigoClasse, { tamanhoPagina: 500 });
    return {
      success: true,
      data: (res.resultado ?? []).map((i) => ({
        code: i.codigoItem,
        name: i.descricaoItem,
        groupCode: i.codigoGrupo ?? null,
        groupName: i.nomeGrupo ?? null,
        className: i.nomeClasse ?? null,
        sustainable: i.itemSustentavel ?? false,
      })),
    };
  } catch (err) {
    return handleError(err, "fetchCatmatItens");
  }
}

// ─── CATSER ─────────────────────────────────────────────

export async function fetchCatserSecoes(): Promise<ActionResponse<CatalogNode[]>> {
  try {
    await requireAuth();
    const res = await listSecoesServico({ tamanhoPagina: 500 });
    return {
      success: true,
      data: (res.resultado ?? [])
        .map((s) => ({ code: s.codigoSecao, name: s.nomeSecao }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  } catch (err) {
    return handleError(err, "fetchCatserSecoes");
  }
}

export async function fetchCatserDivisoes(
  codigoSecao: number,
): Promise<ActionResponse<CatalogNode[]>> {
  try {
    await requireAuth();
    const res = await listDivisoesServico(codigoSecao, { tamanhoPagina: 500 });
    return {
      success: true,
      data: (res.resultado ?? [])
        .map((d) => ({ code: d.codigoDivisao, name: d.nomeDivisao }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    };
  } catch (err) {
    return handleError(err, "fetchCatserDivisoes");
  }
}

export async function fetchCatserItens(
  codigoSecao: number,
  codigoDivisao: number,
): Promise<ActionResponse<CatalogItem[]>> {
  try {
    await requireAuth();
    const res = await listItensServicoByDivisao(codigoSecao, codigoDivisao, {
      tamanhoPagina: 500,
    });
    return {
      success: true,
      data: (res.resultado ?? []).map((i) => ({
        code: i.codigoServico,
        name: i.nomeServico ?? i.descricaoServico ?? String(i.codigoServico),
        groupCode: i.codigoGrupo ?? null,
        groupName: i.nomeGrupo ?? null,
        className: i.nomeClasse ?? null,
      })),
    };
  } catch (err) {
    return handleError(err, "fetchCatserItens");
  }
}
