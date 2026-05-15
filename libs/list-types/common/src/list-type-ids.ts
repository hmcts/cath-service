import { mockListTypes } from "./mock-list-types.js";

export type ListTypeName = (typeof mockListTypes)[number]["name"];

export function getListTypeName(id: number): ListTypeName | undefined {
  return mockListTypes.find((lt) => lt.id === id)?.name as ListTypeName | undefined;
}

export function getListTypeId(name: string): number | undefined {
  return mockListTypes.find((lt) => lt.name === name)?.id;
}
