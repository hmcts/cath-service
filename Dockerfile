# Single build definition for every app image in the monorepo.
#
#   docker build --target web      -t cath-web .
#   docker build --target api      -t cath-api .
#   docker build --target crons    -t cath-crons .
#   docker build --target postgres -t cath-postgres .

ARG NODE_IMAGE=hmctspublic.azurecr.io/base/node:22-alpine
ARG COREPACK_VERSION=0.36.0

# ---- Toolchain ----
FROM ${NODE_IMAGE} AS toolchain
ARG COREPACK_VERSION
USER root
RUN npm install -g "corepack@${COREPACK_VERSION}" && corepack enable
WORKDIR /opt/app

# ---- Toolchain with chromium (PDF generation) ----
FROM toolchain AS toolchain-chromium
RUN apk add --no-cache chromium

# ---- Install graph ----
# Workspace manifests and lockfile only, so `yarn install` re-runs on dependency
# changes rather than on any source edit.
FROM ${NODE_IMAGE} AS install-graph
USER root
COPY . /src
RUN cd /src \
 && find . -name package.json -not -path './node_modules/*' -not -path '*/node_modules/*' -print \
    | while read -r manifest; do install -D -m 644 "$manifest" "/graph/$manifest"; done \
 && install -D -m 644 yarn.lock /graph/yarn.lock \
 && install -D -m 644 .yarnrc.yml /graph/.yarnrc.yml \
 && if [ -d .yarn ]; then cp -r .yarn /graph/.yarn; fi \
 && install -D -m 644 scripts/install-hooks.js /graph/scripts/install-hooks.js \
 && install -D -m 644 libs/postgres-prisma/prisma.config.ts /graph/libs/postgres-prisma/prisma.config.ts \
 && cp -r libs/postgres-prisma/prisma /graph/libs/postgres-prisma/prisma

# ---- Dev dependencies ----
FROM toolchain AS deps
COPY --from=install-graph --chown=hmcts:hmcts /graph /opt/app
USER hmcts
# Not --immutable: e2e-tests is a workspace in yarn.lock but excluded from the
# build context. Lockfile drift is caught by the detect-affected job instead.
RUN yarn install

# ---- Build ----
FROM deps AS build
COPY --chown=hmcts:hmcts . /opt/app
RUN yarn build
# Dev trees; each runtime stage installs its own production tree.
RUN find apps libs \( -name node_modules -o -name .turbo \) -type d -prune -exec rm -rf {} +

# ---- Web runtime ----
FROM toolchain-chromium AS web
COPY --from=install-graph --chown=hmcts:hmcts /graph /opt/app
USER hmcts
RUN yarn workspaces focus @hmcts/web --production
# Whole directory, not a list of subdirectories: node-config reads ./config and
# getPropertiesVolumeSecrets reads ../helm/values.yaml at startup, so a missing
# line here is a crash on deploy that no test catches.
COPY --from=build --chown=hmcts:hmcts /opt/app/apps/web ./apps/web
COPY --from=build --chown=hmcts:hmcts /opt/app/libs ./libs
# Not hoisted into toolchain: that sits above `build`, where the production
# condition resolves @hmcts/* to dist/ files the compile has not written yet.
ENV NODE_ENV=production
ENV NODE_OPTIONS='--conditions=production'

WORKDIR /opt/app/apps/web
EXPOSE 8080
CMD ["node", "dist/server.js"]

# ---- API runtime ----
FROM toolchain-chromium AS api
COPY --from=install-graph --chown=hmcts:hmcts /graph /opt/app
USER hmcts
RUN yarn workspaces focus @hmcts/api --production
COPY --from=build --chown=hmcts:hmcts /opt/app/apps/api ./apps/api
COPY --from=build --chown=hmcts:hmcts /opt/app/libs ./libs
ENV NODE_ENV=production
ENV NODE_OPTIONS='--conditions=production'

WORKDIR /opt/app/apps/api
EXPOSE 3001
CMD ["node", "dist/server.js"]

# ---- Crons runtime ----
FROM toolchain AS crons
COPY --from=install-graph --chown=hmcts:hmcts /graph /opt/app
USER hmcts
RUN yarn workspaces focus @hmcts/crons --production
COPY --from=build --chown=hmcts:hmcts /opt/app/apps/crons ./apps/crons
COPY --from=build --chown=hmcts:hmcts /opt/app/libs ./libs
ENV NODE_ENV=production
ENV NODE_OPTIONS='--conditions=production'

WORKDIR /opt/app/apps/crons
CMD ["node", "dist/index.js"]

# ---- Postgres migration runner ----
# start.sh runs the TypeScript sources through tsx, so this ships source and
# does not depend on `build`.
FROM toolchain AS postgres
COPY --from=install-graph --chown=hmcts:hmcts /graph /opt/app
USER hmcts
RUN yarn workspaces focus @hmcts/postgres
COPY --chown=hmcts:hmcts tsconfig.json ./tsconfig.json
COPY --chown=hmcts:hmcts libs ./libs
COPY --chown=hmcts:hmcts apps/postgres ./apps/postgres
ENV NODE_ENV=production

WORKDIR /opt/app/apps/postgres
CMD ["sh", "./start.sh"]
