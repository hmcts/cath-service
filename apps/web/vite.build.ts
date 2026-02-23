import path from "node:path";
import { fileURLToPath } from "node:url";
import { assets as adminPagesAssets } from "@hmcts/admin-pages/config";
import { assets as listTypesCommonAssets } from "@hmcts/list-types-common/config";
import { assets as sjpPressListAssets } from "@hmcts/sjp-press-list/config";
import { assets as systemAdminAssets } from "@hmcts/system-admin-pages/config";
import { assets as verifiedPagesAssets } from "@hmcts/verified-pages/config";
import { createBaseViteConfig } from "@hmcts/web-core";
import { assets as webCoreAssets } from "@hmcts/web-core/config";
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
  listTypesCommonAssets
]);

export default defineConfig(
  mergeConfig(baseConfig, {
    build: {
      rollupOptions: {
        input: {
          ...baseConfig.build?.rollupOptions?.input,
          web_css: path.join(__dirname, "src/assets/css/index.scss"),
          web_js: path.join(__dirname, "src/assets/js/index.ts")
        }
      }
    },
    plugins: [
      viteStaticCopy({
        targets: [
          {
            // Copy app-specific images
            src: "src/assets/images/**/*",
            dest: "images"
          }
        ]
      })
    ]
  })
);
