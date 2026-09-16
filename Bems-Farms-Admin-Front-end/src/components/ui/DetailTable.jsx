import { useState, useMemo } from 'react'
import Badge, { statusColor } from './Badge'

/**
 * Helper to safely extract search text from a cell value or object.
 */
function extractSearchableText(val) {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string' || typeof val === 'number') return String(val)
  if (typeof val === 'object') {
    return Object.values(val)
      .map(v => (typeof v === 'string' || typeof v === 'number' ? String(v) : ''))
      .join(' ')
  }
  return ''
}

/**
 * DetailTable — Luxury column-driven interactive table for DetailModal.
 * Features:
 *  - Instant live search & multi-field filtering
 *  - Column sorting (asc / desc)
 *  - Smart summary metrics chips
 *  - Pagination with configurable rows-per-page
 *  - High-contrast typography & alternating zebra striping
 *  - Auto status badges & empty state illustration
 *
 * @param {Array} columns - [{ key, label, align?: 'right'|'center'|'left', sortable?: boolean, render?: (row) => node }]
 * @param {Array} rows - Array of object records
 * @param {string} emptyText - Custom empty state message
 * @param {boolean} showSearch - Toggle search bar (default: true)
 * @param {number} defaultPageSize - Default items per page (default: 12)
 */
