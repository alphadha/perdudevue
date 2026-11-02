"use client";

import type { CSSProperties, ReactNode } from "react";
import type { SortState } from "@/lib/tableSort";
import PdvCheckbox from "./PdvCheckbox";
import PdvSortHeader from "./PdvSortHeader";

export type PdvTableColumn<T, K extends string = string> = {
  key: K;
  label: string;
  width?: number;
  render: (row: T) => ReactNode;
};

export type PdvTableSelection<T> = {
  selected: string[];
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (id: string, checked: boolean) => void;
  isEnabled?: (row: T) => boolean;
  headerAriaLabel: string;
  rowAriaLabel: (row: T) => string;
};

type Props<T, K extends string> = {
  columns: PdvTableColumn<T, K>[];
  rows: T[];
  getRowId: (row: T) => string;
  empty: string;
  sort?: SortState<K> | null;
  onSort?: (key: K) => void;
  selection?: PdvTableSelection<T>;
  actions?: (row: T) => ReactNode;
};

const LEAD_GUTTER = 40;
const ACTIONS_COL = 54;

function track(width: number | undefined, extra = 0): string {
  return `minmax(${(width ?? 120) + extra}px, 1fr)`;
}

/** Tableau Prod UI — Figma 155:44838 : flex space-between, case+1re col groupées. */
export default function PdvTable<T, K extends string>({
  columns,
  rows,
  getRowId,
  empty,
  sort = null,
  onSort,
  selection,
  actions,
}: Props<T, K>) {
  if (rows.length === 0) {
    return <p className="pdv-table-empty">{empty}</p>;
  }

  const [lead, ...rest] = columns;
  const gridCols = [
    track(lead.width, selection ? LEAD_GUTTER : 0),
    ...rest.map((column) => track(column.width)),
    actions ? `${ACTIONS_COL}px` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const enabled = selection ? rows.filter((row) => selection.isEnabled?.(row) ?? true) : [];
  const allChecked =
    enabled.length > 0 && enabled.every((row) => selection?.selected.includes(getRowId(row)));
  const someChecked = enabled.some((row) => selection?.selected.includes(getRowId(row))) && !allChecked;

  function sortAria(column: PdvTableColumn<T, K>): "ascending" | "descending" | "none" | undefined {
    if (!onSort) {
      return undefined;
    }
    if (sort?.key !== column.key) {
      return "none";
    }
    return sort.dir === "asc" ? "ascending" : "descending";
  }

  function sortButton(column: PdvTableColumn<T, K>) {
    if (!onSort) {
      return column.label;
    }
    return (
      <PdvSortHeader
        label={column.label}
        active={sort?.key === column.key}
        direction={sort?.key === column.key ? sort.dir : undefined}
        onClick={() => onSort(column.key)}
      />
    );
  }

  return (
    <>
      <div className="pdv-table-wrap">
        <div className="pdv-table" role="table" style={{ "--pdv-table-cols": gridCols } as CSSProperties}>
          <div className="pdv-table__row pdv-table__row--head" role="row">
            {selection ? (
              <div className="pdv-table__cell pdv-table__cell--lead" role="columnheader" aria-sort={sortAria(lead)}>
                <PdvCheckbox
                  checked={Boolean(allChecked)}
                  indeterminate={someChecked}
                  disabled={enabled.length === 0}
                  aria-label={selection.headerAriaLabel}
                  onChange={selection.onToggleAll}
                />
                <div className="pdv-table__col">
                  {sortButton(lead)}
                </div>
              </div>
            ) : (
              <div className="pdv-table__cell" role="columnheader" aria-sort={sortAria(lead)}>
                {sortButton(lead)}
              </div>
            )}
            {rest.map((column) => (
              <div key={column.key} className="pdv-table__cell" role="columnheader" aria-sort={sortAria(column)}>
                {sortButton(column)}
              </div>
            ))}
            {actions ? (
              <div className="pdv-table__cell pdv-table__cell--actions" role="columnheader">
                Actions
              </div>
            ) : null}
          </div>

          {rows.map((row) => {
            const id = getRowId(row);
            return (
              <div key={id} className="pdv-table__row" role="row">
                {selection ? (
                  <div className="pdv-table__cell pdv-table__cell--lead" role="cell">
                    <PdvCheckbox
                      checked={selection.selected.includes(id)}
                      disabled={selection.isEnabled ? !selection.isEnabled(row) : false}
                      aria-label={selection.rowAriaLabel(row)}
                      onChange={(checked) => selection.onToggleRow(id, checked)}
                    />
                    <div className="pdv-table__col">{lead.render(row)}</div>
                  </div>
                ) : (
                  <div className="pdv-table__cell" role="cell">
                    {lead.render(row)}
                  </div>
                )}
                {rest.map((column) => (
                  <div key={column.key} className="pdv-table__cell" role="cell">
                    {column.render(row)}
                  </div>
                ))}
                {actions ? (
                  <div className="pdv-table__cell pdv-table__cell--actions" role="cell">
                    {actions(row)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
