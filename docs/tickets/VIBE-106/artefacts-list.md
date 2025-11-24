# CATH Service Artefacts Inventory

This document provides a comprehensive catalogue of all CATH (Claude AI Tooling for HMCTS) service artefacts, organized by category and intended audience. This inventory serves as the central reference for all project documentation, governance materials, technical specifications, and deliverables.

**Last Updated**: 2025-11-24
**Owner**: CATH Governance Team
**Version**: 1.0
**Status**: Published

---

## Table of Contents

1. [Overview](#overview)
2. [How to Use This Inventory](#how-to-use-this-inventory)
3. [Artefact Categories](#artefact-categories)
4. [Distribution Matrix](#distribution-matrix)
5. [Master Artefact Registry](#master-artefact-registry)
6. [Access and Permissions](#access-and-permissions)
7. [Maintenance and Updates](#maintenance-and-updates)

---

## Overview

The CATH Service produces various types of artefacts across governance, technical, educational, and operational domains. This inventory catalogues all significant artefacts to ensure stakeholders can easily discover and access relevant materials.

### Purpose

- Provide a single source of truth for all CATH artefacts
- Enable efficient discovery and navigation of documentation
- Support governance transparency and accountability
- Facilitate stakeholder access to relevant materials
- Establish clear ownership and version control

### Scope

This inventory includes:
- Governance documentation and policies
- Risk management materials
- Technical documentation and architecture
- Implementation plans and specifications
- Educational and training materials
- Meeting records and decision logs
- Research and evidence materials
- Stakeholder communication materials

---

## How to Use This Inventory

### Finding What You Need

1. **By Category**: Browse the [Artefact Categories](#artefact-categories) section below
2. **By Audience**: Check the [Distribution Matrix](#distribution-matrix) to see what's relevant for your role
3. **By Artefact Type**: Use the master registry to filter by document type
4. **By Search**: Use your browser's find function (Ctrl+F / Cmd+F) to search for keywords

### Understanding Entries

Each artefact entry includes:
- **ID**: Unique identifier (e.g., ARF-CATH-001)
- **Title**: Full document name
- **Description**: Brief summary of content and purpose
- **Category**: Primary classification
- **Audience**: Intended stakeholder groups
- **Location**: Where to access the artefact
- **Status**: Current state (Draft, Review, Published, Archived)
- **Owner**: Person responsible for maintenance

---

## Artefact Categories

### 1. Project Foundation & Core Documentation
### 2. Governance & Risk Management
### 3. Technical Documentation & Architecture
### 4. Planning & Implementation
### 5. Educational & Training Materials
### 6. Quality Assurance & Testing
### 7. Stakeholder Communications
### 8. Research & Evidence

---

## Master Artefact Registry

### 1. Project Foundation & Core Documentation

#### ARF-CATH-001: Project README
- **Title**: HMCTS Express Monorepo Template README
- **Location**: `/README.md`
- **Description**: Production-ready Node.js starter documentation covering setup, features, architecture, and usage for building HMCTS digital services using Express.js, TypeScript and GOV.UK Design System.
- **Category**: Project Foundation
- **Type**: Technical Documentation
- **Audience**: All Stakeholders, Development Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Last Updated**: 2025-11-24
- **Key Content**:
  - Project overview and features
  - Getting started and prerequisites
  - Development setup instructions
  - Azure authentication setup
  - HTTPS local development
  - Docker services configuration
  - Configuration and secrets management
  - Module development guidelines
  - Testing strategy
- **Distribution**: GitHub (Public), Confluence, SharePoint

#### ARF-CATH-002: Architecture Documentation
- **Title**: CATH Service Architecture Overview
- **Location**: `/docs/ARCHITECTURE.md`
- **Description**: Comprehensive system architecture covering high-level design, monorepo structure, module auto-discovery, core components, shared libraries, and technology stack.
- **Category**: Project Foundation
- **Type**: Technical Architecture
- **Audience**: Development Teams, Technical Leadership, AI Steering Group
- **Owner**: Technical Lead
- **Status**: Published
- **Version**: Current
- **Last Updated**: 2025-11-24
- **Key Content**:
  - Executive summary
  - High-level architecture diagram
  - Monorepo structure
  - Module auto-discovery system
  - Core components (web frontend, REST API, database layer)
  - Shared libraries documentation
  - Azure Key Vault integration
  - Scalability design
  - Technology stack summary
- **Distribution**: GitHub (Public), Confluence, SharePoint, AI Steering Group Package

#### ARF-CATH-003: Development Standards (CLAUDE.md)
- **Title**: HMCTS Monorepo AI Development Guide
- **Location**: `/CLAUDE.md`
- **Description**: Comprehensive development standards, naming conventions, module patterns, testing strategy, code quality requirements, and security guidelines for AI-assisted development.
- **Category**: Project Foundation
- **Type**: Development Standards
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Last Updated**: 2025-11-24
- **Key Content**:
  - Core development commands
  - Naming conventions (database, TypeScript, files, APIs)
  - Module development guidelines
  - Testing strategy
  - Code quality standards
  - Security requirements
  - Communication style guide
  - Core principles (YAGNI, KISS, functional style)
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-004: Agent Development Guide
- **Title**: Claude Code CLI Cheat Sheet
- **Location**: `/docs/AGENT.md`
- **Description**: Quick reference guide for Claude Code CLI covering keyboard shortcuts, commands, workflows, and AI agent operations.
- **Category**: Project Foundation
- **Type**: Reference Guide
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Last Updated**: 2025-11-24
- **Key Content**:
  - Keyboard shortcuts
  - Quick commands and slash commands
  - Context management
  - Orchestrated workflows (wf-plan, wf-implement, wf-review)
  - One-shot workflows (os-small, os-large)
  - Project custom commands
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-005: Demo Guide
- **Title**: CATH Service Demonstration Guide
- **Location**: `/docs/DEMO.md`
- **Description**: Guide for demonstrating CATH service capabilities and features to stakeholders.
- **Category**: Project Foundation
- **Type**: Demonstration Guide
- **Audience**: Project Team, Leadership, AI Steering Group
- **Owner**: Project Team
- **Status**: Published
- **Version**: Current
- **Last Updated**: 2025-11-24
- **Distribution**: SharePoint, Confluence, AI Steering Group Package

---

### 2. Governance & Risk Management

#### ARF-CATH-006: Risk Register (VIBE-95)
- **Title**: CATH Coding Risks and Mitigations Register
- **Location**: `/docs/tickets/VIBE-95/` (planned)
- **JIRA**: VIBE-95
- **Description**: Comprehensive identification and assessment of risks associated with AI-assisted coding in HMCTS environment, including likelihood, impact scores, and monitoring mechanisms.
- **Category**: Governance & Risk Management
- **Type**: Risk Register
- **Audience**: AI Steering Group, Project Team, Leadership
- **Owner**: Governance Team
- **Status**: Planned
- **Version**: To be created
- **Key Content**:
  - Code quality risks
  - Data privacy and security risks
  - Dependency management risks
  - Workflow integration risks
  - Governance and compliance risks
  - Operational risks
  - Likelihood and impact assessments
  - Risk scoring and prioritization
- **Distribution**: SharePoint (Internal), Confluence, AI Steering Group Package (Full), Leadership Package (Summary)

#### ARF-CATH-007: Mitigation Plans (VIBE-96)
- **Title**: Updated Mitigations for VIBE Coding Risks
- **Location**: `/docs/tickets/VIBE-96/` (in progress)
- **JIRA**: VIBE-96
- **Description**: Detailed mitigation strategies, controls, and action plans for identified risks in the CATH risk register.
- **Category**: Governance & Risk Management
- **Type**: Mitigation Plan
- **Audience**: AI Steering Group, Project Team, Leadership
- **Owner**: Governance Team
- **Status**: In Progress
- **Version**: Draft
- **Key Content**:
  - Mitigation strategies for each identified risk
  - Control mechanisms and safeguards
  - Implementation plans and timelines
  - Ownership and responsibility assignments
  - Monitoring and review processes
  - Residual risk assessment
- **Distribution**: SharePoint (Internal), Confluence, AI Steering Group Package (Summary), Leadership Package (Summary)

#### ARF-CATH-008: AI Usage Policy (VIBE-97)
- **Title**: AI-Assisted Development Policy
- **Location**: `/docs/tickets/VIBE-97/` (planned)
- **JIRA**: VIBE-97
- **Description**: Comprehensive policy governing the use of AI assistance in software development at HMCTS, covering acceptable use, data handling, code review, and compliance requirements.
- **Category**: Governance & Risk Management
- **Type**: Policy Document
- **Audience**: All Stakeholders, Development Teams, Leadership
- **Owner**: Governance Team
- **Status**: Planned
- **Version**: To be created
- **Key Content**:
  - Acceptable use guidelines
  - Data privacy and security requirements
  - Code review and validation standards
  - Human oversight requirements
  - Compliance with HMCTS standards
  - Training and competency requirements
  - Approval processes
- **Distribution**: SharePoint (Internal/Public sections), Confluence, Development Teams Package (Full), Organization Package (Public Summary)

#### ARF-CATH-009: Code Review Standards (VIBE-98)
- **Title**: AI Code Review Guidelines
- **Location**: `/docs/tickets/VIBE-98/` (planned)
- **JIRA**: VIBE-98
- **Description**: Standards and procedures for reviewing AI-generated code, including quality criteria, security checks, and approval workflows.
- **Category**: Governance & Risk Management
- **Type**: Standards Document
- **Audience**: Development Teams, Project Team
- **Owner**: Technical Lead
- **Status**: Planned
- **Version**: To be created
- **Key Content**:
  - Review checklist and criteria
  - Security verification procedures
  - Performance and quality standards
  - Documentation requirements
  - Testing requirements
  - Approval workflow
- **Distribution**: SharePoint (Internal), Confluence, Development Teams Package (Full), AI Steering Group Package (Summary)

#### ARF-CATH-010: KPI04 Evidence Pack (VIBE-99)
- **Title**: KPI04 Compliance Evidence Package
- **Location**: `/docs/tickets/VIBE-99/` (planned)
- **JIRA**: VIBE-99
- **Description**: Comprehensive evidence pack demonstrating compliance with KPI04 requirements for AI governance and responsible development.
- **Category**: Governance & Risk Management
- **Type**: Evidence Pack
- **Audience**: AI Steering Group, Leadership, Auditors
- **Owner**: Governance Team
- **Status**: Planned
- **Version**: To be created
- **Key Content**:
  - Compliance evidence and artifacts
  - Audit trails and logs
  - Governance framework documentation
  - Risk management evidence
  - Quality assurance records
  - Stakeholder engagement evidence
- **Distribution**: SharePoint (Restricted), AI Steering Group Package (Full), Leadership Package (Executive Summary)

#### ARF-CATH-011: Milestone Materials (VIBE-100)
- **Title**: CATH Pilot Milestone Documentation
- **Location**: `/docs/tickets/VIBE-100/` (planned)
- **JIRA**: VIBE-100
- **Description**: Key milestone deliverables, presentations, and status reports for the CATH pilot project.
- **Category**: Governance & Risk Management
- **Type**: Milestone Reports
- **Audience**: AI Steering Group, Leadership, Project Team
- **Owner**: Project Team
- **Status**: Planned
- **Version**: To be created
- **Key Content**:
  - Milestone presentations
  - Progress reports
  - Deliverable summaries
  - Lessons learned
  - Next steps and recommendations
- **Distribution**: SharePoint (Internal), AI Steering Group Package (Full), Leadership Package (Full)

#### ARF-CATH-012: Decision Log (VIBE-107)
- **Title**: CATH Governance Decision Log
- **Location**: `/docs/tickets/VIBE-107/` (planned)
- **JIRA**: VIBE-107
- **Description**: Comprehensive log of key decisions made during the CATH pilot, including rationale, alternatives considered, and approval records.
- **Category**: Governance & Risk Management
- **Type**: Decision Log
- **Audience**: AI Steering Group, Project Team, Leadership
- **Owner**: Governance Team
- **Status**: Planned
- **Version**: To be created
- **Key Content**:
  - Decision records with dates and owners
  - Rationale and context
  - Alternatives considered
  - Approval and sign-off records
  - Impact assessment
- **Distribution**: SharePoint (Internal), Confluence, AI Steering Group Package (Full), Leadership Package (Summary)

---

### 3. Technical Documentation & Architecture

#### ARF-CATH-013: Simple Router Library
- **Title**: Simple Router Documentation
- **Location**: `/libs/simple-router/README.md`
- **Description**: Documentation for the file-system based routing library inspired by Next.js, covering features, usage, and implementation patterns.
- **Category**: Technical Documentation
- **Type**: Library Documentation
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-014: PostgreSQL Database Schema
- **Title**: Postgres Database Documentation
- **Location**: `/apps/postgres/README.md`
- **Description**: Database schema documentation, Prisma ORM setup, migration procedures, and data model descriptions.
- **Category**: Technical Documentation
- **Type**: Database Documentation
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-015: Cloud Native Platform Library
- **Title**: Cloud Native Platform Integration Guide
- **Location**: `/libs/cloud-native-platform/` (code documentation)
- **Description**: Documentation for Azure cloud integration, health checks, properties volume, Key Vault integration, and Application Insights.
- **Category**: Technical Documentation
- **Type**: Integration Guide
- **Audience**: Development Teams, Infrastructure Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-016: Express GOV.UK Starter Library
- **Title**: Express GOV.UK Starter Documentation
- **Location**: `/libs/express-govuk-starter/` (code documentation)
- **Description**: Documentation for GOV.UK Design System integration, Nunjucks configuration, security headers, session management, and asset pipeline.
- **Category**: Technical Documentation
- **Type**: Integration Guide
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

---

### 4. Planning & Implementation

#### ARF-CATH-017: VIBE-69 Specification
- **Title**: VIBE-69 Technical Specification
- **Location**: `/docs/tickets/VIBE-69/specification.md`
- **JIRA**: VIBE-69
- **Description**: Detailed technical specification for VIBE-69 ticket implementation.
- **Category**: Planning & Implementation
- **Type**: Technical Specification
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-018: VIBE-69 Tasks
- **Title**: VIBE-69 Implementation Tasks
- **Location**: `/docs/tickets/VIBE-69/tasks.md`
- **JIRA**: VIBE-69
- **Description**: Task breakdown and implementation checklist for VIBE-69.
- **Category**: Planning & Implementation
- **Type**: Task List
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-019: VIBE-69 Review
- **Title**: VIBE-69 Implementation Review
- **Location**: `/docs/tickets/VIBE-69/review.md`
- **JIRA**: VIBE-69
- **Description**: Code review notes and implementation review for VIBE-69.
- **Category**: Planning & Implementation
- **Type**: Review Document
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-020: VIBE-69 Prompts
- **Title**: VIBE-69 AI Prompts Documentation
- **Location**: `/docs/tickets/VIBE-69/prompts.md`
- **JIRA**: VIBE-69
- **Description**: Documentation of AI prompts used during VIBE-69 implementation.
- **Category**: Planning & Implementation
- **Type**: AI Documentation
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-021: VIBE-125 Specification
- **Title**: VIBE-125 Technical Specification
- **Location**: `/docs/tickets/VIBE-125/specification.md`
- **JIRA**: VIBE-125
- **Description**: Detailed technical specification for VIBE-125 ticket implementation.
- **Category**: Planning & Implementation
- **Type**: Technical Specification
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-022: VIBE-125 Tasks
- **Title**: VIBE-125 Implementation Tasks
- **Location**: `/docs/tickets/VIBE-125/tasks.md`
- **JIRA**: VIBE-125
- **Description**: Task breakdown and implementation checklist for VIBE-125.
- **Category**: Planning & Implementation
- **Type**: Task List
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-023: VIBE-233 Specification
- **Title**: VIBE-233 Technical Specification
- **Location**: `/docs/tickets/VIBE-233/specification.md`
- **JIRA**: VIBE-233
- **Description**: Detailed technical specification for VIBE-233 ticket implementation.
- **Category**: Planning & Implementation
- **Type**: Technical Specification
- **Audience**: Development Teams, Project Team
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-024: VIBE-106 Specification
- **Title**: Artefacts Inventory Specification
- **Location**: `/docs/tickets/VIBE-106/specification.md`
- **JIRA**: VIBE-106
- **Description**: Requirements and deliverables specification for creating comprehensive artefact catalogue and distribution system.
- **Category**: Planning & Implementation
- **Type**: Specification
- **Audience**: Project Team, Governance Team
- **Owner**: Governance Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), SharePoint, Confluence

#### ARF-CATH-025: VIBE-106 Implementation Plan
- **Title**: Artefacts Inventory Implementation Plan
- **Location**: `/docs/tickets/VIBE-106/plan.md`
- **JIRA**: VIBE-106
- **Description**: Detailed 8-phase implementation plan covering inventory, metadata, SharePoint organization, Confluence documentation, distribution packages, navigation tools, communication rollout, and maintenance framework.
- **Category**: Planning & Implementation
- **Type**: Implementation Plan
- **Audience**: Project Team, Governance Team
- **Owner**: Governance Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), SharePoint, Confluence

#### ARF-CATH-026: VIBE-106 Tasks
- **Title**: Artefacts Inventory Task List
- **Location**: `/docs/tickets/VIBE-106/tasks.md`
- **JIRA**: VIBE-106
- **Description**: Comprehensive task breakdown for artefact inventory, SharePoint organization, Confluence documentation, distribution packages, and navigation guide creation.
- **Category**: Planning & Implementation
- **Type**: Task List
- **Audience**: Project Team, Governance Team
- **Owner**: Governance Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), SharePoint, Confluence

#### ARF-CATH-027: VIBE-106 Artefacts List (This Document)
- **Title**: CATH Service Artefacts Inventory
- **Location**: `/docs/tickets/VIBE-106/artefacts-list.md`
- **JIRA**: VIBE-106
- **Description**: Comprehensive master catalogue of all CATH service artefacts with metadata, categorization, and distribution information.
- **Category**: Planning & Implementation
- **Type**: Master Registry
- **Audience**: All Stakeholders
- **Owner**: Governance Team
- **Status**: Published
- **Version**: 1.0
- **Distribution**: GitHub (Public), SharePoint (Primary), Confluence, All Distribution Packages

---

### 5. Educational & Training Materials

#### ARF-CATH-028: Educational Materials - Satisfaction & Trust (VIBE-187)
- **Title**: AI Satisfaction and Trust Metrics Educational Materials
- **Location**: `/docs/tickets/VIBE-187/` (in progress)
- **JIRA**: VIBE-187
- **Description**: Educational materials covering satisfaction metrics, trust building, user feedback analysis, and stakeholder engagement for AI systems.
- **Category**: Educational & Training
- **Type**: Educational Materials
- **Audience**: Development Teams, Project Team, Organization
- **Owner**: Education Team
- **Status**: In Progress
- **Version**: Draft
- **Key Content**:
  - Satisfaction measurement frameworks
  - Trust metrics and indicators
  - User feedback collection and analysis
  - Stakeholder engagement strategies
  - Best practices for building trust in AI systems
- **Distribution**: SharePoint (Public), Confluence, Development Teams Package (Full), Organization Package (Full)

#### ARF-CATH-029: Educational Materials - Quality Metrics (VIBE-188)
- **Title**: AI Quality Metrics Educational Materials
- **Location**: `/docs/tickets/VIBE-188/` (in progress)
- **JIRA**: VIBE-188
- **Description**: Educational materials covering quality metrics, code quality assessment, testing strategies, and quality assurance for AI-assisted development.
- **Category**: Educational & Training
- **Type**: Educational Materials
- **Audience**: Development Teams, Project Team, Organization
- **Owner**: Education Team
- **Status**: In Progress
- **Version**: Draft
- **Key Content**:
  - Code quality metrics and KPIs
  - Quality assurance frameworks
  - Testing strategies for AI-generated code
  - Defect detection and prevention
  - Quality improvement processes
- **Distribution**: SharePoint (Public), Confluence, Development Teams Package (Full), Organization Package (Full)

#### ARF-CATH-030: Educational Materials - Efficiency (VIBE-189)
- **Title**: AI Efficiency Metrics Educational Materials
- **Location**: `/docs/tickets/VIBE-189/` (in progress)
- **JIRA**: VIBE-189
- **Description**: Educational materials covering efficiency metrics, productivity measurement, time savings analysis, and ROI assessment for AI-assisted development.
- **Category**: Educational & Training
- **Type**: Educational Materials
- **Audience**: Development Teams, Leadership, Project Team, Organization
- **Owner**: Education Team
- **Status**: In Progress
- **Version**: Draft
- **Key Content**:
  - Efficiency metrics and measurement
  - Productivity tracking frameworks
  - Time savings analysis methodologies
  - Cost-benefit analysis
  - ROI calculation and reporting
- **Distribution**: SharePoint (Public), Confluence, Development Teams Package (Full), Leadership Package (Summary), Organization Package (Full)

---

### 6. Quality Assurance & Testing

#### ARF-CATH-031: End-to-End Test Suite
- **Title**: Playwright E2E Test Documentation
- **Location**: `/e2e-tests/` (code with inline documentation)
- **Description**: Comprehensive end-to-end testing suite using Playwright for user journey validation and accessibility testing.
- **Category**: Quality Assurance
- **Type**: Test Documentation
- **Audience**: Development Teams, QA Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-032: CI/CD Pipeline Configuration
- **Title**: GitHub Actions Workflows
- **Location**: `/.github/workflows/` (code)
- **Description**: Continuous integration and deployment pipeline configuration including security scanning, testing, and deployment automation.
- **Category**: Quality Assurance
- **Type**: Infrastructure as Code
- **Audience**: Development Teams, Infrastructure Teams
- **Owner**: Development Team
- **Status**: Published
- **Version**: Current
- **Key Content**:
  - Dependency scanning
  - SonarQube SAST analysis
  - Claude security scans
  - Automated testing
  - Deployment workflows
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

---

### 7. Stakeholder Communications

#### ARF-CATH-033: Email Notification Backend (VIBE-221)
- **Title**: Email Notification System Specification
- **Location**: `/docs/tickets/VIBE-221/` (planned)
- **JIRA**: VIBE-221
- **Description**: Technical specification for email notification backend system supporting user communications and alerts.
- **Category**: Stakeholder Communications
- **Type**: Technical Specification
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: Planned
- **Version**: To be created
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-034: Email Subscriptions (VIBE-192)
- **Title**: Email Subscription Management Specification
- **Location**: `/docs/tickets/VIBE-192/` (in progress)
- **JIRA**: VIBE-192
- **Description**: Technical specification for user email subscription preferences and management system.
- **Category**: Stakeholder Communications
- **Type**: Technical Specification
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: In Progress
- **Version**: Draft
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-035: User Unsubscribe (VIBE-196)
- **Title**: Verified User Unsubscribe Flow
- **Location**: `/docs/tickets/VIBE-196/` (in progress)
- **JIRA**: VIBE-196
- **Description**: Technical specification for secure user unsubscribe functionality with verification.
- **Category**: Stakeholder Communications
- **Type**: Technical Specification
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: In Progress
- **Version**: Draft
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

---

### 8. Research & Evidence

#### ARF-CATH-036: Blob Ingestion System (VIBE-209)
- **Title**: Blob Storage Ingestion Specification
- **Location**: `/docs/tickets/VIBE-209/` (planned)
- **JIRA**: VIBE-209
- **Description**: Technical specification for Azure Blob Storage integration and data ingestion system.
- **Category**: Research & Evidence
- **Type**: Technical Specification
- **Audience**: Development Teams
- **Owner**: Development Team
- **Status**: Planned
- **Version**: To be created
- **Distribution**: GitHub (Public), Confluence, Development Teams Package

#### ARF-CATH-037: Accessibility Statement (VIBE-236)
- **Title**: CATH Service Accessibility Statement
- **Location**: `/docs/tickets/VIBE-236/` (in progress)
- **JIRA**: VIBE-236
- **Description**: Comprehensive accessibility statement documenting WCAG 2.2 AA compliance, accessibility features, known issues, and contact information.
- **Category**: Research & Evidence
- **Type**: Compliance Document
- **Audience**: All Stakeholders, Public
- **Owner**: Development Team
- **Status**: In Progress
- **Version**: Draft
- **Distribution**: SharePoint (Public), Confluence, Organization Package (Full), Web Application

#### ARF-CATH-038: Cookie Policy (VIBE-241)
- **Title**: CATH Service Cookie Policy
- **Location**: `/docs/tickets/VIBE-241/` (in progress)
- **JIRA**: VIBE-241
- **Description**: Detailed cookie policy explaining cookie usage, types, purposes, and user controls for the CATH service.
- **Category**: Research & Evidence
- **Type**: Policy Document
- **Audience**: All Stakeholders, Public
- **Owner**: Legal/Compliance Team
- **Status**: In Progress
- **Version**: Draft
- **Distribution**: SharePoint (Public), Confluence, Organization Package (Full), Web Application

---

## Distribution Matrix

This matrix maps artefacts to stakeholder audiences, indicating the appropriate distribution package and access level for each group.

### Legend
- **Full**: Complete artefact with all details
- **Summary**: Key points and decisions (2-4 pages)
- **Executive**: High-level overview (1-2 pages)
- **Public**: External-facing version
- **Relevant**: Specific sections applicable to audience
- **-**: Not distributed to this audience

### Distribution by Stakeholder Group

| Artefact ID | Artefact Title | AI Steering Group | Leadership | Development Teams | Project Team | Organization |
|-------------|----------------|-------------------|------------|-------------------|--------------|--------------|
| ARF-CATH-001 | Project README | Summary | Summary | Full | Full | Public |
| ARF-CATH-002 | Architecture Documentation | Full | Summary | Full | Full | - |
| ARF-CATH-003 | Development Standards | - | - | Full | Full | - |
| ARF-CATH-004 | Agent Development Guide | - | - | Full | Full | - |
| ARF-CATH-005 | Demo Guide | Full | Full | Full | Full | - |
| ARF-CATH-006 | Risk Register | Full | Summary | Summary | Full | - |
| ARF-CATH-007 | Mitigation Plans | Summary | Summary | Relevant | Full | - |
| ARF-CATH-008 | AI Usage Policy | Summary | Summary | Full | Full | Public |
| ARF-CATH-009 | Code Review Standards | Summary | - | Full | Full | - |
| ARF-CATH-010 | KPI04 Evidence Pack | Full | Executive | - | Full | - |
| ARF-CATH-011 | Milestone Materials | Full | Full | - | Full | - |
| ARF-CATH-012 | Decision Log | Full | Summary | - | Full | - |
| ARF-CATH-013 | Simple Router Library | - | - | Full | Full | - |
| ARF-CATH-014 | PostgreSQL Documentation | - | - | Full | Full | - |
| ARF-CATH-015 | Cloud Native Platform | - | - | Full | Full | - |
| ARF-CATH-016 | Express GOV.UK Starter | - | - | Full | Full | - |
| ARF-CATH-017-027 | VIBE Ticket Documentation | - | - | Relevant | Full | - |
| ARF-CATH-028 | Educational - Satisfaction | Summary | Summary | Full | Full | Full |
| ARF-CATH-029 | Educational - Quality | Summary | Summary | Full | Full | Full |
| ARF-CATH-030 | Educational - Efficiency | Summary | Summary | Full | Full | Full |
| ARF-CATH-031 | E2E Test Suite | - | - | Full | Full | - |
| ARF-CATH-032 | CI/CD Pipeline | - | - | Full | Full | - |
| ARF-CATH-033-035 | Communication Systems | - | - | Relevant | Relevant | - |
| ARF-CATH-036 | Blob Ingestion | - | - | Relevant | Relevant | - |
| ARF-CATH-037 | Accessibility Statement | Summary | Summary | Full | Full | Full |
| ARF-CATH-038 | Cookie Policy | - | - | Full | Full | Full |

### Stakeholder Groups Defined

**AI Steering Group**
- Role: Strategic oversight and governance
- Needs: High-level governance, risks, compliance, ROI
- Access Level: Full governance materials, executive summaries of technical materials

**Leadership**
- Role: Executive decision-making and resource allocation
- Needs: Status, risks, ROI, strategic decisions
- Access Level: Executive summaries and dashboards

**Development Teams**
- Role: Technical implementation and code development
- Needs: Technical documentation, standards, tools, training
- Access Level: Full technical documentation and relevant governance materials

**Project Team**
- Role: Day-to-day project execution and coordination
- Needs: All project materials, plans, tasks, governance
- Access Level: Full access to all materials

**Organization**
- Role: Broader HMCTS stakeholders and public
- Needs: Public-facing information, educational materials, policies
- Access Level: Public summaries and educational materials

---

## Access and Permissions

### Primary Repository Locations

**GitHub Repository**
- Location: `https://github.com/hmcts/cath-service` (example URL)
- Access: Public for published materials, team access for work in progress
- Purpose: Source of truth for code and technical documentation

**SharePoint Library**
- Location: `SharePoint > HMCTS > CATH AI Governance`
- Access: HMCTS organization with folder-level permissions
- Purpose: Primary document repository for governance and project materials
- Structure:
  ```
  CATH AI Governance/
  ├── Governance and Planning/
  ├── Policies and Standards/
  ├── Technical Documentation/
  ├── Evidence and Research/
  ├── Training and Education/
  ├── Reports and Communications/
  └── Reference/
  ```

**Confluence Space**
- Location: `Confluence > CATH AI Governance`
- Access: HMCTS organization with space permissions
- Purpose: Wiki-style knowledge base for searchable documentation
- Features: Pages for major artefacts, extensive cross-linking, search optimization

### Permission Levels

**Public**
- Accessible to general public
- Examples: README, public-facing policies, accessibility statement, cookie policy
- Location: GitHub public repository, public SharePoint folder

**Internal**
- Accessible to HMCTS organization
- Examples: Most governance documents, technical documentation, educational materials
- Location: SharePoint, Confluence, GitHub (internal)

**Restricted**
- Accessible to project team and specific stakeholders
- Examples: KPI04 evidence pack, internal risk assessments, draft documents
- Location: SharePoint restricted folders, Confluence restricted pages

### Requesting Access

For access to restricted materials:
1. Contact: CATH Governance Team (cath-governance@hmcts.gov.uk - example)
2. Specify: Which artefacts you need access to and why
3. Expected Response: Within 2 business days
4. Approval: Team lead or document owner approval required

---

## Maintenance and Updates

### Ownership and Responsibilities

**Registry Owner**: CATH Governance Team
- Responsibility: Overall maintenance of artefact registry
- Tasks: Quarterly audits, broken link checks, version control

**Category Owners**:
- **Governance**: Governance Team Lead
- **Technical**: Technical Lead
- **Educational**: Education Team Lead
- **Quality Assurance**: QA Team Lead
- **Communications**: Communications Lead

**Document Owners**: As specified in each artefact entry
- Responsibility: Content accuracy and currency for specific documents
- Tasks: Regular updates, version management, review coordination

### Update Process

**Adding New Artefacts**:
1. Create artefact and assign unique ID (ARF-CATH-XXX)
2. Add entry to this registry with complete metadata
3. Upload to appropriate locations (GitHub, SharePoint, Confluence)
4. Update distribution packages if applicable
5. Notify relevant stakeholders

**Updating Existing Artefacts**:
1. Update the artefact content
2. Increment version number
3. Update "Last Updated" date in registry
4. Update changelog if maintained
5. Notify stakeholders if significant changes

**Archiving Obsolete Artefacts**:
1. Mark status as "Archived" in registry
2. Move to archive folder in SharePoint
3. Add "ARCHIVED" note to Confluence pages
4. Remove from active distribution packages
5. Maintain for historical reference

### Review Schedule

**Weekly**: Check for new artefacts from completed JIRA tickets
**Monthly**: Verify all links are functional
**Quarterly**: Comprehensive audit of all entries and metadata
**Annually**: Complete refresh and reorganization

### Monitoring and Reporting

**Usage Analytics**:
- SharePoint page views
- Confluence page visits
- Most accessed artefacts
- Search terms used

**Monthly Report Includes**:
- New artefacts added
- Artefacts updated
- Access requests received
- Issues identified and resolved

**Quarterly Stakeholder Report Includes**:
- Registry statistics
- Usage trends
- Governance compliance status
- Recommendations for improvement

### Feedback Mechanism

**How to Provide Feedback**:
- Email: cath-governance@hmcts.gov.uk (example)
- SharePoint feedback form: Link to feedback form
- Confluence comments on pages
- JIRA ticket: Create ticket in VIBE project

**Types of Feedback We Need**:
- Missing artefacts
- Broken links
- Outdated information
- Difficulty finding materials
- Suggestions for improvement
- Access issues

---

## Quick Reference Guide

### Finding Common Artefacts

**"I need to understand the project architecture"**
→ ARF-CATH-002: Architecture Documentation

**"I need development standards and guidelines"**
→ ARF-CATH-003: Development Standards (CLAUDE.md)

**"I need to see the risk register"**
→ ARF-CATH-006: Risk Register (VIBE-95)

**"I need AI usage policies"**
→ ARF-CATH-008: AI Usage Policy (VIBE-97)

**"I need code review guidelines"**
→ ARF-CATH-009: Code Review Standards (VIBE-98)

**"I need educational materials on AI metrics"**
→ ARF-CATH-028, 029, 030: Educational Materials (VIBE-187, 188, 189)

**"I need the accessibility statement"**
→ ARF-CATH-037: Accessibility Statement (VIBE-236)

**"I need to see implementation plans for a ticket"**
→ Search for VIBE-XXX in this document or navigate to `/docs/tickets/VIBE-XXX/`

### Top 10 Most Important Artefacts

1. **ARF-CATH-002**: Architecture Documentation - System design overview
2. **ARF-CATH-003**: Development Standards - How to develop on this project
3. **ARF-CATH-006**: Risk Register - Key risks and governance
4. **ARF-CATH-008**: AI Usage Policy - Acceptable use guidelines
5. **ARF-CATH-010**: KPI04 Evidence Pack - Compliance evidence
6. **ARF-CATH-027**: Artefacts List (This Document) - Master inventory
7. **ARF-CATH-001**: Project README - Getting started guide
8. **ARF-CATH-011**: Milestone Materials - Project progress
9. **ARF-CATH-028-030**: Educational Materials - AI metrics training
10. **ARF-CATH-012**: Decision Log - Key decisions made

### Search Tips

**By Category**: Use browser find (Ctrl+F / Cmd+F) and search for category names:
- "Project Foundation"
- "Governance & Risk Management"
- "Technical Documentation"
- "Planning & Implementation"
- "Educational & Training"
- "Quality Assurance"
- "Stakeholder Communications"
- "Research & Evidence"

**By JIRA Ticket**: Search for "VIBE-XXX" to find all artefacts related to that ticket

**By Keyword**: Search for specific terms like "risk", "policy", "architecture", "testing", etc.

**By Audience**: Check the Distribution Matrix to see what's relevant for your role

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-24 | CATH Governance Team | Initial creation of master artefacts inventory |

---

## Contact Information

**CATH Governance Team**
- Email: cath-governance@hmcts.gov.uk (example)
- Slack: #cath-governance (example)
- JIRA: VIBE Project

**For Technical Questions**
- Email: cath-dev@hmcts.gov.uk (example)
- Slack: #cath-development (example)

**For Access Issues**
- IT Support: hmcts-it-support@hmcts.gov.uk (example)
- SharePoint Admin: sharepoint-admin@hmcts.gov.uk (example)

---

## Appendix

### Artefact Naming Convention

**Format**: ARF-CATH-XXX
- **ARF**: Artefact
- **CATH**: Project identifier
- **XXX**: Sequential number (001-999)

### Status Definitions

- **Published**: Approved and available for distribution
- **In Progress**: Currently being created or updated
- **Draft**: Under development, not yet approved
- **Review**: Pending stakeholder review
- **Planned**: Scheduled for future creation
- **Archived**: No longer current but retained for reference

### Version Control

- **Major versions**: X.0 (significant changes, restructuring)
- **Minor versions**: X.Y (updates, additions, corrections)
- **Patch versions**: X.Y.Z (typo fixes, formatting)

---

**End of Document**
