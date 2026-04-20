/**
 * Types para respostas da API https://dadosabertos.compras.gov.br
 * Campos espelham o OpenAPI spec oficial; subset usado pela feature de Pesquisa de Preços.
 */

export interface ComprasPagedResponse<T> {
  _embedded?: { resultado?: T[]; itens?: T[] };
  resultado?: T[];
  _links?: Record<string, { href: string }>;
  pagina?: number;
  quantidade?: number;
  totalPaginas?: number;
  totalRegistros?: number;
}

export interface CatalogoGrupoMaterial {
  codigoGrupo: number;
  nomeGrupo: string;
  statusGrupo?: boolean;
  dataHoraAtualizacao?: string;
}

export interface CatalogoClasseMaterial {
  codigoGrupo: number;
  nomeGrupo?: string;
  codigoClasse: number;
  nomeClasse: string;
  statusClasse?: boolean;
  dataHoraAtualizacao?: string;
}

export interface CatalogoPdmMaterial {
  codigoGrupo?: number;
  codigoClasse?: number;
  codigoPdm: number;
  nomePdm: string;
  statusPdm?: boolean;
  dataHoraAtualizacao?: string;
}

export interface CatalogoSecaoServico {
  codigoSecao: number;
  nomeSecao: string;
  statusSecao?: boolean;
  dataHoraAtualizacao?: string;
}

export interface CatalogoDivisaoServico {
  codigoSecao: number;
  nomeSecao?: string;
  codigoDivisao: number;
  nomeDivisao: string;
  statusDivisao?: boolean;
  dataHoraAtualizacao?: string;
}

export interface CatalogoItemMaterial {
  codigoItem: number;
  descricaoItem: string;
  codigoClasse?: number | null;
  nomeClasse?: string | null;
  codigoGrupo?: number | null;
  nomeGrupo?: string | null;
  codigoPdm?: number | null;
  nomePdm?: string | null;
  statusItem?: boolean;
  itemSustentavel?: boolean;
  codigo_ncm?: string | null;
  descricao_ncm?: string | null;
  aplica_margem_preferencia?: boolean | null;
  dataHoraAtualizacao?: string;
}

export interface CatalogoItemServico {
  codigoServico: number;
  nomeServico?: string;
  descricaoServico?: string;
  codigoSecao?: number | null;
  nomeSecao?: string | null;
  codigoDivisao?: number | null;
  nomeDivisao?: string | null;
  codigoGrupo?: number | null;
  nomeGrupo?: string | null;
  codigoClasse?: number | null;
  nomeClasse?: string | null;
  codigoSubclasse?: number | null;
  nomeSubclasse?: string | null;
  codigoCpc?: number | null;
  statusServico?: boolean;
  dataHoraAtualizacao?: string;
}

/**
 * Campos reais observados no retorno de
 * /modulo-pesquisa-preco/1_consultarMaterial e /3_consultarServico.
 * Estrutura espelha a do catálogo compras.gov.br — note que o preço
 * reportado é UNITÁRIO (precoUnitario), e o valor total é obtido multiplicando
 * por `quantidade`.
 */
export interface PrecoPraticadoMaterial {
  idCompra?: string | number;
  idItemCompra?: string | number;
  codigoItemCatalogo: number;
  descricaoItem?: string;
  descricaoDetalhadaItem?: string | null;
  numeroItemCompra?: number;
  nomeUnidadeMedida?: string;
  siglaUnidadeMedida?: string;
  nomeUnidadeFornecimento?: string | null;
  siglaUnidadeFornecimento?: string | null;
  capacidadeUnidadeFornecimento?: number | null;
  quantidade?: number | null;
  precoUnitario?: number | null;
  percentualMaiorDesconto?: number | null;
  niFornecedor?: string | null;
  nomeFornecedor?: string | null;
  marca?: string | null;
  codigoUasg?: string;
  nomeUasg?: string;
  codigoMunicipio?: number | null;
  municipio?: string | null;
  estado?: string | null;
  codigoOrgao?: string;
  nomeOrgao?: string;
  poder?: string;
  esfera?: string;
  forma?: string | null;
  /** Texto ou código numérico conforme retorno da API. */
  modalidade?: string | number | null;
  criterioJulgamento?: string | null;
  dataCompra?: string | null;
  dataResultado?: string | null;
  dataHoraAtualizacaoCompra?: string;
  dataHoraAtualizacaoItem?: string;
  dataHoraAtualizacaoUasg?: string;
  codigoClasse?: number | null;
  nomeClasse?: string | null;
  objetoCompra?: string | null;
}

export type PrecoPraticadoServico = PrecoPraticadoMaterial;

export interface ItemContratacao14133 {
  numeroControlePNCPCompra?: string;
  idCompra?: string;
  idCompraItem?: string;
  numeroItem?: number;
  materialOuServico?: "Material" | "Servico";
  descricao?: string;
  codItemCatalogo?: number | null;
  codigoGrupo?: number | null;
  codigoClasse?: number | null;
  codigoNCM?: string | null;
  quantidade?: number | null;
  valorUnitarioEstimado?: number | null;
  valorTotalEstimado?: number | null;
  valorUnitarioHomologado?: number | null;
  valorTotalHomologado?: number | null;
  orgaoEntidadeCnpj?: string | null;
  orgaoEntidadeRazaoSocial?: string | null;
  unidadeOrgaoCodigoUnidade?: string | null;
  unidadeOrgaoUfSigla?: string | null;
  dataInclusaoPncp?: string | null;
  dataAtualizacaoPncp?: string | null;
  situacaoCompraItem?: string | null;
  temResultado?: boolean;
}

export interface ResultadoItemContratacao14133 {
  numeroControlePNCPCompra?: string;
  idCompra?: string;
  idCompraItem?: string;
  idResultado?: string;
  niFornecedor?: string;
  nomeRazaoSocialFornecedor?: string;
  codigoPais?: string;
  porteFornecedorId?: number | null;
  naturezaJuridicaId?: string | null;
  situacaoCompraItemResultadoId?: number | null;
  valorUnitarioHomologado?: number | null;
  valorTotalHomologado?: number | null;
  quantidadeHomologada?: number | null;
  dataResultadoPncp?: string | null;
  aplicacaoMargemPreferencia?: boolean;
  aplicacaoBeneficioMeepp?: boolean;
}

export interface ItemLicitacaoLegado {
  id_compra?: string;
  id_compra_item?: string;
  uasg?: number;
  numero_aviso?: number;
  modalidade?: number;
  numero_item?: number;
  codigo_item_material?: number | null;
  codigo_item_servico?: number | null;
  descricao_item?: string | null;
  quantidade?: number | null;
  valor_unitario_estimado?: number | null;
  valor_total_estimado?: number | null;
  cnpj_fornecedor?: string | null;
  nome_fornecedor?: string | null;
  data_publicacao?: string | null;
  data_homologacao?: string | null;
}
