import { useEffect, useState, useCallback } from 'react'
import api from '../../lib/api'

function ProductImage({ url, name }) {
  const [err, setErr] = useState(false)
  if (url && !err) return <img src={url} alt={name} onError={() => setErr(true)} style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
  return (
    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
      🥦
    </div>
  )
}

function StockBadge({ stock }) {
  if (stock == null) return <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
  const n = Number(stock)
  if (n <= 0) return <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Out of stock</span>
  if (n < 10) return <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>Low ({n})</span>
  return <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{n} units</span>
}

export default function CustomerIntelligence({ customerId }) {
  const [data, setData]       = useState(null)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)
  const [activeTab, setTab]   = useState('ordered')

  const load = useCallback(() => {
    setLoading(true); setError('')
    api.get(`/admin/customers/${customerId}/goods-intelligence`)
      .then(r => { setData(r.data); setLoading(false) })
      .catch(() => { setError('Product intelligence could not be loaded.'); setLoading(false) })
  }, [customerId])

  useEffect(() => { setData(null); setTab('ordered'); load() }, [load])

  const TABS = [
    { id: 'ordered',  label: '🛒 Most Ordered',   key: 'most_ordered' },
    { id: 'clicked',  label: '👁 Most Viewed',     key: 'most_clicked' },
    { id: 'wishlist', label: '❤️ Wishlist',         key: 'wishlist'     },
    { id: 'demands',  label: '🔥 OOS Demand',      key: 'demands'      },
  ]

  const current = TABS.find(t => t.id === activeTab)
  const rows    = data?.[current?.key] || []

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 13 }}>Loading product intelligence…</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, color: '#dc2626', fontSize: 13 }}>
      {error} <button onClick={load} style={{ background: 'none', border: 'none', color: '#dc2626', textDecoration: 'underline', cursor: 'pointer' }}>Retry</button>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #f1f5f9', marginBottom: 20 }}>
        {TABS.map(t => {
          const count = data?.[t.key]?.length || 0
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: '9px 16px', border: 'none', borderBottom: activeTab === t.id ? '2px solid #3b82f6' : '2px solid transparent',
                marginBottom: -2, background: 'none', cursor: 'pointer', fontSize: 13,
                fontWeight: activeTab === t.id ? 700 : 500, color: activeTab === t.id ? '#3b82f6' : '#64748b',
                display: 'flex', alignItems: 'center', gap: 6 }}>
              {t.label}
              {count > 0 && (
                <span style={{ background: activeTab === t.id ? '#dbeafe' : '#f1f5f9',
                  color: activeTab === t.id ? '#1d4ed8' : '#94a3b8',
                  borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Table content */}
      {!rows.length ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {activeTab === 'ordered' ? '🛒' : activeTab === 'clicked' ? '👁' : activeTab === 'wishlist' ? '❤️' : '🔥'}
          </div>
          <div style={{ fontSize: 13 }}>
            {activeTab === 'ordered'  ? 'No orders placed yet.' :
             activeTab === 'clicked'  ? 'No product views recorded.' :
             activeTab === 'wishlist' ? 'No items saved to wishlist.' :
             'No out-of-stock demand recorded.'}
          </div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={th}>#</th>
                <th style={th}>Product</th>
                {activeTab === 'ordered'  && <><th style={th}>Orders</th><th style={th}>Qty</th><th style={th}>Spent</th><th style={th}>Last Order</th></>}
                {activeTab === 'clicked'  && <><th style={th}>Views</th><th style={th}>Last Viewed</th></>}
                {activeTab === 'wishlist' && <><th style={th}>Price</th><th style={th}>Availability</th></>}
                {activeTab === 'demands'  && <><th style={th}>Requested</th><th style={th}>Stock at time</th></>}
                <th style={th}>Current Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => (
                <tr key={`${p.product_id}-${i}`}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ borderBottom: '1px solid #f8fafc', transition: 'background .1s' }}>
                  <td style={td}>
                    <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 12 }}>#{i + 1}</span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ProductImage url={p.image_url} name={p.product_name} />
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.product_name || 'Unavailable product'}</div>
                        {p.product_id && <div style={{ fontSize: 11, color: '#94a3b8' }}>ID #{p.product_id}</div>}
                      </div>
                    </div>
                  </td>
                  {activeTab === 'ordered' && <>
                    <td style={td}><span style={{ fontWeight: 700, color: '#3b82f6' }}>{p.times_ordered}×</span></td>
                    <td style={td}>{p.total_quantity} units</td>
                    <td style={td}><span style={{ fontWeight: 600, color: '#16a34a' }}>₦{Number(p.total_spent || 0).toLocaleString()}</span></td>
                    <td style={td}><span style={{ fontSize: 11, color: '#64748b' }}>{p.last_ordered_at ? new Date(p.last_ordered_at).toLocaleDateString('en-GB') : '—'}</span></td>
                  </>}
                  {activeTab === 'clicked' && <>
                    <td style={td}><span style={{ fontWeight: 700, color: '#8b5cf6' }}>{p.click_count} views</span></td>
                    <td style={td}><span style={{ fontSize: 11, color: '#64748b' }}>{p.last_viewed ? new Date(p.last_viewed).toLocaleDateString('en-GB') : '—'}</span></td>
                  </>}
                  {activeTab === 'wishlist' && <>
                    <td style={td}>{p.price != null ? `₦${Number(p.price).toLocaleString()}` : '—'}</td>
                    <td style={td}>{p.in_stock ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Available</span> : <span style={{ color: '#ef4444', fontWeight: 600 }}>✗ Out of stock</span>}</td>
                  </>}
                  {activeTab === 'demands' && <>
                    <td style={td}><span style={{ fontSize: 11, color: '#64748b' }}>{p.created_at ? new Date(p.created_at).toLocaleString('en-GB') : '—'}</span></td>
                    <td style={td}><StockBadge stock={0} /></td>
                  </>}
                  <td style={td}><StockBadge stock={p.stock} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* OOS note */}
      {activeTab === 'demands' && rows.length > 0 && (
        <div style={{ marginTop: 16, padding: '10px 16px', background: '#fff7ed', borderRadius: 8,
          border: '1px solid #fed7aa', fontSize: 12, color: '#c2410c' }}>
          🔥 These items were out of stock when this customer clicked on them. Review for replenishment. See <strong>Customers → Product Demand</strong> for the full cross-customer ranking.
        </div>
      )}
    </div>
  )
}

const th = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: '#64748b', letterSpacing: '.04em', textTransform: 'uppercase' }
const td = { padding: '12px 12px', verticalAlign: 'middle' }
