variable "env" {
  description = "Environment name (e.g., stg, prod)"
  type        = string
}

variable "product" {
  description = "Product name"
  type        = string
  default     = "cath"
}

variable "component" {
  description = "Component name"
  type        = string
  default     = "cath"
}

variable "key_vault_product" {
  description = "Product name for the shared Key Vault (borrowed from PIP)"
  type        = string
  default     = "pip-ss-kv"
}

variable "subscription" {
  description = "Azure subscription name"
  type        = string
}

variable "aks_subscription_id" {
  description = "Azure subscription ID for AKS cluster (contains network subnets)"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "uksouth"
}

variable "common_tags" {
  description = "Common tags for resources"
  type        = map(string)
  default     = {}
}

# Optional variables - auto-derived from Azure credentials in CI
variable "tenant_id" {
  description = "Azure AD tenant ID (auto-derived from CI credentials)"
  type        = string
  default     = null
}

variable "ci_service_principal_object_id" {
  description = "Azure AD object ID for CI/CD service principal (auto-derived from CI credentials)"
  type        = string
  default     = null
}

variable "builtFrom" {
  description = "GitHub repository URL for tagging (auto-set in CI)"
  type        = string
  default     = null
}
