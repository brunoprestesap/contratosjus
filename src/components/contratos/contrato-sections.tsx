import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { formatDate, formatCurrency, formatCnpj } from "@/lib/utils";
import {
  LEGAL_REGIME_LABELS,
  BIDDING_MODALITY_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_PERIODICITY_LABELS,
  COMMITMENT_TYPE_LABELS,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoricoSection } from "@/components/contratos/historico-section";
import { CronogramaSection } from "@/components/contratos/cronograma-section";
import { GarantiasSection } from "@/components/contratos/garantias-section";
import { ItensSection } from "@/components/contratos/itens-section";
import { PrepostosSection } from "@/components/contratos/prepostos-section";
import { OcorrenciasSection } from "@/components/contratos/ocorrencias-section";
import { TerceirizadosSection } from "@/components/contratos/terceirizados-section";
import { ArquivosSection } from "@/components/contratos/arquivos-section";
import { FaturasSection } from "@/components/contratos/faturas-section";
import { PublicacoesSection } from "@/components/contratos/publicacoes-section";

interface ContratoSectionsProps {
  contract: {
    contractNumber: string;
    processNumber: string;
    supplier: string;
    supplierCnpj: string;
    object: string;
    legalRegime: string;
    biddingModality: string;
    signatureDate: Date;
    startDate: Date;
    endDate: Date;
    canExtend: boolean;
    globalValue: { toString(): string };
    paymentType: string;
    estimatedMonthlyValue: { toString(): string } | null;
    paymentPeriodicity: string;
    budgetProgram: string | null;
    expenseNature: string | null;
    fiscalHolder: string;
    fiscalSubstitute: string | null;
    contractManager: string | null;
    commitments: {
      id: string;
      commitmentNumber: string;
      commitmentDate: Date;
      value: { toString(): string };
      type: string;
      notes: string | null;
    }[];
    historicos: {
      id: string;
      numero: string;
      tipo: string;
      categoria: string | null;
      observacao: string | null;
      fornecedorNome: string | null;
      fornecedorCnpj: string | null;
      dataAssinatura: Date | null;
      vigenciaInicio: Date | null;
      vigenciaFim: Date | null;
      valorGlobal: { toString(): string } | null;
      novoValorGlobal: { toString(): string } | null;
      situacaoContrato: string | null;
    }[];
    cronogramas: {
      id: string;
      tipo: string;
      numero: string;
      mesRef: number;
      anoRef: number;
      vencimento: Date | null;
      retroativo: string | null;
      valor: { toString(): string };
      observacao: string | null;
    }[];
    garantias: {
      id: string;
      tipo: string;
      valor: { toString(): string };
      vencimento: Date | null;
    }[];
    itens: {
      id: string;
      descricao: string | null;
      descricaoComplementar: string | null;
      quantidade: { toString(): string } | null;
      valorUnitario: { toString(): string } | null;
      valorTotal: { toString(): string } | null;
      numeroItemCompra: string | null;
    }[];
    prepostos: {
      id: string;
      usuario: string;
      email: string | null;
      telefonefixo: string | null;
      celular: string | null;
      dataInicio: Date | null;
      dataFim: Date | null;
      situacao: string;
    }[];
    ocorrencias: {
      id: string;
      tipo: string | null;
      descricao: string | null;
      data: Date | null;
      situacao: string | null;
    }[];
    terceirizados: {
      id: string;
      usuario: string;
      funcao: string | null;
      jornada: number | null;
      unidade: string | null;
      salario: { toString(): string } | null;
      custo: { toString(): string } | null;
      dataInicio: Date | null;
      dataFim: Date | null;
      situacao: string;
    }[];
    arquivos: {
      id: string;
      tipo: string | null;
      descricao: string | null;
      pathArquivo: string | null;
      origem: string | null;
      sequencialDocumento: string | null;
    }[];
    faturas: {
      id: string;
      numero: string;
      emissao: Date | null;
      vencimento: Date | null;
      valor: { toString(): string };
      juros: { toString(): string };
      multa: { toString(): string };
      glosa: { toString(): string };
      valorLiquido: { toString(): string };
      processo: string | null;
      ateste: string | null;
      situacao: string;
      mesRef: number;
      anoRef: number;
    }[];
    publicacoes: {
      id: string;
      dataPublicacao: Date | null;
      status: string | null;
      textoDou: string | null;
      linkPublicacao: string | null;
    }[];
  };
}

function DataRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm">{value ?? "—"}</p>
    </div>
  );
}

function SectionBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="ml-2">
      {count}
    </Badge>
  );
}

