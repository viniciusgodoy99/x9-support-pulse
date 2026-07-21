import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "ping",
  title: "Ping",
  description: "Verifica se o servidor MCP do X9 está online. Retorna 'pong' e o horário do servidor.",
  inputSchema: {
    message: z
      .string()
      .optional()
      .describe("Mensagem opcional a ser ecoada de volta."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: ({ message }) => ({
    content: [
      {
        type: "text",
        text: `pong${message ? ` — ${message}` : ""} @ ${new Date().toISOString()}`,
      },
    ],
  }),
});
