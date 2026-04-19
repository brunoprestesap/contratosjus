"use server";

import { logger } from "@/lib/logger";

type LogClientErrorPayload = {
  message: string;
  digest?: string;
  stack?: string;
  boundary: "global" | "dashboard";
};

export async function logClientError(payload: LogClientErrorPayload) {
  logger.error(
    {
      event: "client.boundary",
      boundary: payload.boundary,
      message: payload.message,
      digest: payload.digest,
      stack: payload.stack,
    },
    "Client error boundary triggered",
  );
}
