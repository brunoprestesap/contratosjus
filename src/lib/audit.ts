import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

type AuditEntity =
  | "Contract"
  | "Payment"
  | "Commitment"
  | "Additive"
  | "User"
  | "GeneratedDocument"
  | "PriceResearch"
  | "PriceSample"
  | "FiscalOccurrence"
  | "AICall";
type AuditAction = "CREATE" | "UPDATE" | "DELETE";

interface AuditParams {
  entity: AuditEntity;
  entityId: string;
  action: AuditAction;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

const SENSITIVE_FIELDS = ["passwordHash", "password"];

function sanitize(
  data: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!data) return null;
  const clean = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in clean) {
      delete clean[field];
    }
  }
  // Serialize Decimal-like objects to string for JSON storage
  for (const [key, value] of Object.entries(clean)) {
    if (value !== null && typeof value === "object" && "toFixed" in (value as object)) {
      clean[key] = String(value);
    }
  }
  return clean;
}

export async function logAudit(params: AuditParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) return;

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        entity: params.entity,
        entityId: params.entityId,
        action: params.action,
        oldValue: (sanitize(params.oldValue) ?? undefined) as Prisma.InputJsonValue | undefined,
        newValue: (sanitize(params.newValue) ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // Audit logging should never break the main operation
  }
}

