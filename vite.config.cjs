const path = require("path");
const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react-swc");
const loadComponentTagger = async () => {
  try {
    const mod = await import("lovable-tagger");
    return typeof mod.componentTagger === "function" ? mod.componentTagger : null;
  } catch {
    return null;
  }
};

module.exports = defineConfig(async ({ mode }) => {
  const componentTagger = mode === "development" ? await loadComponentTagger() : null;
  return {
    server: {
      host: "127.0.0.1",
      port: 5173,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), componentTagger && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
