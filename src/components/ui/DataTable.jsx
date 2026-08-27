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
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 max-w-sm px-4 py-2 bg-white border border-zinc-200 rounded-xl shadow-sm group focus-within:ring-1 focus-within:ring-zinc-400 transition-all flex-1">
          <Search
            size={18}
            className="text-zinc-400 group-focus-within:text-zinc-900"
          />
          <input
            placeholder="Search..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full"
          />
        </div>
        {!hideCount && (
          <div className="flex items-center gap-2 bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 ">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              Records:
            </span>
            <span className="text-sm font-bold text-zinc-900 ">
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
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-50 text-zinc-500 uppercase text-xs font-semibold">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-4 border-b border-zinc-200"
                    style={{ letterSpacing: '0.5px' }}
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
          <tbody className="divide-y divide-zinc-200 ">
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50 transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4">
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
                <td
                  colSpan={columns.length}
                  className="h-24 text-center text-zinc-500"
                >
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {infiniteScroll && hasMore && (
          <div ref={observerTarget} className="flex justify-center p-4">
            {loading ? (
              <Loader2 className="animate-spin text-zinc-400" size={24} />
            ) : (
              <div className="h-4" />
            )}
          </div>
        )}
        {infiniteScroll && !hasMore && data.length > 0 && (
          <div className="text-center p-4 text-zinc-500 text-sm">
            No data available
          </div>
        )}
      </div>
      {!infiniteScroll && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
          <div className="flex items-center gap-6">
            <div className="text-sm text-zinc-500 whitespace-nowrap">
              Page {table.getState().pagination.pageIndex + 1} of
              {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-500 whitespace-nowrap">
                Go to page:
              </span>
              <input
                type="number"
                value={table.getState().pagination.pageIndex + 1}
                onChange={(e) => {
                  const page = e.target.value ? Number(e.target.value) - 1 : 0;
                  table.setPageIndex(page);
                }}
                className="border border-zinc-200 bg-transparent rounded px-2 py-1 text-sm w-16 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="border border-zinc-200 bg-transparent rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <option key={pageSize} value={pageSize} className="bg-white ">
                  Show {pageSize}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-2 rounded-lg border border-zinc-200 disabled:opacity-50 hover:bg-zinc-50 transition-colors"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              title="First Page"
            >
              <ChevronsLeft size={18} />
            </button>
            <button
              className="p-2 rounded-lg border border-zinc-200 disabled:opacity-50 hover:bg-zinc-50 transition-colors"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              title="Previous Page"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              className="p-2 rounded-lg border border-zinc-200 disabled:opacity-50 hover:bg-zinc-50 transition-colors"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              title="Next Page"
            >
              <ChevronRight size={18} />
            </button>
            <button
              className="p-2 rounded-lg border border-zinc-200 disabled:opacity-50 hover:bg-zinc-50 transition-colors"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              title="Last Page"
            >
              <ChevronsRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
