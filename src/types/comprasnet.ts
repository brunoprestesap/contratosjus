// Tipos baseados na API pública do Comprasnet Contratos
// Ref: https://contratos.comprasnet.gov.br/api/docs
// Nota: a estrutura real difere do schema documentado (objetos aninhados)

export interface ComprasnetUnidadeGestora {
  codigo: string;
  nome_resumido: string;
  nome: string;
  sisg: string;
  utiliza_siafi: string;
  utiliza_antecipagov: string;
}

export interface ComprasnetOrgao {
  codigo: string;
  nome: string;
  unidade_gestora: ComprasnetUnidadeGestora;
}

export interface ComprasnetOrgaoOrigem {
  codigo: string;
  nome: string;
  unidade_gestora_origem: ComprasnetUnidadeGestora;
}

export interface ComprasnetContratante {
  orgao_origem: ComprasnetOrgaoOrigem;
  orgao: ComprasnetOrgao;
}

export interface ComprasnetFornecedorObj {
  tipo: string;
  cnpj_cpf_idgener: string;
  nome: string;
}

export interface ComprasnetLinks {
  historico: string;
  empenhos: string;
  cronograma: string;
  garantias: string;
  itens: string;
  prepostos: string;
  responsaveis: string;
  despesas_acessorias: string;
  faturas: string;
  ocorrencias: string;
  terceirizados: string;
  arquivos: string;
}

// DTO enxuto para listagem na UI — só campos consumidos pela tabela de importação.
// Reduz serialização RSC → client em relação a ComprasnetContrato completo.
export interface ComprasnetContratoDTO {
  id: number;
  numero: string;
  objeto: string;
  situacao: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor_global: number | string;
  fornecedor: {
    nome: string;
    cnpj_cpf_idgener: string;
  };
}

export interface ComprasnetContrato {
  id: number;
  receita_despesa: string;
  numero: string;
  contratante: ComprasnetContratante;
  fornecedor: ComprasnetFornecedorObj;
  codigo_tipo: number;
  tipo: string;
  prorrogavel: string;
  situacao: string;
  categoria: string;
  processo: string;
  objeto: string;
  amparo_legal: string;
  codigo_modalidade: string;
  modalidade: string;
  unidade_compra: number;
  licitacao_numero: string;
  data_assinatura: string;
  data_publicacao: string;
  vigencia_inicio: string;
  vigencia_fim: string;
  valor_inicial: number;
  valor_global: number;
  num_parcelas: number;
  valor_parcela: number;
  valor_acumulado: number;
  links: ComprasnetLinks;
}

export interface ComprasnetResponsavel {
  id: number;
  contrato_id: number;
  usuario: string;
  funcao_id: string;
  instalacao_id: string;
  portaria: string;
  situacao: string;
  data_inicio: string | null;
  data_fim: string | null;
}

export interface ComprasnetEmpenho {
  id: number;
  unidade_gestora: string;
  gestao: string;
  numero: string;
  data_emissao: string;
  credor: string;
  fonte_recurso: string;
  programa_trabalho: string;
  planointerno: string;
  naturezadespesa: string;
  empenhado: string | number;
  aliquidar: string | number;
  liquidado: string | number;
  pago: string | number;
  rpinscrito: string | number;
  rpaliquidar: string | number;
  rpliquidado: string | number;
  rppago: string | number;
  informacao_complementar: string | null;
  sistema_origem: string | null;
  credor_obj?: ComprasnetFornecedorObj;
}

export interface ComprasnetCronograma {
  id: number;
  contrato_id: number;
  tipo: string;
  numero: string;
  receita_despesa: string;
  observacao: string;
  mesref: string | number;
  anoref: string | number;
  vencimento: string | null;
  retroativo: string;
  valor: string | number;
}

export interface ComprasnetHistorico {
  id: number;
  contrato_id: number;
  receita_despesa: string;
  numero: string;
  observacao: string | null;
  ug: string;
  gestao: string;
  fornecedor: ComprasnetFornecedorObj | null;
  codigo_tipo: string;
  tipo: string;
  categoria: string | null;
  processo: string | null;
  objeto: string | null;
  fundamento_legal_aditivo: string | null;
  informacao_complementar: string | null;
  modalidade: string | null;
  licitacao_numero: string | null;
  codigo_unidade_origem: string | null;
  nome_unidade_origem: string | null;
  data_assinatura: string | null;
  data_publicacao: string | null;
  vigencia_inicio: string | null;
  vigencia_fim: string | null;
  valor_inicial: string | number;
  valor_global: string | number;
  num_parcelas: number | null;
  valor_parcela: string | number;
  novo_valor_global: string | number;
  novo_num_parcelas: number | null;
  novo_valor_parcela: string | number;
  situacao_contrato: string | null;
  criado_em: string | null;
  alterado_em: string | null;
}

export interface ComprasnetFatura {
  id: number;
  contrato_id: number;
  tipolistafatura_id: string;
  numero: string;
  emissao: string | null;
  vencimento: string | null;
  valor: string | number;
  juros: string | number;
  multa: string | number;
  glosa: string | number;
  valorliquido: string | number;
  processo: string | null;
  ateste: string | null;
  situacao: string;
  mesref: string;
  anoref: string;
}

export interface ComprasnetGarantia {
  id: number;
  contrato_id: number;
  tipo: string;
  valor: string | number;
  vencimento: string | null;
}

export interface ComprasnetItem {
  id: number;
  contrato_id: number;
  tipo_id: string | null;
  tipo_material: string | null;
  grupo_id: string | null;
  catmatseritem_id: string | null;
  descricao_complementar: string | null;
  quantidade: string | number;
  valorunitario: string | number;
  valortotal: string | number;
  numero_item_compra: string | null;
}

export interface ComprasnetPreposto {
  id: number;
  contrato_id: number;
  usuario: string;
  email: string | null;
  telefonefixo: string | null;
  celular: string | null;
  doc_formalizacao: string | null;
  informacao_complementar: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  situacao: string;
}

export interface ComprasnetOcorrencia {
  id: number;
  contrato_id: number;
  tipo: string | null;
  descricao: string | null;
  data: string | null;
  situacao: string | null;
}

export interface ComprasnetTerceirizado {
  id: number;
  contrato_id: number;
  usuario: string;
  funcao_id: string | null;
  descricao_complementar: string | null;
  jornada: number | null;
  unidade: string | null;
  salario: string | number;
  custo: string | number;
  escolaridade_id: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  situacao: string;
  aux_transporte: string | number | null;
  vale_alimentacao: string | number | null;
}

export interface ComprasnetArquivo {
  id: number;
  contrato_id: number;
  tipo: string | null;
  processo: string | null;
  sequencial_documento: string | null;
  descricao: string | null;
  path_arquivo: string | null;
  origem: string | null;
  link_sei: string | null;
}

export interface ComprasnetPublicacao {
  id: number;
  contratohistorico_id: number;
  data_publicacao: string | null;
  status_publicacao_id: string | null;
  status: string | null;
  texto_dou: string | null;
  link_publicacao: string | null;
}
