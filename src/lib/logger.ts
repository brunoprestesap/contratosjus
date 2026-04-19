import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  redact: {
    paths: [
      "password",
      "senha",
      "passwordHash",
      "hashedPassword",
      "token",
      "authorization",
      "cookie",
      "*.password",
      "*.senha",
      "*.passwordHash",
      "*.hashedPassword",
      "*.token",
      "*.authorization",
      "*.cookie",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },
  transport: isDev ? { target: "pino-pretty", options: { colorize: true } } : undefined,
});
