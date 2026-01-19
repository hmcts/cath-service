#!/bin/bash

# Script to create all 5 RCJ hearing list modules for VIBE-317
# This creates the complete module structure following the established patterns

set -e

LIBS_DIR="libs/list-types"
cd "$(dirname "$0")/.."

echo "Creating RCJ hearing list modules..."

# Function to create directory structure
create_module_structure() {
  local module_name=$1
  local module_path="${LIBS_DIR}/${module_name}"

  echo "Creating module: ${module_name}"

  mkdir -p "${module_path}/src/pages"
  mkdir -p "${module_path}/src/models"
  mkdir -p "${module_path}/src/conversion"
  mkdir -p "${module_path}/src/validation"
  mkdir -p "${module_path}/src/rendering"
  mkdir -p "${module_path}/src/schemas"
  mkdir -p "${module_path}/src/assets/js"
  mkdir -p "${module_path}/src/assets/css"
}

# Module 1: RCJ Standard Daily Cause List
echo "=========================================="
echo "Creating Module 1: RCJ Standard Daily Cause List"
echo "=========================================="
create_module_structure "rcj-standard-daily-cause-list"

# Module 2: London Administrative Court
echo "=========================================="
echo "Creating Module 2: London Administrative Court"
echo "=========================================="
create_module_structure "london-administrative-court-daily-cause-list"

# Module 3: Court of Appeal (Civil Division)
echo "=========================================="
echo "Creating Module 3: Court of Appeal (Civil Division)"
echo "=========================================="
create_module_structure "rcj-court-of-appeal-civil"

# Module 4: Administrative Court Daily Cause List
echo "=========================================="
echo "Creating Module 4: Administrative Court Daily Cause List"
echo "=========================================="
create_module_structure "administrative-court-daily-cause-list"

echo "=========================================="
echo "Module structures created successfully!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Populate module files with implementation code"
echo "2. Register modules in apps/web/src/app.ts"
echo "3. Update tsconfig.json with path aliases"
echo "4. Create RCJ landing page"
echo "5. Implement PDF generation"
echo "6. Create E2E tests"
