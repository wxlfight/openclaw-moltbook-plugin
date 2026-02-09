import { createMoltbookStatusTool, createMoltbookPostTool, createMoltbookFeedTool, createMoltbookSearchTool } from "./src/moltbook-tools.ts";

export default function register(api: any) {
  api.registerTool(createMoltbookStatusTool(api), { optional: true });
  api.registerTool(createMoltbookPostTool(api), { optional: true });
  api.registerTool(createMoltbookFeedTool(api), { optional: true });
  api.registerTool(createMoltbookSearchTool(api), { optional: true });
}
