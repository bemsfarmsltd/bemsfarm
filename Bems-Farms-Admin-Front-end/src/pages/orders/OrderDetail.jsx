import { useParams, Link } from 'react-router-dom'

const MOCK_ORDER = {
  id: 'BF-2026-000124', date: 'Thursday, June 25, 2026 at 10:12 AM',
  status: 'dispatched', paymentStatus: 'paid', paymentMethod: 'POS Card',
  customer: { name: 'Amara Obi', email: 'amara@email.com', phone: '0801 234 5678', address: '14 Awolowo Road, Victoria Island, Lagos' },
  driver: { name: 'Emeka Nwosu', phone: '0801 234 5678', eta: '12 min' },
  items: [
    { name: 'Jollof Rice (Family Pack)', sku: 'MEAL-001', qty: 2, price: '₦6,500', total: '₦13,000' },
    { name: 'Moin Moin (6 wraps)',       sku: 'SIDE-003', qty: 1, price: '₦2,800', total: '₦2,800'  },
    { name: 'Zobo Drink (1L)',           sku: 'DRK-007',  qty: 2, price: '₦1,200', total: '₦2,400'  },
    { name: 'Fried Plantain',            sku: 'SIDE-001', qty: 1, price: '₦300',   total: '₦300'    },
  ],
  subtotal: '₦18,500', delivery: '₦800', discount: '₦0', total: '₦19,300',
  notes: 'No pepper please. Call on arrival.',
}

const statusColor = { dispatched: 'info', delivered: 'success', pending: 'warning', preparing: 'primary', cancelled: 'danger' }

export default function OrderDetail() {
  const { id } = useParams()
  const o = MOCK_ORDER

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center gap-3 mb-5">
        <Link to="/orders" className="btn btn-sm btn-outline-light border">
          <i className="ri-arrow-left-line"></i>
        </Link>
        <div>
          <h4 className="fs-xl mb-0">Order {o.id}</h4>
          <p className="text-muted mb-0 fs-sm">{o.date}</p>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2">
          <span className={`badge bg-${statusColor[o.status]}-subtle text-${statusColor[o.status]} fs-sm px-3 py-2`}>
            {o.status.charAt(0).toUpperCase() + o.status.slice(1)}
          </span>
          <button className="btn btn-outline-light border btn-sm">
            <i className="ri-printer-line me-1"></i>Print Invoice
          </button>
        </div>
      </div>

      <div className="row g-4">
        {/* Order items */}
        <div className="col-xl-8">
          <div className="card mb-4">
            <div className="card-header"><h6 className="fw-semibold mb-0">Order Items</h6></div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-nowrap mb-0">
                  <thead className="table-light">
                    <tr><th>Item</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                  </thead>
                  <tbody>
                    {o.items.map(item => (
                      <tr key={item.sku}>
                        <td className="fw-medium">{item.name}</td>
                        <td className="text-muted fs-sm">{item.sku}</td>
                        <td>{item.qty}</td>
                        <td>{item.price}</td>
                        <td className="fw-semibold">{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer">
              <div className="row justify-content-end">
                <div className="col-md-4">
                  <div className="d-flex flex-column gap-1 fs-sm">
                    <div className="d-flex justify-content-between"><span className="text-muted">Subtotal</span><span>{o.subtotal}</span></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">Delivery Fee</span><span>{o.delivery}</span></div>
                    <div className="d-flex justify-content-between"><span className="text-muted">Discount</span><span className="text-success">{o.discount}</span></div>
                    <div className="d-flex justify-content-between fw-bold border-top pt-2 mt-1"><span>Total</span><span className="text-primary">{o.total}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Update status */}
          <div className="card mb-0">
            <div className="card-header"><h6 className="fw-semibold mb-0">Update Status</h6></div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {['Pending', 'Confirmed', 'Preparing', 'Dispatched', 'Delivered', 'Cancelled'].map(s => (
                  <button key={s}
                    className={`btn btn-sm ${o.status.toLowerCase() === s.toLowerCase() ? 'btn-primary' : 'btn-outline-light border'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div className="col-xl-4">
          {/* Customer */}
          <div className="card mb-4">
            <div className="card-header"><h6 className="fw-semibold mb-0">Customer</h6></div>
            <div className="card-body d-flex flex-column gap-2">
              <Link to={`/customers/${o.customer.email}`} className="fw-medium link link-custom">{o.customer.name}</Link>
              <div className="d-flex gap-2 fs-sm align-items-center">
                <i className="ri-mail-line text-muted"></i>{o.customer.email}
              </div>
              <div className="d-flex gap-2 fs-sm align-items-center">
                <i className="ri-phone-line text-muted"></i>{o.customer.phone}
              </div>
              <div className="d-flex gap-2 fs-sm align-items-start">
                <i className="ri-map-pin-line text-muted mt-1"></i>
                <span>{o.customer.address}</span>
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="card mb-4">
            <div className="card-header"><h6 className="fw-semibold mb-0">Delivery</h6></div>
            <div className="card-body d-flex flex-column gap-2">
              <div className="d-flex justify-content-between fs-sm">
                <span className="text-muted">Driver</span>
                <span className="fw-medium">{o.driver.name}</span>
              </div>
              <div className="d-flex justify-content-between fs-sm">
                <span className="text-muted">Phone</span>
                <span>{o.driver.phone}</span>
              </div>
              <div className="d-flex justify-content-between fs-sm">
                <span className="text-muted">ETA</span>
                <span className="fw-semibold text-success">{o.driver.eta}</span>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="card mb-4">
            <div className="card-header"><h6 className="fw-semibold mb-0">Payment</h6></div>
            <div className="card-body d-flex flex-column gap-2">
              <div className="d-flex justify-content-between fs-sm">
                <span className="text-muted">Method</span>
                <span className="fw-medium">{o.paymentMethod}</span>
              </div>
              <div className="d-flex justify-content-between fs-sm">
                <span className="text-muted">Status</span>
                <span className="badge bg-success-subtle text-success">Paid</span>
              </div>
              <div className="d-flex justify-content-between fs-sm">
                <span className="text-muted">Amount</span>
                <span className="fw-bold text-primary">{o.total}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {o.notes && (
            <div className="card mb-0">
              <div className="card-header"><h6 className="fw-semibold mb-0">Customer Notes</h6></div>
              <div className="card-body">
                <p className="text-muted fs-sm mb-0 fst-italic">"{o.notes}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
