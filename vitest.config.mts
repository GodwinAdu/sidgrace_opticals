import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
        // Integration tests (DB-backed) run via their own config: `npm run test:integration`.
        exclude: ["tests/integration/**", "**/node_modules/**", "**/dist/**"],
    },
    resolve: {
        // Mirror the tsconfig "@/*" -> "./*" path alias so tests can import
        // modules that use the alias (e.g. the encounter provider pulling in
        // "@/lib/clinical/encounter"). Additive and alias-only: no existing
        // test relies on this, so it changes no current behavior.
        alias: {
            "@": fileURLToPath(new URL(".", import.meta.url)),
        },
    },
});
