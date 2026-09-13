import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const TABS = [
  { key: 'all', label: 'All Reviews' },
  { key: 'approved', label: 'Published' },
  { key: 'rejected', label: 'Hidden' },
]

function StarRating({ rating }) {
  const n = Number(rating) || 0
  return (
    <span className="text-warning" title={`${n} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={i <= n ? 'ri-star-fill' : 'ri-star-line text-muted'}></i>
      ))}
    </span>
  )
}

export default function Reviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('all')
  const [busyId, setBusyId] = useState(null)
  const [deleteItem, setDeleteItem] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/products/reviews', {
        params: { status: tab === 'all' ? undefined : tab, search: search || undefined },
      })
      setReviews(res.data?.reviews || [])
    } catch (err) {
      toast.error('Failed to load reviews')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tab, search])

  useEffect(() => {
    const t = setTimeout(fetchReviews, 250)
    return () => clearTimeout(t)
  }, [fetchReviews])

  async function setStatus(review, status) {
    setBusyId(review.id)
    try {
      await api.patch(`/admin/products/reviews/${review.id}`, { status })
      toast.success(status === 'approved' ? 'Review published' : 'Review hidden')
      fetchReviews()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update review')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return
    setDeleting(true)
    try {
      await api.delete(`/admin/products/reviews/${deleteItem.id}`)
      toast.success('Review deleted')
      setDeleteItem(null)
      fetchReviews()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete review')
    } finally {
      setDeleting(false)
    }
  }

  const counts = useMemo(() => {
    return {
      all: reviews.length,
      approved: reviews.filter((r) => r.status === 'approved').length,
      rejected: reviews.filter((r) => r.status === 'rejected').length,
    }
  }, [reviews])

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3 flex-column flex-md-row d-flex align-items-md-center justify-content-between">
        <div>
          <h6 className="flex-grow-1 mb-0 fw-bold">Reviews</h6>
          <ul className="breadcrumb flex-shrink-0 mb-0">
            <li className="breadcrumb-item"><Link to="/products">Products</Link></li>
            <li className="breadcrumb-item active">Reviews</li>
          </ul>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-header bg-transparent d-flex flex-wrap gap-3 justify-content-between align-items-center border-bottom-0">
          <ul className="nav nav-underline" role="tablist">
            {TABS.map((t) => (
              <li className="nav-item" key={t.key}>
                <button
                  type="button"
                  className={`nav-link ${tab === t.key ? 'active' : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                  {t.key !== 'all' && <span className="badge bg-light text-dark ms-1">{counts[t.key] || 0}</span>}
                </button>
              </li>
            ))}
          </ul>

          <div className="flex-shrink-0">
            <div className="position-relative">
              <input
                type="text"
                className="form-control ps-4"
                placeholder="Search by product, customer, or text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <i className="ri-search-line position-absolute top-50 start-0 translate-middle-y ms-2 text-muted" style={{ fontSize: 14 }}></i>
            </div>
          </div>
        </div>

        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table table-borderless align-middle text-nowrap mb-0">
              <thead className="border-bottom">
                <tr>
                  <th className="fw-medium text-muted">Customer</th>
                  <th className="fw-medium text-muted">Review</th>
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">Status</th>
                  <th className="fw-medium text-muted">Date</th>
                  <th className="fw-medium text-muted">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5">
                      <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                      <span className="text-muted">Loading reviews...</span>
                    </td>
                  </tr>
                ) : reviews.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-5 text-muted">
                      <i className="ri-chat-quote-line fs-32 text-secondary mb-2 d-block"></i>
                      No reviews found.
                    </td>
                  </tr>
                ) : (
                  reviews.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="fw-semibold text-dark">{r.customer_name || 'Unknown'}</div>
                        <small className="text-muted">{r.customer_email || ''}</small>
                      </td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 360 }}>
                        <StarRating rating={r.rating} />
                        {r.title && <div className="fw-semibold text-dark mt-1">{r.title}</div>}
                        {r.body && <div className="text-muted fs-13">{r.body}</div>}
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {r.product_image && (
                            <img src={r.product_image} alt="" width="32" height="32" className="rounded object-fit-cover" />
                          )}
                          <span>{r.product_name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${
                          r.status === 'approved' ? 'bg-success-subtle text-success'
                            : r.status === 'rejected' ? 'bg-danger-subtle text-danger'
                            : 'bg-warning-subtle text-warning'
                        }`}>
                          {r.status === 'approved' ? 'Published' : r.status === 'rejected' ? 'Hidden' : 'Pending'}
                        </span>
                      </td>
                      <td className="text-muted fs-13">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                      </td>
                      <td>
                        <div className="d-flex gap-1">
                          {r.status !== 'approved' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-success py-1 px-2"
                              disabled={busyId === r.id}
                              onClick={() => setStatus(r, 'approved')}
                              title="Publish review"
                            >
                              <i className="ri-eye-line"></i>
                            </button>
                          )}
                          {r.status !== 'rejected' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-warning py-1 px-2"
                              disabled={busyId === r.id}
                              onClick={() => setStatus(r, 'rejected')}
                              title="Hide review"
                            >
                              <i className="ri-eye-off-line"></i>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger py-1 px-2"
                            onClick={() => setDeleteItem(r)}
                            title="Delete review"
                          >
                            <i className="ri-delete-bin-line"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {deleteItem && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered modal-xs">
            <div className="modal-content p-4 text-center border-0 shadow">
              <div className="d-flex justify-content-center mb-3">
                <div className="bg-danger-subtle rounded-circle d-flex align-items-center justify-content-center" style={{ width: 56, height: 56 }}>
                  <i className="ri-delete-bin-line text-danger fs-2"></i>
                </div>
              </div>
              <h5 className="mb-3 lh-base">Delete this review?</h5>
              <div className="d-flex justify-content-center align-items-center gap-2">
                <button type="button" className="btn btn-danger" disabled={deleting} onClick={confirmDelete}>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button type="button" className="btn btn-link text-reset" onClick={() => setDeleteItem(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
