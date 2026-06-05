import path from "node:path";
import { fileURLToPath } from "node:url";
import { assets as adminPagesAssets } from "@hmcts/admin-pages/config";
import { assets as listTypesCommonAssets } from "@hmcts/list-types-common/config";
import { assets as sjpPressListAssets } from "@hmcts/sjp-press-list/config";
import { assets as sjpPublicListAssets } from "@hmcts/sjp-public-list/config";
import { assets as systemAdminAssets } from "@hmcts/system-admin-pages/config";
import { assets as verifiedPagesAssets } from "@hmcts/verified-pages/config";
import { assets as webCoreAssets } from "@hmcts/web-core/config";
import { createBaseViteConfig } from "@hmcts/web-core/vite";
import { defineConfig, mergeConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = createBaseViteConfig([
  path.join(__dirname, "src", "assets"),
  webCoreAssets,
  systemAdminAssets,
  verifiedPagesAssets,
  adminPagesAssets,
  sjpPressListAssets,
  sjpPublicListAssets,
  listTypesCommonAssets
]);

const isProduction = process.env.VITE_DEV_BUILD !== "true";

export default defineConfig(
  mergeConfig(baseConfig, {
    build: {
      rollupOptions: {
        input: {
          ...baseConfig.build?.rollupOptions?.input,
          web_css: path.join(__dirname, "src/assets/css/index.scss"),
          web_js: path.join(__dirname, "src/assets/js/index.ts")
        },
        output: {
          entryFileNames: isProduction ? "js/[name]-[hash].js" : "js/[name].js",
          chunkFileNames: isProduction ? "js/[name]-[hash].js" : "js/[name].js",
          assetFileNames: (assetInfo) => {
            const ext = assetInfo.name?.split(".").pop();
            if (ext === "css") return isProduction ? "css/[name]-[hash][extname]" : "css/[name][extname]";
            return isProduction ? "assets/[name]-[hash][extname]" : "assets/[name][extname]";
          }
        }
      }
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            src: "src/pages/**/*.{njk,html}",
            dest: "../pages",
            rename: (_fileName, _fileExtension, fullPath) => {
              const relativePath = fullPath.split("src/pages/")[1];
              return relativePath;
            }
          },
          {
            src: "src/assets/images/**/*",
            dest: "images"
          }
        ]
      })
    ]
  })
);
