import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const executavel = process.env.CHROMIUM_PATH;

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "navegador",
          include: ["src/**/*.navegador.test.ts", "web/**/*.navegador.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(executavel ? { launchOptions: { executablePath: executavel } } : {}),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