export default function DetailTable({
  columns = [],
  rows = [],
  emptyText = 'No records available in this view.',
  showSearch = true,
  defaultPageSize = 12,
}) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortKey, setSortKey] = useState(null)
  const [sortDirection, setSortDirection] = useState('asc') // 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // 1. Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!rows || rows.length === 0) return []
    if (!searchTerm.trim()) return rows

    const q = searchTerm.toLowerCase().trim()
    return rows.filter((row) => {
      // Check each column key or direct row properties
      for (const col of columns) {
        if (col.key && row[col.key] !== undefined) {
          const text = extractSearchableText(row[col.key]).toLowerCase()
          if (text.includes(q)) return true
        }
      }
      // Check all top-level row values
      const fullText = Object.values(row).map(extractSearchableText).join(' ').toLowerCase()
      return fullText.includes(q)
    })
  }, [rows, columns, searchTerm])

  // 2. Sort filtered rows
  const sortedRows = useMemo(() => {
    if (!sortKey) return filteredRows

    return [...filteredRows].sort((a, b) => {
      let valA = a[sortKey]
      let valB = b[sortKey]

      if (valA === valB) return 0
      if (valA === null || valA === undefined) return 1
      if (valB === null || valB === undefined) return -1

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA
      }

      const strA = String(valA).toLowerCase()
      const strB = String(valB).toLowerCase()
      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA)
    })
  }, [filteredRows, sortKey, sortDirection])

  // 3. Paginate rows
  const totalItems = sortedRows.length
  const totalPages = pageSize === 'all' ? 1 : Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return sortedRows
    const start = (currentPage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [sortedRows, currentPage, pageSize])

  const handleSort = (key) => {
    if (!key) return
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortKey(null)
        setSortDirection('asc')
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  // 4. Smart Auto-Summary Metrics
  const summaryMetrics = useMemo(() => {
    if (!rows || rows.length === 0) return null

    let totalSum = 0
    let hasSumCol = null
    let hasCountCol = null
    let totalUnits = 0

    for (const c of columns) {
      if (!hasSumCol && (c.key === 'total' || c.key === 'revenue' || c.key === 'spent' || c.key === 'amount' || c.key === 'total_amount')) {
        hasSumCol = c
      }
      if (!hasCountCol && (c.key === 'sold' || c.key === 'units_sold' || c.key === 'orders' || c.key === 'stock' || c.key === 'qty')) {
        hasCountCol = c
      }
    }

    if (hasSumCol) {
      totalSum = rows.reduce((acc, r) => {
        const val = Number(r[hasSumCol.key] ?? r.total_amount ?? r.total ?? r.revenue ?? r.spent ?? 0)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
    }

    if (hasCountCol) {
      totalUnits = rows.reduce((acc, r) => {
        const val = Number(r[hasCountCol.key] ?? 0)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
    }

    return {
      totalRecords: rows.length,
      filteredCount: filteredRows.length,
      hasSum: Boolean(hasSumCol && totalSum > 0),
      sumLabel: hasSumCol ? `Total ${hasSumCol.label || 'Value'}` : '',
      sumValue: totalSum,
      hasUnits: Boolean(hasCountCol && totalUnits > 0),
      unitsLabel: hasCountCol ? `Total ${hasCountCol.label || 'Units'}` : '',
      unitsValue: totalUnits,
    }
  }, [rows, columns, filteredRows.length])

  if (!rows || rows.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 px-4">
        <div
          className="d-flex align-items-center justify-content-center mb-3"
          style={{
            width: 64,
            height: 64,
            borderRadius: '1.25rem',
            backgroundColor: '#F1F5F9',
            color: '#94A3B8',
            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
          }}
        >
          <i className="ri-inbox-2-line" style={{ fontSize: 30 }} />
        </div>
        <h6 className="fw-bold mb-1 font-display" style={{ color: '#334155' }}>No Records Found</h6>
        <p className="text-muted mb-0" style={{ fontSize: '0.85rem', maxWidth: 360 }}>
          {emptyText}
        </p>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100%' }}>
      {/* Top Toolbar: Search + Summary Chips */}
      {(showSearch || (summaryMetrics && (summaryMetrics.hasSum || summaryMetrics.hasUnits))) && (
        <div
          className="d-flex flex-wrap align-items-center justify-content-between gap-3 px-4 py-3"
          style={{
            backgroundColor: '#FAF8F5',
            borderBottom: '1px solid #EFECE6',
          }}
        >
          {/* Search Input */}
          {showSearch && (
            <div className="position-relative" style={{ minWidth: 260, maxWidth: 380, flex: '1 1 260px' }}>
              <i
                className="ri-search-line position-absolute text-muted"
                style={{
                  left: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.95rem',
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search across records..."
                className="form-control form-control-sm"
                style={{
                  paddingLeft: '2.3rem',
                  paddingRight: searchTerm ? '2.3rem' : '0.85rem',
                  height: 38,
                  borderRadius: '0.6rem',
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  fontSize: '0.82rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setCurrentPage(1) }}
                  className="btn btn-link p-0 position-absolute text-muted text-decoration-none"
                  style={{
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '1rem',
                  }}
                  title="Clear search"
                >
                  <i className="ri-close-circle-fill" />
                </button>
              )}
            </div>
          )}

          {/* Quick Summary Pill Badges */}
          <div className="d-flex align-items-center gap-2 flex-wrap ms-auto">
            {summaryMetrics?.hasSum && (
              <div
                className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1"
                style={{
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  borderRadius: '0.5rem',
                  border: '1px solid #A7F3D0',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <i className="ri-funds-line text-success" />
                <span>{summaryMetrics.sumLabel}:</span>
                <span className="fw-bold" style={{ fontFamily: 'monospace' }}>
                  ₦{Number(summaryMetrics.sumValue).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {summaryMetrics?.hasUnits && (
              <div
                className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1"
                style={{
                  backgroundColor: '#EFF6FF',
                  color: '#1E40AF',
                  borderRadius: '0.5rem',
                  border: '1px solid #BFDBFE',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <i className="ri-stack-line text-primary" />
                <span>{summaryMetrics.unitsLabel}:</span>
                <span className="fw-bold">{summaryMetrics.unitsValue.toLocaleString()}</span>
              </div>
            )}

            <div
              className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#64748B',
                borderRadius: '0.5rem',
                border: '1px solid #E2E8F0',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <i className="ri-list-check" />
              <span>
                {searchTerm ? `Showing ${filteredRows.length} of ${rows.length}` : `${rows.length} total records`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="table-responsive flex-grow-1" style={{ minHeight: 180 }}>
        {sortedRows.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-5 px-3">
            <div
              className="d-flex align-items-center justify-content-center mb-2.5"
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                border: '1px solid #FDE68A',
              }}
            >
              <i className="ri-search-eye-line" style={{ fontSize: 24 }} />
            </div>
            <p className="fw-bold mb-1 font-display" style={{ color: '#1E293B', fontSize: '0.92rem' }}>
              No matches found for "{searchTerm}"
            </p>
            <p className="text-muted mb-3" style={{ fontSize: '0.8rem' }}>
              Try adjusting your search term or clear the filter.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="btn btn-sm btn-outline-secondary px-3 py-1"
              style={{ borderRadius: '0.5rem', fontSize: '0.78rem' }}
            >
              Clear Filter
            </button>
          </div>
        ) : (
          <table className="table mb-0 align-middle" style={{ fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                {columns.map((c) => {
                  const isSorted = sortKey === c.key
                  const canSort = c.sortable !== false && Boolean(c.key)

                  return (
                    <th
                      key={c.key || c.label}
                      onClick={() => canSort && handleSort(c.key)}
                      className={`${c.align === 'right' ? 'text-end' : c.align === 'center' ? 'text-center' : 'text-start'}`}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 2,
                        backgroundColor: '#FAF8F5',
                        color: isSorted ? '#0F172A' : '#64748B',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        padding: '0.9rem 1.4rem',
                        borderBottom: '1px solid #E2E8F0',
                        cursor: canSort ? 'pointer' : 'default',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div className={`d-inline-flex align-items-center gap-1 ${c.align === 'right' ? 'flex-row-reverse' : ''}`}>
                        <span>{c.label}</span>
                        {canSort && (
                          <i
                            className={
                              isSorted
                                ? sortDirection === 'asc'
                                  ? 'ri-arrow-up-s-fill text-primary'
                                  : 'ri-arrow-down-s-fill text-primary'
                                : 'ri-arrow-up-down-line text-muted'
                            }
                            style={{ fontSize: '0.85rem', opacity: isSorted ? 1 : 0.4 }}
                          />
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, i) => {
                const rowKey = row.id ?? row.key ?? row.order_ref ?? row.sku ?? i
                const isEven = i % 2 === 1

                return (
                  <tr
                    key={rowKey}
                    className="detail-table-row"
                    style={{
                      backgroundColor: isEven ? '#FAF9F7' : '#FFFFFF',
                      transition: 'background-color 0.15s ease',
                      borderBottom: '1px solid #F1ECE4',
                    }}
                  >
                    {columns.map((c) => {
                      const val = row[c.key]
                      return (
                        <td
                          key={c.key || c.label}
                          className={`${c.align === 'right' ? 'text-end' : c.align === 'center' ? 'text-center' : 'text-start'}`}
                          style={{
                            padding: '0.9rem 1.4rem',
                            color: '#1E293B',
                            verticalAlign: 'middle',
                          }}
                        >
                          {c.render ? (
                            c.render(row)
                          ) : typeof val === 'string' && statusColor(val) !== 'slate' && val.length < 20 ? (
                            <Badge label={val} color={statusColor(val)} dot />
                          ) : val !== null && val !== undefined ? (
                            String(val)
                          ) : (
                            <span className="text-muted opacity-50">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div
          className="d-flex align-items-center justify-content-between px-4 py-2.5 flex-wrap gap-2"
          style={{
            backgroundColor: '#FAF8F5',
            borderTop: '1px solid #EFECE6',
            fontSize: '0.78rem',
            color: '#64748B',
          }}
        >
          <div className="d-flex align-items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const v = e.target.value === 'all' ? 'all' : Number(e.target.value)
                setPageSize(v)
                setCurrentPage(1)
              }}
              className="form-select form-select-sm"
              style={{
                width: 75,
                height: 28,
                fontSize: '0.75rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '0.4rem',
                borderColor: '#CBD5E1',
              }}
            >
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="all">All</option>
            </select>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="btn btn-outline-secondary"
                style={{ padding: '0.2rem 0.55rem', borderRadius: '0.4rem 0 0 0.4rem' }}
                title="Previous page"
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-outline-secondary"
                style={{ padding: '0.2rem 0.55rem', borderRadius: '0 0.4rem 0.4rem 0' }}
                title="Next page"
              >
                <i className="ri-arrow-right-s-line" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .detail-table-row:hover {
          background-color: #F3F8F5 !important;
        }
      `}</style>
    </div>
  )
}
