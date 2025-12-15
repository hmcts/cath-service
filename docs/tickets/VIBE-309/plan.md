# VIBE-309: Technical Plan - Configure List Type from Database

## 1. Technical Approach

- Create new module `libs/list-type-config` for System Admin list type configuration
- Use Prisma for database schema with two tables: `list_types` and `list_types_sub_jurisdictions`
- Implement multi-step form flow using session storage to persist data between pages
- Replace all usages of `mock-list-types.ts` with database queries via service layer

## 2. Implementation Details

### Module Structure
```
libs/list-type-config/
├── src/
│   ├── config.ts                              # Module configuration exports
│   ├── index.ts                               # Business logic exports
│   ├── pages/
│   │   ├── system-admin/dashboard.ts          # Updated dashboard with new tile
│   │   ├── configure-list-type/
│   │   │   ├── enter-details.ts               # Page 1: Enter list type details
│   │   │   ├── enter-details.njk
│   │   │   ├── select-sub-jurisdictions.ts    # Page 2: Select sub-jurisdictions
│   │   │   ├── select-sub-jurisdictions.njk
│   │   │   ├── preview.ts                     # Page 3: Preview details
│   │   │   ├── preview.njk
│   │   │   ├── success.ts                     # Page 4: Success message
│   │   │   └── success.njk
│   ├── list-type/
│   │   ├── list-type-service.ts               # Business logic for list types
│   │   ├── list-type-queries.ts               # Database queries
│   │   └── list-type-validation.ts            # Input validation
│   └── locales/
│       ├── en.ts                              # English translations
│       └── cy.ts                              # Welsh translations
├── prisma/
│   └── schema.prisma                          # Database schema
```

### Database Schema (Prisma)
```prisma
model ListType {
  id                     Int      @id @default(autoincrement())
  name                   String   @unique @db.VarChar(1000)
  friendlyName           String?  @map("friendly_name") @db.VarChar(1000)
  welshFriendlyName      String?  @map("welsh_friendly_name") @db.VarChar(255)
  shortenedFriendlyName  String?  @map("shortened_friendly_name") @db.VarChar(255)
  url                    String?  @db.VarChar(255)
  defaultSensitivity     String?  @map("default_sensitivity") @db.VarChar(50)
  allowedProvenance      String   @map("allowed_provenance") @db.VarChar(50)
  isNonStrategic         Boolean  @default(false) @map("is_non_strategic")
  createdAt              DateTime @default(now()) @map("created_at")
  updatedAt              DateTime @updatedAt @map("updated_at")

  subJurisdictions       ListTypeSubJurisdiction[]

  @@map("list_types")
}

model ListTypeSubJurisdiction {
  id                Int            @id @default(autoincrement())
  listTypeId        Int            @map("list_type_id")
  subJurisdictionId Int            @map("sub_jurisdiction_id")

  listType          ListType       @relation(fields: [listTypeId], references: [id], onDelete: Cascade)
  subJurisdiction   SubJurisdiction @relation(fields: [subJurisdictionId], references: [id])

  @@unique([listTypeId, subJurisdictionId])
  @@map("list_types_sub_jurisdictions")
}
```

### Session Structure
```typescript
interface ListTypeSession {
  configureListType?: {
    name: string;
    friendlyName: string;
    welshFriendlyName: string;
    shortenedFriendlyName: string;
    url: string;
    defaultSensitivity: string;
    allowedProvenance: string[];
    isNonStrategic: boolean;
    subJurisdictionIds: number[];
  };
}
```

## 3. Error Handling

### Validation Rules
- All text fields: Required, max length validation (name: 1000, welsh_friendly_name: 255, etc.)
- Name field: Must be unique (check against existing list types in database)
- URL field: Required, valid path format
- default_sensitivity: Required, must be "Public", "Private", or "Classified"
- allowed_provenance: Required, at least one selected from ["CFT_IDAM", "B2C", "COMMON_PLATFORM"]
- is_non_strategic: Required, must be boolean (Yes/No radio)
- sub-jurisdictions: Required, at least one selected, must match existing IDs

### Error Messages Pattern
- Field-level errors for individual validation failures
- Error summary at top of page listing all errors with anchor links
- Welsh translations for all error messages

## 4. Acceptance Criteria Mapping

1. **Move list type information to database tables**
   - Prisma schema created with list_types and list_types_sub_jurisdictions tables
   - Migration generated and applied to database

2. **All System Admin screens implemented**
   - 5 pages: Dashboard tile, Enter Details, Select Sub-jurisdictions, Preview, Success
   - All pages accessible, validated, and support Welsh language
   - Session-based multi-step form flow

3. **All code getting list information from database**
   - Service layer created for list type operations
   - All pages updated to use database queries instead of mock-list-types.ts
   - Manual and non-strategic upload pages use shortened_friendly_name from database
   - mock-list-types.ts file deleted

## 5. Additional Requirements (Clarified)

- **Edit Functionality**: Include edit/update capability for existing list types accessed via dashboard
- **Dashboard Display**: Show only the "Configure List Type" tile (no list view)
- **Data Migration**: Implement automatic migration script from mock-list-types.ts to database
- **Duplicate Validation**: Enforce unique constraint on list type names with validation error message
