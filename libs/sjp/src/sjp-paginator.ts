export interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNext: boolean;
  hasPrevious: boolean;
  pageNumbers: number[];
}

const MAX_PAGE_LINKS = 7;

export function calculatePagination(currentPage: number, totalItems: number, itemsPerPage: number): PaginationData {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const hasNext = currentPage < totalPages;
  const hasPrevious = currentPage > 1;

  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNext,
    hasPrevious,
    pageNumbers
  };
}

function generatePageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= MAX_PAGE_LINKS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: number[] = [];
  const halfWindow = Math.floor(MAX_PAGE_LINKS / 2);

  let start = Math.max(1, currentPage - halfWindow);
  let end = Math.min(totalPages, currentPage + halfWindow);

  if (currentPage <= halfWindow) {
    end = MAX_PAGE_LINKS;
  } else if (currentPage >= totalPages - halfWindow) {
    start = totalPages - MAX_PAGE_LINKS + 1;
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return pages;
}
