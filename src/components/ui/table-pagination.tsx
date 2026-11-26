"use client";

import { useState } from "react";
import { Button } from "./button";
import { Select } from "./select";

const defaultPageSize = 20;

export function usePaginatedRows<T>(rows: readonly T[], filterKey: string) {
  const [selection, setSelection] = useState({ filterKey, page: 1, pageSize: defaultPageSize });
  const pageSize = selection.pageSize;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = selection.filterKey === filterKey ? Math.min(selection.page, pageCount) : 1;
  const start = (page - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    page,
    pageCount,
    pageSize,
    total: rows.length,
    start,
    setPage: (nextPage: number) => setSelection({ filterKey, page: Math.max(1, Math.min(nextPage, pageCount)), pageSize }),
    setPageSize: (nextSize: number) => setSelection({ filterKey, page: 1, pageSize: nextSize }),
  };
}

export function TablePagination({
  label,
  total,
  page,
  pageCount,
  pageSize,
  start,
  onPageChange,
  onPageSizeChange,
}: {
  label: string;
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  start: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  if (total <= defaultPageSize && total <= pageSize) return null;

  return (
    <nav aria-label={`${label} pagination`} className="table-pagination flex flex-wrap items-center justify-between gap-3 border-t px-2 py-3 text-sm">
      <span className="text-muted">Showing {start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-muted">Rows per page<Select className="w-20" triggerClassName="h-9" label={`Rows per page for ${label}`} value={String(pageSize)} onChange={(value) => onPageSizeChange(Number(value))} options={[10, 20, 50].map((size) => ({ value: String(size), label: String(size) }))}/></div>
        <Button type="button" variant="ghost" className="min-h-9 px-2" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
        <div className="flex items-center gap-1 whitespace-nowrap tabular-nums">Page<Select className="w-20" triggerClassName="h-9" label={`Page for ${label}`} value={String(page)} onChange={(value) => onPageChange(Number(value))} options={Array.from({ length: pageCount }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }))}/>of {pageCount}</div>
        <Button type="button" variant="ghost" className="min-h-9 px-2" disabled={page === pageCount} onClick={() => onPageChange(page + 1)}>Next</Button>
      </div>
    </nav>
  );
}
