variable "product" {
  description = "Product name"
  type        = string
  default     = "cath"
}

variable "env" {
  description = "Environment name (e.g., stg, prod)"
  type        = string
}

variable "subscription" {
  description = "Azure subscription ID"
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

variable "active_directory_group" {
  description = "AD group name for Key Vault access"
  type        = string
  default     = "DTS SDS Developers"
}

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

variable "aks_subscription_id" {
  description = "Azure subscription ID for AKS cluster (passed by CI pipeline)"
  type        = string
  default     = null
}