export function ContratoSections({ contract }: ContratoSectionsProps) {
  return (
    <Accordion defaultValue={["dados-cadastrais"]}>
      <AccordionItem value="dados-cadastrais">
        <AccordionTrigger>Dados Cadastrais</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <DataRow label="N° do Contrato" value={contract.contractNumber} />
            <DataRow label="N° do Processo" value={contract.processNumber} />
            <DataRow label="Fornecedor" value={contract.supplier} />
            <DataRow
              label="CNPJ"
              value={formatCnpj(contract.supplierCnpj)}
            />
            <DataRow
              label="Regime Legal"
              value={
                LEGAL_REGIME_LABELS[contract.legalRegime] ??
                contract.legalRegime
              }
            />
            <DataRow
              label="Modalidade"
              value={
                BIDDING_MODALITY_LABELS[contract.biddingModality] ??
                contract.biddingModality
              }
            />
            <div className="col-span-2">
              <DataRow label="Objeto" value={contract.object} />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="vigencia">
        <AccordionTrigger>Vigência</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <DataRow
              label="Data de Assinatura"
              value={formatDate(contract.signatureDate)}
            />
            <DataRow
              label="Data de Início"
              value={formatDate(contract.startDate)}
            />
            <DataRow
              label="Data de Término"
              value={formatDate(contract.endDate)}
            />
            <DataRow
              label="Prorrogação"
              value={contract.canExtend ? "Sim" : "Não"}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="financeiro">
        <AccordionTrigger>Financeiro</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <DataRow
              label="Valor Global"
              value={formatCurrency(parseFloat(contract.globalValue.toString()))}
            />
            <DataRow
              label="Tipo de Pagamento"
              value={
                PAYMENT_TYPE_LABELS[contract.paymentType] ??
                contract.paymentType
              }
            />
            <DataRow
              label="Valor Mensal Estimado"
              value={
                contract.estimatedMonthlyValue
                  ? formatCurrency(
                      parseFloat(contract.estimatedMonthlyValue.toString())
                    )
                  : "—"
              }
            />
            <DataRow
              label="Periodicidade"
              value={
                PAYMENT_PERIODICITY_LABELS[contract.paymentPeriodicity] ??
                contract.paymentPeriodicity
              }
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="dotacao">
        <AccordionTrigger>Dotação Orçamentária</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <DataRow
              label="Programa de Trabalho"
              value={contract.budgetProgram}
            />
            <DataRow
              label="Natureza da Despesa"
              value={contract.expenseNature}
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="empenhos">
        <AccordionTrigger>
          Empenhos
          <SectionBadge count={contract.commitments.length} />
        </AccordionTrigger>
        <AccordionContent>
          {contract.commitments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum empenho registrado para este contrato.
            </p>
          ) : (
            <div className="pt-2 space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Empenho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contract.commitments.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {c.commitmentNumber}
                      </TableCell>
                      <TableCell>{formatDate(c.commitmentDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={c.type === "INITIAL" ? "default" : "outline"}
                        >
                          {COMMITMENT_TYPE_LABELS[c.type] ?? c.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(parseFloat(c.value.toString()))}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[300px] truncate">
                        {c.notes ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end border-t pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Total empenhado: </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      contract.commitments.reduce(
                        (sum, c) => sum + parseFloat(c.value.toString()),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="historico">
        <AccordionTrigger>
          Histórico
          <SectionBadge count={contract.historicos.length} />
        </AccordionTrigger>
        <AccordionContent>
          <HistoricoSection historicos={contract.historicos} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cronograma">
        <AccordionTrigger>
          Cronograma
          <SectionBadge count={contract.cronogramas.length} />
        </AccordionTrigger>
        <AccordionContent>
          <CronogramaSection cronogramas={contract.cronogramas} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="faturas">
        <AccordionTrigger>
          Faturas
          <SectionBadge count={contract.faturas.length} />
        </AccordionTrigger>
        <AccordionContent>
          <FaturasSection faturas={contract.faturas} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="garantias">
        <AccordionTrigger>
          Garantias
          <SectionBadge count={contract.garantias.length} />
        </AccordionTrigger>
        <AccordionContent>
          <GarantiasSection garantias={contract.garantias} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="itens">
        <AccordionTrigger>
          Itens
          <SectionBadge count={contract.itens.length} />
        </AccordionTrigger>
        <AccordionContent>
          <ItensSection itens={contract.itens} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="prepostos">
        <AccordionTrigger>
          Prepostos
          <SectionBadge count={contract.prepostos.length} />
        </AccordionTrigger>
        <AccordionContent>
          <PrepostosSection prepostos={contract.prepostos} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="ocorrencias">
        <AccordionTrigger>
          Ocorrências
          <SectionBadge count={contract.ocorrencias.length} />
        </AccordionTrigger>
        <AccordionContent>
          <OcorrenciasSection ocorrencias={contract.ocorrencias} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="terceirizados">
        <AccordionTrigger>
          Terceirizados
          <SectionBadge count={contract.terceirizados.length} />
        </AccordionTrigger>
        <AccordionContent>
          <TerceirizadosSection terceirizados={contract.terceirizados} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="arquivos">
        <AccordionTrigger>
          Arquivos
          <SectionBadge count={contract.arquivos.length} />
        </AccordionTrigger>
        <AccordionContent>
          <ArquivosSection arquivos={contract.arquivos} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="publicacoes">
        <AccordionTrigger>
          Publicações
          <SectionBadge count={contract.publicacoes.length} />
        </AccordionTrigger>
        <AccordionContent>
          <PublicacoesSection publicacoes={contract.publicacoes} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="gestao">
        <AccordionTrigger>Gestão</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <DataRow label="Fiscal Titular" value={contract.fiscalHolder} />
            <DataRow
              label="Fiscal Substituto"
              value={contract.fiscalSubstitute}
            />
            <DataRow
              label="Gestor do Contrato"
              value={contract.contractManager}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
