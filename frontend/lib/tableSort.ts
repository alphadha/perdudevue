export type SortDir = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  dir: SortDir;
};

export function toggleSort<K extends string>(current: SortState<K> | null, key: K): SortState<K> {
  if (current?.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

export function compareValues(a: string | number | null | undefined, b: string | number | null | undefined): number {
  const left = a ?? "";
  const right = b ?? "";
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }
  return String(left).localeCompare(String(right), "fr", { sensitivity: "base", numeric: true });
}

export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K> | null,
  getters: Record<K, (row: T) => string | number | null | undefined>,
): T[] {
  if (!sort) {
    return rows;
  }
  const getter = getters[sort.key];
  const factor = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => factor * compareValues(getter(left), getter(right)));
}

export function sortLabel(active: boolean, dir: SortDir | undefined): string {
  if (!active) {
    return " ↕";
  }
  return dir === "asc" ? " ↑" : " ↓";
}
