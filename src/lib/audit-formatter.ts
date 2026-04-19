import { formatCurrency, formatMonthYear } from "@/lib/format";

interface AuditLog {
  entity: string;
  action: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

const ENTITY_LABELS: Record<string, string> = {
  Contract: "contrato",
  Payment: "pagamento",
  Commitment: "empenho",
  Additive: "aditivo",
  User: "usuário",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Cadastrou",
  UPDATE: "Editou",
  DELETE: "Excluiu",
};

function fmtCurrency(value: unknown): string {
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return formatCurrency(num);
}

function fmtMonth(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  if (isNaN(d.getTime())) return String(value);
  return formatMonthYear(d);
}

function getEntityIdentifier(log: AuditLog): string {
  const data = log.action === "DELETE" ? log.oldValue : log.newValue;
  if (!data) return "";

  switch (log.entity) {
    case "Contract":
      return data.contractNumber ? ` ${data.contractNumber}` : "";
    case "Commitment":
      return data.commitmentNumber ? ` ${data.commitmentNumber}` : "";
    case "Payment":
      return data.referenceMonth ? ` ${fmtMonth(data.referenceMonth)}` : "";
    case "Additive":
      return data.additiveNumber ? ` ${data.additiveNumber}` : "";
    case "User":
      return data.name ? ` ${data.name}` : "";
    default:
      return "";
  }
}

function getChangeDetails(log: AuditLog): string {
  if (log.action !== "UPDATE" || !log.oldValue || !log.newValue) return "";

  const details: string[] = [];
  const fieldLabels: Record<string, string> = {
    globalValue: "valor global",
    estimatedMonthlyValue: "valor mensal",
    endDate: "vigência",
    invoiceValue: "valor NF",
    paidValue: "valor pago",
    settledValue: "valor liquidado",
    value: "valor",
    name: "nome",
    email: "e-mail",
    role: "perfil",
    status: "status",
    contractNumber: "n° contrato",
    supplier: "fornecedor",
    newGlobalValue: "novo valor global",
    newEndDate: "nova vigência",
  };

  const currencyFields = new Set([
    "globalValue", "estimatedMonthlyValue", "invoiceValue",
    "paidValue", "settledValue", "value", "newGlobalValue", "newMonthlyValue",
  ]);

  for (const key of Object.keys(log.newValue)) {
    const label = fieldLabels[key];
    if (!label) continue;

    const oldVal = log.oldValue[key];
    const newVal = log.newValue[key];

    if (currencyFields.has(key)) {
      details.push(`${label}: ${fmtCurrency(oldVal)} \u2192 ${fmtCurrency(newVal)}`);
    } else {
      details.push(`${label}: ${oldVal ?? "—"} \u2192 ${newVal ?? "—"}`);
    }
  }

  return details.length > 0 ? ` — ${details.slice(0, 3).join(", ")}` : "";
}

function getCreateDetails(log: AuditLog): string {
  if (log.action !== "CREATE" || !log.newValue) return "";

  switch (log.entity) {
    case "Payment": {
      const parts: string[] = [];
      if (log.newValue.invoiceValue) {
        parts.push(fmtCurrency(log.newValue.invoiceValue));
      } else if (log.newValue.paidValue) {
        parts.push(fmtCurrency(log.newValue.paidValue));
      }
      return parts.length > 0 ? ` — ${parts.join(", ")}` : "";
    }
    case "Commitment": {
      if (log.newValue.value) {
        return ` — ${fmtCurrency(log.newValue.value)}`;
      }
      return "";
    }
    case "Additive": {
      const parts: string[] = [];
      if (log.newValue.newGlobalValue) {
        parts.push(`valor global: ${fmtCurrency(log.newValue.newGlobalValue)}`);
      }
      return parts.length > 0 ? ` — ${parts.join(", ")}` : "";
    }
    default:
      return "";
  }
}

export function formatAuditDescription(log: AuditLog): string {
  const action = ACTION_LABELS[log.action] ?? log.action;
  const entity = ENTITY_LABELS[log.entity] ?? log.entity;
  const identifier = getEntityIdentifier(log);

  let details = "";
  if (log.action === "UPDATE") {
    details = getChangeDetails(log);
  } else if (log.action === "CREATE") {
    details = getCreateDetails(log);
  }

  return `${action} ${entity}${identifier}${details}`;
}
