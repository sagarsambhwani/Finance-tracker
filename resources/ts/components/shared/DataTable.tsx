import { Fragment, useState } from 'react'
import { cn } from '@/lib/utils'
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    useReactTable,
    Row,
    getExpandedRowModel,
    getFilteredRowModel,
} from '@tanstack/react-table'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from '@/components/ui/empty'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { FileX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface DataTableProps<T> {
    data: T[]
    columns: ColumnDef<T>[]
    isLoading?: boolean
    emptyTitle?: string
    emptyDescription?: string
    emptyAction?: React.ReactNode
    renderSubComponent?: (props: { row: Row<T> }) => React.ReactNode
    getRowCanExpand?: (row: Row<T>) => boolean
    getRowClassName?: (row: Row<T>) => string | undefined
    manualPagination?: boolean
    searchColumn?: string
    searchPlaceholder?: string
    mobileRender?: (props: { row: Row<T> }) => React.ReactNode
}

function DataTableSkeleton({ columns }: { columns: number }) {
    return (
        <div className="space-y-3">
            <div className="sm:hidden space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-xl border bg-card space-y-3">
                        <div className="flex justify-between items-center">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <Skeleton className="h-3 w-40" />
                    </div>
                ))}
            </div>
            <div className="hidden sm:block rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {Array.from({ length: columns }).map((_, i) => (
                                <TableHead key={i}>
                                    <Skeleton className="h-4 w-24" />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                {Array.from({ length: columns }).map((_, j) => (
                                    <TableCell key={j}>
                                        <Skeleton className="h-4 w-full" />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function DataTableEmpty({
    title,
    description,
    action,
}: {
    title: string
    description: string
    action?: React.ReactNode
}) {
    return (
        <Empty className="border rounded-lg py-16">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <FileX />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{description}</EmptyDescription>
            </EmptyHeader>
            {action}
        </Empty>
    )
}

function DataTablePagination<T>({ table }: { table: ReturnType<typeof useReactTable<T>> }) {
    const pageIndex = table.getState().pagination.pageIndex
    const pageCount = table.getPageCount()
    const pageSize = table.getState().pagination.pageSize

    if (pageCount <= 1) return null

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground order-2 sm:order-1">
                <span>Rows per page</span>
                <Select
                    value={String(pageSize)}
                    onValueChange={(value) => table.setPageSize(Number(value))}
                >
                    <SelectTrigger className="h-8 w-16">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {[10, 20, 30, 50].map((size) => (
                            <SelectItem key={size} value={String(size)}>
                                {size}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center justify-between w-full sm:w-auto gap-4 order-1 sm:order-2">
                <span className="text-sm text-muted-foreground">
                    Page {pageIndex + 1} of {pageCount}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronsLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronRight className="size-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-8"
                        onClick={() => table.setPageIndex(pageCount - 1)}
                        disabled={!table.getCanNextPage()}
                    >
                        <ChevronsRight className="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function DataTable<T>({
    data,
    columns,
    isLoading,
    emptyTitle = 'No data',
    emptyDescription = 'No data found',
    emptyAction,
    renderSubComponent,
    getRowCanExpand,
    getRowClassName,
    manualPagination = false,
    searchColumn,
    searchPlaceholder = 'Search...',
    mobileRender,
}: DataTableProps<T>) {
    const [globalFilter, setGlobalFilter] = useState('')

    const table = useReactTable({
        data,
        columns,
        state: searchColumn ? { globalFilter } : undefined,
        onGlobalFilterChange: searchColumn ? setGlobalFilter : undefined,
        globalFilterFn: searchColumn
            ? (row, _columnId, value) => {
                  const cell = row.getValue(searchColumn)

                  return String(cell ?? '').toLowerCase().includes(String(value).toLowerCase())
              }
            : undefined,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: searchColumn ? getFilteredRowModel() : undefined,
        getPaginationRowModel: manualPagination ? undefined : getPaginationRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getRowCanExpand,
        manualPagination,
    })

    if (isLoading) {
        return <DataTableSkeleton columns={columns.length} />
    }

    if (data.length === 0) {
        return (
            <DataTableEmpty
                title={emptyTitle}
                description={emptyDescription}
                action={emptyAction}
            />
        )
    }

    return (
        <div className="space-y-3">
            {searchColumn && (
                <div className="relative max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={globalFilter}
                        onChange={(event) => setGlobalFilter(event.target.value)}
                        placeholder={searchPlaceholder}
                        className="pl-9"
                    />
                </div>
            )}

            {mobileRender ? (
                <>
                    <div className="sm:hidden space-y-3">
                        {table.getRowModel().rows.map((row) => (
                            <Fragment key={row.id}>
                                {mobileRender({ row })}
                                {row.getIsExpanded() && renderSubComponent && (
                                    <div className="pl-3 border-l-2 border-primary/20 bg-muted/20 rounded-md p-2">
                                        {renderSubComponent({ row })}
                                    </div>
                                )}
                            </Fragment>
                        ))}
                    </div>

                    <div className="hidden sm:block rounded-lg border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                          header.column.columnDef.header,
                                                          header.getContext()
                                                      )}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <Fragment key={row.id}>
                                        <TableRow
                                            data-state={row.getIsSelected() && 'selected'}
                                            className={cn(getRowClassName?.(row))}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        {row.getIsExpanded() && renderSubComponent && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                                                    {renderSubComponent({ row })}
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            ) : (
                <div className="rounded-lg border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id}>
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                      header.column.columnDef.header,
                                                      header.getContext()
                                                  )}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <Fragment key={row.id}>
                                    <TableRow
                                        data-state={row.getIsSelected() && 'selected'}
                                        className={cn(getRowClassName?.(row))}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && renderSubComponent && (
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableCell colSpan={row.getVisibleCells().length} className="p-0">
                                                {renderSubComponent({ row })}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!manualPagination && <DataTablePagination table={table} />}
        </div>
    )
}

