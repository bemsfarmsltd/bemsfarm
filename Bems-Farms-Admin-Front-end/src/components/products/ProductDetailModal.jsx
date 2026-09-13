import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import BarcodeSvg from '../ui/BarcodeSvg'

export default function ProductDetailModal({ productId, onClose, onEdit, onScheduleRestock }) {
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('specs') // 'specs' | 'orders' | 'movements'
  const [activeImage, setActiveImage] = useState(null)

  useEffect(() => {
    if (!productId) return
    let isMounted = true
    setLoading(true)

    api.get(`/admin/products/${productId}`)
      .then((res) => {
        if (!isMounted) return
        setProduct(res.data)
        const primaryImg = res.data?.images?.find((img) => img.is_primary)?.image_url || res.data?.image_url || res.data?.images?.[0]?.image_url
        setActiveImage(primaryImg)
      })
      .catch((err) => {
        if (!isMounted) return
        toast.error(err.response?.data?.message || 'Failed to load product details')
        onClose?.()
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => { isMounted = false }
  }, [productId])

  if (!productId) return null

  const formatNaira = (amount) => {
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const handleCopyBarcode = () => {
    if (!product?.barcode) return
    navigator.clipboard.writeText(product.barcode)
    toast.success('Barcode copied to clipboard!')
  }

  const handlePrintBarcode = () => {
    if (!product?.barcode) return
    const printWindow = window.open('', '_blank', 'width=500,height=400')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${product.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; }
            .name { font-size: 16px; font-weight: bold; margin-bottom: 6px; }
            .sku { font-size: 13px; color: #555; margin-bottom: 12px; }
            .price { font-size: 18px; font-weight: bold; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div class="name">${product.name}</div>
          <div class="sku">SKU: ${product.sku || '—'}</div>
          <div>${document.getElementById('product-detail-barcode-svg')?.outerHTML || product.barcode}</div>
          <div class="price">${formatNaira(product.price || product.unit_price)}</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const sellingPrice = Number(product?.price || product?.unit_price || 0)
  const costPrice = Number(product?.cost_price || 0)
  const grossProfit = sellingPrice - costPrice
  const profitMargin = sellingPrice > 0 ? ((grossProfit / sellingPrice) * 100).toFixed(1) : 0

  const stockQty = Number(product?.stock ?? product?.stock_quantity ?? 0)
  const lowThreshold = Number(product?.low_stock_threshold || 10)
  const isOutOfStock = stockQty <= 0
  const isLowStock = stockQty > 0 && stockQty <= lowThreshold

  const retailValuation = stockQty * sellingPrice
  const costValuation = stockQty * costPrice

  const allImages = product?.images?.length
    ? product.images.map((img) => img.image_url).filter(Boolean)
    : product?.image_url
    ? [product.image_url]
    : []

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1055 }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          {/* Modal Header */}
          <div className="modal-header bg-white border-bottom px-4 py-3 align-items-center">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <div className="bg-success-subtle text-success p-2.5 rounded-3 d-flex align-items-center justify-content-center">
                <i className="ri-archive-2-line fs-4"></i>
              </div>
              <div>
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <h5 className="modal-title fw-bold text-dark mb-0 font-display">
                    {loading ? 'Loading Product…' : product?.name}
                  </h5>
                  {product?.sku && (
                    <span className="badge bg-light text-dark font-monospace border px-2 py-1 fs-xs">
                      {product.sku}
                    </span>
                  )}
                  {product && (
                    <span
                      className={`badge px-2 py-1 fs-xs ${
                        product.status === 'active'
                          ? 'bg-success text-white'
                          : product.status === 'draft'
                          ? 'bg-secondary text-white'
                          : 'bg-danger text-white'
                      }`}
                    >
                      {product.status || 'Active'}
                    </span>
                  )}
                  {product?.is_featured && (
                    <span className="badge bg-warning-subtle text-warning-emphasis fs-xs">Featured</span>
                  )}
                </div>
                <div className="text-muted fs-xs mt-0.5">
                  Category: <span className="text-dark fw-medium">{product?.category_name || 'General'}</span>
                  {product?.sub_category_name && (
                    <> &bull; Subcategory: <span className="text-dark fw-medium">{product.sub_category_name}</span></>
                  )}
                  {product?.unit_name && (
                    <> &bull; Unit: <span className="text-dark fw-medium">{product.unit_name} ({product.unit_abbr || product.unit || 'pcs'})</span></>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>

          {/* Modal Body */}
          <div className="modal-body p-4 bg-light-subtle">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success mb-3" role="status"></div>
                <p className="text-muted">Fetching deep product specifications and analytics…</p>
              </div>
            ) : !product ? (
              <div className="text-center py-5">
                <i className="ri-error-warning-line fs-1 text-danger mb-2"></i>
                <p className="text-muted">Product details could not be found.</p>
              </div>
            ) : (
              <>
                {/* Highlights KPI Cards */}
                <div className="row g-3 mb-4">
                  {/* Card 1: Stock on Hand */}
                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-xs rounded-3 h-100 bg-white p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="text-muted fs-xs fw-semibold text-uppercase">Stock Level</span>
                        <span
                          className={`badge ${
                            isOutOfStock
                              ? 'bg-danger-subtle text-danger'
                              : isLowStock
                              ? 'bg-warning-subtle text-warning-emphasis'
                              : 'bg-success-subtle text-success'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy Stock'}
                        </span>
                      </div>
                      <div className="d-flex align-items-baseline gap-2">
                        <h3 className="fw-bold font-display text-dark mb-0">{stockQty.toLocaleString()}</h3>
                        <span className="text-muted fs-sm">{product.unit_abbr || product.unit || 'units'}</span>
                      </div>
                      <div className="text-muted fs-xs mt-2 d-flex justify-content-between">
                        <span>Threshold: <strong>{lowThreshold}</strong></span>
                        <span>Track: <strong>{product.track_inventory ? 'Yes' : 'No'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Price & Profit Margin */}
                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-xs rounded-3 h-100 bg-white p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="text-muted fs-xs fw-semibold text-uppercase">Selling &amp; Margin</span>
                        <span className={`badge ${grossProfit >= 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                          {profitMargin}% margin
                        </span>
                      </div>
                      <h3 className="fw-bold font-display text-dark mb-0">{formatNaira(sellingPrice)}</h3>
                      <div className="text-muted fs-xs mt-2 d-flex justify-content-between">
                        <span>Cost: <strong>{costPrice > 0 ? formatNaira(costPrice) : '—'}</strong></span>
                        <span>Profit: <strong className="text-success">{grossProfit > 0 ? formatNaira(grossProfit) : '—'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Inventory Valuation */}
                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-xs rounded-3 h-100 bg-white p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="text-muted fs-xs fw-semibold text-uppercase">Stock Valuation</span>
                        <i className="ri-money-dollar-circle-line text-emerald fs-5"></i>
                      </div>
                      <h3 className="fw-bold font-display text-dark mb-0">{formatNaira(retailValuation)}</h3>
                      <div className="text-muted fs-xs mt-2 d-flex justify-content-between">
                        <span>Retail Total</span>
                        <span>At Cost: <strong>{costPrice > 0 ? formatNaira(costValuation) : '—'}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Sales Performance */}
                  <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-xs rounded-3 h-100 bg-white p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="text-muted fs-xs fw-semibold text-uppercase">Sales Performance</span>
                        <i className="ri-bar-chart-2-line text-primary fs-5"></i>
                      </div>
                      <h3 className="fw-bold font-display text-dark mb-0">
                        {formatNaira(product.sales_stats?.total_revenue || 0)}
                      </h3>
                      <div className="text-muted fs-xs mt-2 d-flex justify-content-between">
                        <span>Sold: <strong>{Number(product.sales_stats?.total_units_sold || 0).toLocaleString()} units</strong></span>
                        <span>Orders: <strong>{product.sales_stats?.total_orders || 0}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Content Layout */}
                <div className="row g-4">
                  {/* Left Column: Visual Gallery & Barcode Card */}
                  <div className="col-12 col-lg-4">
                    {/* Media Card */}
                    <div className="card border-0 shadow-xs rounded-3 bg-white p-3 mb-3">
                      <h6 className="fw-bold text-dark fs-sm mb-3">Product Media</h6>
                      <div
                        className="rounded-3 border overflow-hidden bg-light d-flex align-items-center justify-content-center position-relative mb-2"
                        style={{ height: '240px' }}
                      >
                        {activeImage ? (
                          <img
                            src={activeImage}
                            alt={product.name}
                            className="w-100 h-100 object-fit-contain"
                          />
                        ) : (
                          <div className="text-center text-muted">
                            <i className="ri-image-line fs-1 d-block mb-1"></i>
                            <span className="fs-xs">No image available</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnails */}
                      {allImages.length > 1 && (
                        <div className="d-flex gap-2 overflow-x-auto py-1">
                          {allImages.map((imgUrl, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setActiveImage(imgUrl)}
                              className={`btn p-0 rounded-2 border overflow-hidden flex-shrink-0 ${
                                activeImage === imgUrl ? 'border-primary border-2 shadow-xs' : 'opacity-75'
                              }`}
                              style={{ width: '48px', height: '48px' }}
                            >
                              <img src={imgUrl} alt="" className="w-100 h-100 object-fit-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Barcode Card */}
                    <div className="card border-0 shadow-xs rounded-3 bg-white p-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="fw-bold text-dark fs-sm mb-0">Universal Barcode</h6>
                        <div className="d-flex gap-1">
                          {product.barcode && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border py-0.5 px-1.5"
                                onClick={handleCopyBarcode}
                                title="Copy barcode text"
                              >
                                <i className="ri-file-copy-line"></i>
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border py-0.5 px-1.5"
                                onClick={handlePrintBarcode}
                                title="Print Barcode Tag"
                              >
                                <i className="ri-printer-line"></i>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="bg-light p-3 rounded-3 text-center border">
                        {product.barcode ? (
                          <>
                            <div className="mb-2" id="product-detail-barcode-svg">
                              <BarcodeSvg
                                value={product.barcode}
                                format="CODE128"
                                height={52}
                                width={2.0}
                                displayValue={true}
                              />
                            </div>
                            <span className="font-monospace fs-xs text-muted d-block">
                              Standard 1D Code 128
                            </span>
                          </>
                        ) : (
                          <div className="py-3 text-muted">
                            <i className="ri-barcode-line fs-2 d-block mb-1 opacity-50"></i>
                            <span className="fs-xs">No barcode assigned yet.</span>
                            <div className="mt-2">
                              <Link
                                to="/products/barcode"
                                className="btn btn-xs btn-outline-success"
                                onClick={onClose}
                              >
                                Go to Barcode Studio
                              </Link>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Deep Information Tabs */}
                  <div className="col-12 col-lg-8">
                    <div className="card border-0 shadow-xs rounded-3 bg-white h-100 overflow-hidden">
                      {/* Nav Tabs */}
                      <div className="card-header bg-white border-bottom px-3 pt-3 pb-0">
                        <ul className="nav nav-tabs card-header-tabs border-0 gap-2">
                          <li className="nav-item">
                            <button
                              className={`nav-link border-0 pb-2.5 px-3 fw-semibold fs-sm ${
                                activeTab === 'specs'
                                  ? 'active text-success border-bottom border-success border-2 bg-transparent'
                                  : 'text-muted'
                              }`}
                              onClick={() => setActiveTab('specs')}
                            >
                              <i className="ri-file-list-3-line me-1"></i> Specifications &amp; Details
                            </button>
                          </li>
                          <li className="nav-item">
                            <button
                              className={`nav-link border-0 pb-2.5 px-3 fw-semibold fs-sm ${
                                activeTab === 'orders'
                                  ? 'active text-success border-bottom border-success border-2 bg-transparent'
                                  : 'text-muted'
                              }`}
                              onClick={() => setActiveTab('orders')}
                            >
                              <i className="ri-shopping-cart-line me-1"></i> Recent Orders ({product.recent_orders?.length || 0})
                            </button>
                          </li>
                          <li className="nav-item">
                            <button
                              className={`nav-link border-0 pb-2.5 px-3 fw-semibold fs-sm ${
                                activeTab === 'movements'
                                  ? 'active text-success border-bottom border-success border-2 bg-transparent'
                                  : 'text-muted'
                              }`}
                              onClick={() => setActiveTab('movements')}
                            >
                              <i className="ri-history-line me-1"></i> Stock Log ({product.recent_movements?.length || 0})
                            </button>
                          </li>
                        </ul>
                      </div>

                      {/* Tab Content */}
                      <div className="card-body p-3">
                        {/* TAB 1: Specifications & Details */}
                        {activeTab === 'specs' && (
                          <div>
                            {/* Product Description */}
                            <div className="mb-4">
                              <h6 className="fw-bold text-dark fs-xs text-uppercase mb-2">Description</h6>
                              <div
                                className="bg-light p-3 rounded-3 fs-sm text-dark border"
                                style={{ minHeight: '80px', whiteSpace: 'pre-line' }}
                              >
                                {product.description ? (
                                  product.description
                                ) : (
                                  <span className="text-muted fst-italic">No detailed description provided for this product.</span>
                                )}
                              </div>
                            </div>

                            {/* Technical Specifications Grid */}
                            <h6 className="fw-bold text-dark fs-xs text-uppercase mb-2">Item Attributes</h6>
                            <div className="table-responsive border rounded-3">
                              <table className="table table-sm table-striped mb-0 fs-sm align-middle">
                                <tbody>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3" style={{ width: '35%' }}>Product SKU</td>
                                    <td className="font-monospace fw-bold text-dark">{product.sku || '—'}</td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Universal Barcode</td>
                                    <td className="font-monospace text-dark">{product.barcode || 'Not assigned'}</td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Master Category</td>
                                    <td>
                                      <span className="badge bg-light text-dark border">{product.category_name || 'General'}</span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Sub Category</td>
                                    <td>
                                      {product.sub_category_name ? (
                                        <span className="badge bg-light text-dark border">{product.sub_category_name}</span>
                                      ) : (
                                        <span className="text-muted">—</span>
                                      )}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Unit of Measure</td>
                                    <td>{product.unit_name ? `${product.unit_name} (${product.unit_abbr || product.unit})` : (product.unit || 'pcs')}</td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Available for Sale</td>
                                    <td>
                                      <span className={`badge ${product.available_for_sale !== false ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                        {product.available_for_sale !== false ? 'Yes (Storefront & POS)' : 'No (Hidden)'}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Inventory Tracking</td>
                                    <td>
                                      <span className={`badge ${product.track_inventory ? 'bg-info-subtle text-info-emphasis' : 'bg-secondary-subtle text-secondary'}`}>
                                        {product.track_inventory ? 'Enabled (Auto-decrement)' : 'Disabled'}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Low Stock Threshold</td>
                                    <td><strong>{product.low_stock_threshold || 10}</strong> units</td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Tax Rate / HSN Code</td>
                                    <td>{product.tax_rate ? `${product.tax_rate}%` : '0%'} {product.hsn_code ? `(HSN: ${product.hsn_code})` : ''}</td>
                                  </tr>
                                  <tr>
                                    <td className="text-muted fw-semibold ps-3">Catalog Record Added</td>
                                    <td className="text-muted">
                                      {product.created_at ? new Date(product.created_at).toLocaleString() : '—'}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* TAB 2: Recent Orders History */}
                        {activeTab === 'orders' && (
                          <div className="table-responsive">
                            {product.recent_orders?.length === 0 ? (
                              <div className="text-center py-5 text-muted">
                                <i className="ri-inbox-line fs-2 d-block mb-1"></i>
                                No customer orders recorded for this product yet.
                              </div>
                            ) : (
                              <table className="table table-hover align-middle mb-0 fs-sm text-nowrap">
                                <thead className="table-light text-muted fs-xs text-uppercase">
                                  <tr>
                                    <th>Order Ref</th>
                                    <th>Customer</th>
                                    <th>Qty</th>
                                    <th>Unit Price</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {product.recent_orders.map((o) => (
                                    <tr key={o.id}>
                                      <td>
                                        <Link
                                          to={`/orders/${o.id}`}
                                          className="fw-bold text-success text-decoration-none font-monospace"
                                          onClick={onClose}
                                        >
                                          {o.order_ref || `#${o.id}`}
                                        </Link>
                                      </td>
                                      <td>{o.customer_name || 'Customer'}</td>
                                      <td className="fw-bold">{o.quantity}</td>
                                      <td>{formatNaira(o.price)}</td>
                                      <td className="fw-bold text-dark">{formatNaira(o.total)}</td>
                                      <td>
                                        <span className="badge bg-light text-dark border">{o.status}</span>
                                      </td>
                                      <td className="text-muted fs-xs">
                                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}

                        {/* TAB 3: Stock Movement Audit Log */}
                        {activeTab === 'movements' && (
                          <div className="table-responsive">
                            {product.recent_movements?.length === 0 ? (
                              <div className="text-center py-5 text-muted">
                                <i className="ri-history-line fs-2 d-block mb-1"></i>
                                No inventory movement audit logs found for this item.
                              </div>
                            ) : (
                              <table className="table table-hover align-middle mb-0 fs-sm text-nowrap">
                                <thead className="table-light text-muted fs-xs text-uppercase">
                                  <tr>
                                    <th>Type</th>
                                    <th>Change</th>
                                    <th>Before &rarr; After</th>
                                    <th>Reason / Reference</th>
                                    <th>Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {product.recent_movements.map((m) => (
                                    <tr key={m.id}>
                                      <td>
                                        <span
                                          className={`badge ${
                                            m.type === 'stock_in'
                                              ? 'bg-success-subtle text-success'
                                              : m.type === 'stock_out'
                                              ? 'bg-danger-subtle text-danger'
                                              : 'bg-primary-subtle text-primary'
                                          }`}
                                        >
                                          {m.type}
                                        </span>
                                      </td>
                                      <td className="fw-bold">
                                        {m.type === 'stock_in' ? `+${m.quantity}` : m.type === 'stock_out' ? `-${m.quantity}` : m.quantity}
                                      </td>
                                      <td className="font-monospace text-muted">
                                        {m.before_qty ?? '—'} &rarr; {m.after_qty ?? '—'}
                                      </td>
                                      <td>
                                        <div className="fw-medium text-dark">{m.reason || 'Inventory adjustment'}</div>
                                        {m.reference && <small className="text-muted font-monospace">{m.reference}</small>}
                                      </td>
                                      <td className="text-muted fs-xs">
                                        {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          <div className="modal-footer bg-white border-top px-4 py-3 justify-content-between flex-wrap gap-2">
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-success d-inline-flex align-items-center gap-1.5"
                onClick={() => {
                  onClose?.()
                  if (onScheduleRestock) {
                    onScheduleRestock(product)
                  } else {
                    navigate(`/inventory/schedule?product_id=${product.id}&name=${encodeURIComponent(product.name)}`)
                  }
                }}
              >
                <i className="ri-calendar-event-line"></i>
                Schedule Next Restock
              </button>

              <button
                type="button"
                className="btn btn-outline-primary d-inline-flex align-items-center gap-1.5"
                onClick={() => {
                  onClose?.()
                  if (onEdit) {
                    onEdit(product)
                  } else {
                    navigate(`/products/add?edit=${product.id}`)
                  }
                }}
              >
                <i className="ri-pencil-line"></i>
                Edit Product
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary px-4"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
