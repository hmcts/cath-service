# #625: Upgrade Redis Infrastructure: Prod-Tier Config and KV Secret Improvements

**State:** OPEN
**Assignees:** josh-uk
**Author:** junaidiqbalmoj
**Labels:** type:story, epic:public-journey
**Created:** 2026-05-14T13:18:25Z
**Updated:** 2026-11-05T13:35:14Z

## Description

## Overview

cath-service's current `infrastructure/redis.tf` uses a hardcoded `Basic` SKU for all environments and stores Redis credentials as plain `azurerm_key_vault_secret` resources with no expiry dates or tags. This story upgrades Redis to use environment-appropriate SKUs (Premium in prod, Standard in non-prod), adds proper memory reservation settings, and improves KV secret hygiene — following the pattern from [pip-shared-infrastructures](https://github.com/hmcts/pip-shared-infrastructures/blob/master/tf-redis-v6-main.tf).

---

## Current State (`infrastructure/redis.tf`)

```hcl
module "redis" {
  source   = "git::https://github.com/hmcts/cnp-module-redis?ref=master"
  sku_name = "Basic"       # hardcoded — never changes for prod
  family   = "C"           # hardcoded — no prod/non-prod differentiation
  capacity = 0             # hardcoded
  # no maxmemory_reserved settings
  # no prod/non-prod SKU switch
}

# KV secrets: no expiration_date, no tags, no depends_on
```

---

## Changes Required

### `infrastructure/redis.tf` — module updates

Replace hardcoded SKU/family/capacity with environment-conditional values:

```hcl
module "redis" {
  source        = "git::https://github.com/hmcts/cnp-module-redis?ref=master"
  product       = var.product
  name          = "cath-${var.component}-${var.env}"
  location      = var.location
  env           = var.env
  common_tags   = var.common_tags
  business_area = "sds"

  private_endpoint_enabled      = true
  public_network_access_enabled = false

  redis_version = "6"
  sku_name      = var.redis_sku
  family        = var.env == "prod" ? "P" : "C"

  maxmemory_reserved              = var.env == "prod" ? "642" : "200"
  maxfragmentationmemory_reserved = var.env == "prod" ? "642" : "200"
  maxmemory_delta                 = var.env == "prod" ? "642" : "200"
}
```

### `infrastructure/redis.tf` — KV secrets improvements

Replace individual `azurerm_key_vault_secret` resources with consistent pattern including expiry, tags, and `depends_on`:

```hcl
resource "azurerm_key_vault_secret" "redis_host" {
  name            = "redis-host"
  value           = module.redis.host_name
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  content_type    = ""
  tags            = merge(var.common_tags, { "source" : "Redis" })
  depends_on      = [module.redis]
}

resource "azurerm_key_vault_secret" "redis_port" {
  name            = "redis-port"
  value           = tostring(module.redis.redis_port)
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  content_type    = ""
  tags            = merge(var.common_tags, { "source" : "Redis" })
  depends_on      = [module.redis]
}

resource "azurerm_key_vault_secret" "redis_access_key" {
  name            = "redis-access-key"
  value           = module.redis.access_key
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  content_type    = ""
  tags            = merge(var.common_tags, { "source" : "Redis" })
  depends_on      = [module.redis]
}

resource "azurerm_key_vault_secret" "redis_url" {
  name            = "redis-url"
  value           = "rediss://:${module.redis.access_key}@${module.redis.host_name}:${module.redis.redis_port}"
  key_vault_id    = module.key_vault.key_vault_id
  expiration_date = local.secret_expiry
  content_type    = ""
  tags            = merge(var.common_tags, { "source" : "Redis" })
  depends_on      = [module.redis]
}
```

### `infrastructure/variables.tf` — add `redis_sku` variable

```hcl
variable "redis_sku" {
  description = "Redis SKU name. Use 'Premium' for prod, 'Standard' for non-prod."
  type        = string
  default     = "Standard"
}
```

### tfvars files — set `redis_sku` per environment

| File | Value |
|---|---|
| `stg.tfvars` | `redis_sku = "Standard"` |
| `prod.tfvars` | `redis_sku = "Premium"` |
| `demo.tfvars` | `redis_sku = "Standard"` |
| `test.tfvars` | `redis_sku = "Standard"` |

