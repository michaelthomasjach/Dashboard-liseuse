import { useMemo, useState, type ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "../icons";
import "./DataTable.css";

export interface DataTableColumn<T> {
  id: string;
  header: string;
  accessor: (row: T) => ReactNode;
  /** Enables sorting on this column; return the primitive to compare on. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  width?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

/** Sortable, responsive (horizontally scrollable) data table — holdings, orders, transactions. */
export function DataTable<T>({ columns, rows, rowKey, onRowClick, emptyMessage = "Aucune donnée", className }: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; dir: "asc" | "desc" } | null>(null);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const sv = col.sortValue;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = sv(a);
      const bv = sv(b);
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  function toggleSort(col: DataTableColumn<T>) {
    if (!col.sortValue) return;
    setSort((prev) => {
      if (!prev || prev.id !== col.id) return { id: col.id, dir: "asc" };
      if (prev.dir === "asc") return { id: col.id, dir: "desc" };
      return null;
    });
  }

  return (
    <div className={["lq-data-table", className].filter(Boolean).join(" ")}>
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.id}
                style={{ width: col.width, textAlign: col.align ?? "left" }}
                className={col.sortValue ? "lq-data-table__sortable" : undefined}
                onClick={() => toggleSort(col)}
                aria-sort={sort?.id === col.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
              >
                <span className="lq-data-table__header">
                  {col.header}
                  {col.sortValue && (
                    <span className="lq-data-table__sort-icon">
                      {sort?.id === col.id ? (
                        sort.dir === "asc" ? (
                          <ChevronUpIcon size={14} />
                        ) : (
                          <ChevronDownIcon size={14} />
                        )
                      ) : null}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="lq-data-table__empty">
                {emptyMessage}
              </td>
            </tr>
          )}
          {sortedRows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? "lq-data-table__row--interactive" : undefined}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.id} style={{ textAlign: col.align ?? "left" }}>
                  {col.accessor(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
