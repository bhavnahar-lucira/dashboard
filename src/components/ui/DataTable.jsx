"use client";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
export function DataTable({
  columns,
  data,
  hideCount = false,
  serverSide = false,
  totalCount = 0,
  pageIndex = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  infiniteScroll = false,
  onLoadMore,
  hasMore = false,
  loading = false,
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const tableOptions = {
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  };
  if (serverSide) {
    tableOptions.manualPagination = true;
    tableOptions.pageCount = Math.ceil(totalCount / pageSize) || 1;
    tableOptions.state.pagination = { pageIndex, pageSize };
    tableOptions.onPaginationChange = (updater) => {
      if (typeof updater === "function") {
        const nextState = updater({ pageIndex, pageSize });
        if (nextState.pageIndex !== pageIndex && onPageChange) {
          onPageChange(nextState.pageIndex);
        }
        if (nextState.pageSize !== pageSize && onPageSizeChange) {
          onPageSizeChange(nextState.pageSize);
        }
      } else {
        const nextState = updater;
        if (nextState.pageIndex !== pageIndex && onPageChange) {
          onPageChange(nextState.pageIndex);
        }
        if (nextState.pageSize !== pageSize && onPageSizeChange) {
          onPageSizeChange(nextState.pageSize);
        }
      }
    };
  } else {
    tableOptions.initialState = { pagination: { pageSize: 10 } };
  }
  const table = useReactTable(tableOptions);
  const observerTarget = useRef(null);
  useEffect(() => {
    if (!infiniteScroll || !hasMore || loading || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [observerTarget.current, infiniteScroll, hasMore, loading, onLoadMore]);
  const pagerBtn =
    "grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-panel text-ink-soft transition-colors hover:border-brand/40 hover:text-brand disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="admin-panel w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 border-b border-hairline-soft px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="group flex flex-1 items-center gap-2.5 rounded-xl bg-field px-4 py-2.5 transition-all focus-within:bg-panel focus-within:shadow-[0_0_0_1px_var(--admin-brand-tint-strong)] sm:max-w-sm">
          <Search
            size={17}
            className="shrink-0 text-ink-muted transition-colors group-focus-within:text-brand"
          />
          <input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full border-none bg-transparent text-[13.5px] font-medium text-ink outline-none placeholder:text-ink-muted"
          />
        </div>
        {!hideCount && (
          <div className="flex shrink-0 items-center gap-2">
            <span className="admin-eyebrow">Records</span>
            <span className="rounded-lg bg-brand-tint px-2.5 py-1 text-[13px] font-bold text-brand">
              {serverSide
                ? totalCount
                : table.getFilteredRowModel().rows.length}
              {!serverSide &&
                table.getFilteredRowModel().rows.length !== data.length &&
                ` / ${data.length}`}
            </span>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13.5px]">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="admin-eyebrow whitespace-nowrap border-b border-hairline bg-panel-alt px-6 py-3.5 text-left"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-hairline-soft">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="text-ink transition-colors hover:bg-row-hover"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 align-middle font-medium">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <span className="text-[13.5px] font-medium text-ink-muted">
                    No results found.
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {infiniteScroll && hasMore && (
        <div ref={observerTarget} className="flex justify-center p-5">
          {loading ? (
            <Loader2 className="animate-spin text-ink-muted" size={22} />
          ) : (
            <div className="h-4" />
          )}
        </div>
      )}
      {infiniteScroll && !hasMore && data.length > 0 && (
        <div className="border-t border-hairline-soft p-5 text-center text-[13px] font-medium text-ink-muted">
          End of results
        </div>
      )}

      {!infiniteScroll && (
        <div className="flex flex-col items-center justify-between gap-4 border-t border-hairline-soft px-6 py-4 sm:flex-row">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="whitespace-nowrap text-[13px] font-medium text-ink-soft">
              Page{" "}
              <span className="font-bold text-ink">
                {table.getState().pagination.pageIndex + 1}
              </span>{" "}
              of{" "}
              <span className="font-bold text-ink">
                {table.getPageCount()}
              </span>
            </span>
            <label className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[13px] font-medium text-ink-muted">
                Go to
              </span>
              <input
                type="number"
                value={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="h-9 w-16 rounded-xl border border-hairline bg-panel px-2.5 text-[13px] font-semibold text-ink outline-none transition-all focus:border-brand/50 focus:shadow-[0_0_0_3px_var(--admin-brand-tint)]"
              />
            </label>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="h-9 rounded-xl border border-hairline bg-panel px-2.5 text-[13px] font-semibold text-ink outline-none transition-all focus:border-brand/50 focus:shadow-[0_0_0_3px_var(--admin-brand-tint)]"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize} className="bg-panel">
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              className={pagerBtn}
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="First Page"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              className={pagerBtn}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Previous Page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className={pagerBtn}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Next Page"
            >
              <ChevronRight size={16} />
            </button>
            <button
              className={pagerBtn}
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="Last Page"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
