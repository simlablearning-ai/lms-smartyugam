"use client";

import { useMemo, useState, useEffect } from "react";

export function useListPagination<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(1);
  const [viewAll, setViewAll] = useState(false);

  // Reset to page 1 when list length changes significantly
  useEffect(() => {
    setPage(1);
  }, [items.length]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageItems = useMemo(() => {
    if (viewAll) return items;
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize, viewAll]);

  return {
    page,
    setPage,
    viewAll,
    setViewAll,
    pageItems,
    total,
    totalPages,
    pageSize,
    from: total === 0 ? 0 : viewAll ? 1 : (page - 1) * pageSize + 1,
    to: viewAll ? total : Math.min(page * pageSize, total),
  };
}

export function ListPaginationBar({
  page,
  setPage,
  viewAll,
  setViewAll,
  total,
  totalPages,
  from,
  to,
}: {
  page: number;
  setPage: (p: number | ((n: number) => number)) => void;
  viewAll: boolean;
  setViewAll: (v: boolean) => void;
  total: number;
  totalPages: number;
  from: number;
  to: number;
}) {
  if (total <= 20 && !viewAll) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 px-1">
        <span>
          Showing {total} {total === 1 ? "item" : "items"}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm px-1">
      <p className="text-slate-500 text-xs sm:text-sm">
        {total === 0 ? (
          "No items"
        ) : viewAll ? (
          <>Showing all <strong className="text-slate-800">{total}</strong></>
        ) : (
          <>
            Showing <strong className="text-slate-800">{from}</strong>
            –<strong className="text-slate-800">{to}</strong> of{" "}
            <strong className="text-slate-800">{total}</strong>
          </>
        )}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setViewAll(!viewAll);
            setPage(1);
          }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
        >
          {viewAll ? "Show 20 per page" : "View all"}
        </button>
        {!viewAll && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="text-xs text-slate-600 px-2">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
