variable "env" {
  description = "Environment name (e.g., demo, test, ithc, stg)"
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

variable "product_group_name" {
  description = "AD group name for Key Vault access"
  type        = string
  default     = "DTS SDS Developers"
}

variable "active_directory_group" {
  description = "AD group name for bootstrap Key Vault access"
  type        = string
  default     = "DTS SDS Developers"
}

variable "jenkins_AAD_objectId" {
  description = "Object ID of the Jenkins/CI service principal for Key Vault access"
  type        = string
  default     = ""
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

variable "e2e_oidc_object_id" {
  description = "Azure AD object ID for the GitHub Actions OIDC app registration (AZURE_CLIENT_ID) used by e2e test workflows"
  type        = string
  default     = "9a5a8d6f-c926-46e3-89d4-ed3472ea0edc"
}

variable "builtFrom" {
  description = "GitHub repository URL for tagging (auto-set in CI)"
  type        = string
  default     = null
}
