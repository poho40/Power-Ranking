import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ test: { environment: "node", coverage: { reporter: ["text"] } }, resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "server-only": fileURLToPath(new URL("./src/tests/serverOnlyStub.ts", import.meta.url)) } } });
