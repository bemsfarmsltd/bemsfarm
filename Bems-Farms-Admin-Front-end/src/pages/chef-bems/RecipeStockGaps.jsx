import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

export default function RecipeStockGaps() {
  const [data, setData] = useState({
    out_of_stock: [],
    low_stock: [],
    unlisted: [],
    affected_meals: [],
    summary: { total_out: 0, total_low: 0, total_unlisted: 0, total_meals_affected: 0 }
  })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, out, low, unlisted

  const loadGaps = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/out-of-stock-ingredients')
      .then(res => setData(res.data || {}))
      .catch(() => toast.error('Failed to load ingredient stock report'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadGaps()
  }, [loadGaps])

  const exportToCSV = () => {
    const rows = []
    rows.push(["Ingredient Name", "Matched Catalog Product", "Current Stock", "Status", "Used In Meals", "Suggested AI Substitute"])

    const allItems = [...out_of_stock, ...low_stock, ...unlisted]
    if (allItems.length === 0) {
      return toast.error("No stock gap items to export")
    }

    allItems.forEach(item => {
      rows.push([
        `"${(item.ingredient_name || "").replace(/"/g, '""')}"`,
        `"${(item.matched_product_name || "Not in Catalog").replace(/"/g, '""')}"`,
        item.current_stock ?? 0,
        `"${item.status || "UNLISTED"}"`,
        `"${(item.meal_name || "").replace(/"/g, '""')}"`,
        `"${(item.suggested_substitute || "").replace(/"/g, '""')}"`
      ])
    })

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `bems_farms_restock_list_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("🛒 Restock list exported successfully as CSV!")
  }

  const printRestockSheet = () => {
    window.print()
  }

  const { summary = {}, out_of_stock = [], low_stock = [], unlisted = [], affected_meals = [] } = data

  return (
    <div className="container-fluid">
      {/* Page Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-error-warning-line me-2 text-danger"></i>Recipe Ingredients Stock Gaps
          </h4>
          <p className="text-muted mb-0">
            Dedicated inventory monitor for Chef Bems AI — identifies out-of-stock, low-stock, and missing recipe ingredients.
          </p>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={loadGaps}>
            <i className="ri-refresh-line me-1"></i>Refresh
          </button>
          <button className="btn btn-outline-dark btn-sm" onClick={printRestockSheet}>
            <i className="ri-printer-line me-1"></i>Print Restock Sheet
          </button>
          <button className="btn btn-success btn-sm font-weight-bold" onClick={exportToCSV}>
            <i className="ri-download-2-line me-1"></i>Export List to Buy (CSV)
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="row g-3 mb-4">
        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm" style={{ borderLeft: '4px solid #ef4444' }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Out of Stock
                  </p>
                  <h3 className="fw-bold mb-0 text-danger">{summary.total_out || 0}</h3>
                </div>
                <div className="p-3 rounded-circle bg-danger bg-opacity-10 text-danger">
                  <i className="ri-close-circle-line fs-3"></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2" style={{ fontSize: 11 }}>0 units in warehouse</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm" style={{ borderLeft: '4px solid #f59e0b' }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Low Stock Warning
                  </p>
                  <h3 className="fw-bold mb-0 text-warning">{summary.total_low || 0}</h3>
                </div>
                <div className="p-3 rounded-circle bg-warning bg-opacity-10 text-warning">
                  <i className="ri-alert-line fs-3"></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2" style={{ fontSize: 11 }}>≤ 5 units remaining</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm" style={{ borderLeft: '4px solid #6366f1' }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Unlisted in Catalog
                  </p>
                  <h3 className="fw-bold mb-0 text-primary">{summary.total_unlisted || 0}</h3>
                </div>
                <div className="p-3 rounded-circle bg-primary bg-opacity-10 text-primary">
                  <i className="ri-file-search-line fs-3"></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2" style={{ fontSize: 11 }}>Recipe items not yet added to store</p>
            </div>
          </div>
        </div>

        <div className="col-sm-6 col-xl-3">
          <div className="card border-0 shadow-sm" style={{ borderLeft: '4px solid #10b981' }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-muted mb-1" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Affected Meals
                  </p>
                  <h3 className="fw-bold mb-0 text-dark">{summary.total_meals_affected || 0}</h3>
                </div>
                <div className="p-3 rounded-circle bg-success bg-opacity-10 text-success">
                  <i className="ri-restaurant-2-line fs-3"></i>
                </div>
              </div>
              <p className="text-muted mb-0 mt-2" style={{ fontSize: 11 }}>Dishes missing essential items</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="card mb-4">
        <div className="card-body py-2">
          <ul className="nav nav-pills gap-2">
            <li className="nav-item">
              <button className={`nav-link btn-sm ${filter === 'all' ? 'active bg-dark' : ''}`} onClick={() => setFilter('all')}>
                All Inventory Gaps
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn-sm ${filter === 'out' ? 'active bg-danger' : ''}`} onClick={() => setFilter('out')}>
                🚨 Out of Stock ({out_of_stock.length})
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn-sm ${filter === 'low' ? 'active bg-warning text-dark' : ''}`} onClick={() => setFilter('low')}>
                ⚠️ Low Stock ({low_stock.length})
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn-sm ${filter === 'unlisted' ? 'active bg-primary' : ''}`} onClick={() => setFilter('unlisted')}>
                🔍 Unlisted Items ({unlisted.length})
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link btn-sm ${filter === 'meals' ? 'active bg-success' : ''}`} onClick={() => setFilter('meals')}>
                🍲 Affected Meals Matrix ({affected_meals.length})
              </button>
            </li>
          </ul>
        </div>
      </div>

      {loading && <div className="text-center text-muted py-5">Analyzing recipe inventory gaps…</div>}

      {/* ── VIEW 1: OUT OF STOCK & LOW STOCK TABLE ── */}
      {!loading && filter !== 'meals' && (
        <div className="card shadow-sm border">
          <div className="card-header bg-white py-3 border-bottom d-flex align-items-center justify-content-between">
            <h6 className="fw-bold mb-0">Ingredient Availability Status</h6>
            <span className="text-muted" style={{ fontSize: 12 }}>Real-time sync with Products table</span>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ fontSize: 13 }}>
              <thead className="table-light">
                <tr>
                  <th>Recipe Ingredient</th>
                  <th>Matched Catalog Product</th>
                  <th>Current Stock</th>
                  <th>Status</th>
                  <th>Used In Meals</th>
                  <th>Suggested AI Substitution</th>
                </tr>
              </thead>
              <tbody>
                {/* Out of Stock Rows */}
                {(filter === 'all' || filter === 'out') && out_of_stock.map((item, idx) => (
                  <tr key={`out-${idx}`} style={{ background: '#fff5f5' }}>
                    <td>
                      <span className="fw-bold text-dark">{item.ingredient_name}</span>
                      <span className="d-block text-muted" style={{ fontSize: 10 }}>{item.role_in_meal}</span>
                    </td>
                    <td>
                      {item.matched_product_name ? (
                        <span className="fw-semibold text-slate-800">{item.matched_product_name}</span>
                      ) : (
                        <span className="text-muted italic">No catalog match</span>
                      )}
                    </td>
                    <td>
                      <span className="badge bg-danger text-white fw-bold px-2 py-1">0 in stock</span>
                    </td>
                    <td>
                      <span className="badge bg-danger-subtle text-danger border border-danger-subtle" style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b' }}>
                        CRITICAL OUT OF STOCK
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{item.meal_name}</span>
                    </td>
                    <td>
                      {item.suggested_substitute ? (
                        <span className="text-success fw-medium" style={{ fontSize: 12 }}>
                          <i className="ri-repeat-line me-1"></i>{item.suggested_substitute}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 11 }}>No substitute configured</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Low Stock Rows */}
                {(filter === 'all' || filter === 'low') && low_stock.map((item, idx) => (
                  <tr key={`low-${idx}`}>
                    <td>
                      <span className="fw-bold text-dark">{item.ingredient_name}</span>
                      <span className="d-block text-muted" style={{ fontSize: 10 }}>{item.role_in_meal}</span>
                    </td>
                    <td>
                      <span className="fw-semibold text-slate-800">{item.matched_product_name}</span>
                    </td>
                    <td>
                      <span className="badge bg-warning text-dark fw-bold px-2 py-1">{item.current_stock} left</span>
                    </td>
                    <td>
                      <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle" style={{ fontSize: 10, background: '#fef3c7', color: '#92400e' }}>
                        LOW STOCK WARNING
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{item.meal_name}</span>
                    </td>
                    <td>
                      {item.suggested_substitute ? (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          <i className="ri-repeat-line me-1"></i>{item.suggested_substitute}
                        </span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: 11 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Unlisted Rows */}
                {(filter === 'all' || filter === 'unlisted') && unlisted.map((item, idx) => (
                  <tr key={`un-${idx}`}>
                    <td>
                      <span className="fw-bold text-dark">{item.ingredient_name}</span>
                      <span className="d-block text-muted" style={{ fontSize: 10 }}>{item.role_in_meal}</span>
                    </td>
                    <td>
                      <span className="text-danger fw-medium" style={{ fontSize: 11 }}>
                        <i className="ri-alert-line me-1"></i>Not in Catalog
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-secondary text-white">N/A</span>
                    </td>
                    <td>
                      <span className="badge bg-info-subtle text-info border border-info-subtle" style={{ fontSize: 10, background: '#e0e7ff', color: '#3730a3' }}>
                        UNLISTED STORE ITEM
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-light text-dark border">{item.meal_name}</span>
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontSize: 11 }}>Customer must source locally</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VIEW 2: AFFECTED MEALS MATRIX ── */}
      {!loading && filter === 'meals' && (
        <div className="row g-4">
          {affected_meals.map((meal, idx) => (
            <div className="col-md-6 col-xl-4" key={idx}>
              <div className="card shadow-sm border mb-0 h-100">
                <div className="card-body">
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: 15 }}>{meal.meal_name}</h6>
                    <span className="badge bg-danger-subtle text-danger border border-danger" style={{ fontSize: 10, background: '#fee2e2', color: '#991b1b' }}>
                      {meal.missing_count} Missing / Low Items
                    </span>
                  </div>
                  <p className="text-muted mb-3" style={{ fontSize: 11 }}>Category: {meal.meal_category}</p>

                  <div className="p-2 rounded bg-light border">
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                      Impacted Ingredients:
                    </span>
                    <ul className="mb-0 mt-1 ps-3" style={{ fontSize: 12 }}>
                      {meal.ingredients.map((ing, i) => (
                        <li key={i} className="mb-1">
                          <strong>{ing.ingredient_name}</strong> —{' '}
                          <span className={ing.status === 'OUT_OF_STOCK' ? 'text-danger fw-bold' : ing.status === 'LOW_STOCK' ? 'text-warning fw-bold' : 'text-primary'}>
                            {ing.status === 'OUT_OF_STOCK' ? 'Out of Stock (0 units)' : ing.status === 'LOW_STOCK' ? `Low Stock (${ing.stock} left)` : 'Unlisted in Store'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
