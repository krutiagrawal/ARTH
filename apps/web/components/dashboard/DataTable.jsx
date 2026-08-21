'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from '@tanstack/react-table'
import { ArrowUpDown, Search } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Shared table for every list surface that used to be stacked cards with no
 * sort/search/pagination: NGO Drives/Trees/Campaigns, admin NGO queue, admin
 * CMS lists. Sorting/filtering/pagination are client-side over whatever page
 * of `data` is currently loaded.
 *
 * `enableRowSelection` + `onSelectionChange`: opt-in checkbox column (first
 * NGO Survival/Impact's bulk health-check action needs this) — everything
 * else omits the prop and gets the exact same table as before.
 */
export default function DataTable({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search…',
  pageSize = 10,
  emptyState,
  loading = false,
  onRowClick,
  enableRowSelection = false,
  onSelectionChange,
}) {
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})

  const tableColumns = useMemo(() => {
    if (!enableRowSelection) return columns
    return [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => el && (el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected())}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            className="h-4 w-4 rounded border-border/70"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-border/70"
          />
        ),
        enableSorting: false,
      },
      ...columns,
    ]
  }, [columns, enableRowSelection])

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    globalFilterFn: (row, _columnId, filterValue) => {
      if (!searchKey) return true
      const value = row.getValue(searchKey)
      return String(value ?? '').toLowerCase().includes(String(filterValue).toLowerCase())
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })

  useEffect(() => {
    if (!enableRowSelection || !onSelectionChange) return
    onSelectionChange(table.getSelectedRowModel().rows.map((r) => r.original))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection])

  const rows = table.getRowModel().rows
  const showEmpty = !loading && rows.length === 0

  return (
    <div>
      {searchKey && (
        <div className="relative max-w-xs mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={globalFilter}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9 rounded-full h-10"
          />
        </div>
      )}

      {showEmpty ? (
        emptyState
      ) : (
        <div className="rounded-3xl border border-border/70 bg-card soft-shadow overflow-hidden">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <ArrowUpDown className="h-3 w-3" />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {tableColumns.map((_col, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full max-w-[140px]" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.map((row) => (
                    <TableRow
                      key={row.id}
                      onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                      className={cn(onRowClick && 'cursor-pointer')}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          // The actions/select columns have their own click targets
                          // that must not also trigger the row-level onRowClick.
                          onClick={cell.column.id === 'actions' || cell.column.id === 'select' ? (e) => e.stopPropagation() : undefined}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && rows.length > 0 && table.getPageCount() > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
