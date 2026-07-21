import { defineMcp } from "@lovable.dev/mcp-js";
import pingTool from "./tools/ping";

export default defineMcp({
  name: "x9-mcp",
  title: "X9 do Atendimento — MCP",
  version: "0.1.0",
  instructions:
    "Servidor MCP público do X9 do Atendimento. Use `ping` para verificar conectividade. Novas ferramentas podem ser adicionadas conforme necessário.",
  tools: [pingTool],
});
