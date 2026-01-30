import { describe, expect, it } from "vitest";
import { calculatePagination } from "./sjp-paginator.js";

describe("calculatePagination", () => {
  it("should calculate pagination for single page", () => {
    const result = calculatePagination(1, 10, 50);

    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.totalItems).toBe(10);
    expect(result.itemsPerPage).toBe(50);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
    expect(result.pageNumbers).toEqual([1]);
  });

  it("should calculate pagination for multiple pages", () => {
    const result = calculatePagination(1, 150, 50);

    expect(result.totalPages).toBe(3);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(false);
    expect(result.pageNumbers).toEqual([1, 2, 3]);
  });

  it("should calculate pagination for middle page", () => {
    const result = calculatePagination(5, 500, 50);

    expect(result.currentPage).toBe(5);
    expect(result.totalPages).toBe(10);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrevious).toBe(true);
    expect(result.pageNumbers).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("should calculate pagination for last page", () => {
    const result = calculatePagination(10, 500, 50);

    expect(result.currentPage).toBe(10);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(true);
  });

  it("should show max 7 page links", () => {
    const result = calculatePagination(10, 1000, 50);

    expect(result.totalPages).toBe(20);
    expect(result.pageNumbers).toHaveLength(7);
  });

  it("should show first 7 pages when on page 1", () => {
    const result = calculatePagination(1, 1000, 50);

    expect(result.pageNumbers).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("should show last 7 pages when near the end", () => {
    const result = calculatePagination(20, 1000, 50);

    expect(result.pageNumbers).toEqual([14, 15, 16, 17, 18, 19, 20]);
  });

  it("should handle zero items", () => {
    const result = calculatePagination(1, 0, 50);

    expect(result.totalPages).toBe(0);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrevious).toBe(false);
    expect(result.pageNumbers).toEqual([]);
  });

  it("should handle exactly one page of items", () => {
    const result = calculatePagination(1, 50, 50);

    expect(result.totalPages).toBe(1);
    expect(result.pageNumbers).toEqual([1]);
  });

  it("should handle items requiring partial last page", () => {
    const result = calculatePagination(3, 101, 50);

    expect(result.totalPages).toBe(3);
    expect(result.currentPage).toBe(3);
  });
});