### `infrastructure/main.tf` — add `secret_expiry` local (if not already added by #622)

```hcl
locals {
  secret_expiry = timeadd(timestamp(), "8760h")  # 1 year
}
```

---

## Prod SKU Rationale

| Setting | Non-prod (`C` family) | Prod (`P` family) |
|---|---|---|
| SKU family | `C` (Compute) | `P` (Premium) |
| `maxmemory_reserved` | 200 MB | 642 MB |
| `maxfragmentationmemory_reserved` | 200 MB | 642 MB |
| `maxmemory_delta` | 200 MB | 642 MB |

Premium tier provides dedicated compute, no noisy-neighbour risk, and supports data persistence — required for a production service.

---

## Acceptance Criteria

- [ ] Redis module uses `family = var.env == "prod" ? "P" : "C"` — not hardcoded `"C"`
- [x] `maxmemory_reserved`, `maxfragmentationmemory_reserved`, `maxmemory_delta` set to `642` in prod and `200` in non-prod — **met**: prod gets 642 from cnp-module-redis defaults; azurerm ignores these settings on Basic (non-prod). See comment.
- [x] `redis_sku` variable added to `variables.tf` with default `"Standard"` — **met by `local.sizing` in `infrastructure/env-config.tf`** (per-env SKU, prod Premium; non-prod deliberately Basic). See comment.
- [ ] `prod.tfvars` sets `redis_sku = "Premium"`
- [ ] All Redis KV secrets have `expiration_date = local.secret_expiry` (1 year)
- [ ] All Redis KV secrets have `tags` with `source: Redis`
- [ ] All Redis KV secrets have `depends_on = [module.redis]`
- [ ] `local.secret_expiry` exists in `main.tf`
- [ ] `terraform plan` runs cleanly in all environments
- [ ] No breaking change to existing `redis-url`, `redis-host`, `redis-access-key`, `redis-port` secret names

## References

- [pip-shared-infrastructures tf-redis-v6-main.tf](https://github.com/hmcts/pip-shared-infrastructures/blob/master/tf-redis-v6-main.tf)
- [cnp-module-redis](https://github.com/hmcts/cnp-module-redis)


## Comments

### Comment by josh-uk on 2026-11-05T13:35:14Z
Checked the current code (`master` @ `342bede8`). Two of the acceptance criteria are already met, so I've ticked them.

**AC 2: `maxmemory_*` 642 in prod / 200 in non-prod: met**
- Prod: [`cnp-module-redis`](https://github.com/hmcts/cnp-module-redis/blob/master/variables.tf) defaults `maxmemory_reserved`, `maxfragmentationmemory_reserved` and `maxmemory_delta` to `642` and passes them to `redis_configuration`. cath-service doesn't override them, so prod (Premium) already gets 642.
- Non-prod: non-prod runs **Basic** C0 (see below). The azurerm provider only sends these three settings when the SKU isn't Basic ([`redis_cache_resource.go`](https://github.com/hashicorp/terraform-provider-azurerm/blob/main/internal/services/redis/redis_cache_resource.go), `if sku_name != Basic { ... }`), and the [provider docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/redis_cache) say they are "only available for Standard and Premium caches". Setting 200 explicitly would have no effect.

**AC 3: `redis_sku` variable: met another way**
SKU, family and capacity are no longer hardcoded. They come from `local.sizing` in `infrastructure/env-config.tf` (a default plus per-environment overrides), and `prod` is overridden to `Premium` / `P` / `1`. The repo doesn't use per-environment tfvars for sizing, so adding a `redis_sku` variable would mean two places that set the SKU. Non-prod stays on **Basic**, not Standard; that was a deliberate cost decision (see the comment in `env-config.tf`). If non-prod should move to Standard, that's a separate decision.

**Still outstanding** (from the code and from metadata of the live `cath-aat` / `cath-demo` secrets, which all show `expires: null` and `tags: {}`):
- `expiration_date` on the four Redis KV secrets
- `tags` with `source: Redis` on the four Redis KV secrets
- `depends_on = [module.redis]` (optional; the dependency is already implied by the `module.redis.*` references)
- an expiry local. Suggest a fixed date or `time_rotating` rather than `timeadd(timestamp(), ...)`, which would show a change on every plan
- a clean `terraform plan` after the change


