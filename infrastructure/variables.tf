variable "env" {
  description = "Environment name (e.g., aat, prod)"
  type        = string
}

variable "product" {
  description = "Product name"
  type        = string
}

variable "component" {
  description = "Component name for resource group naming"
  type        = string
  default     = "cath"
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
# Only needed if creating resources (e.g., Key Vault)

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

variable "e2e_oidc_object_id" {
  description = "Azure AD object ID for GitHub Actions OIDC app registration used by E2E tests"
  type        = string
  default     = "9a5a8d6f-c926-46e3-89d4-ed3472ea0edc"
}

variable "sa_account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
}

variable "sa_account_kind" {
  description = "Storage account kind"
  type        = string
  default     = "StorageV2"
}

variable "sa_account_replication_type" {
  description = "Storage account replication type"
  type        = string
  default     = "RAGRS"
}

variable "sa_access_tier" {
  description = "Storage account access tier"
  type        = string
  default     = "Cool"
}
