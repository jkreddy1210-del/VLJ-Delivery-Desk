/** Make Prisma Date (and similar) values safe for TanStack Start server-fn serialization. */
export const serializeDate = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return null;
};
