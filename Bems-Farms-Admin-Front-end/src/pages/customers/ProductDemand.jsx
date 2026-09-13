import { useEffect, useState } from 'react'
import api from '../../lib/api'

function StockStatus({ stock }) {
  if (stock == null) return <span style={{ color: '#94a3b8' }}>—</span>
  const n = Number(stock)
  if (n <= 0)  return <span style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>Out of stock</span>
  if (n < 10)  return <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>Low ({n})</span>
  return <span style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12 }}>{n} in stock</span>
}

function Rec({ stock }) {
  if (stock == null) return <span style={{ color: '#94a3b8', fontSize: 12 }}>Check product record</span>
  if (Number(stock) <= 0) return <span style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>🔴 Review for replenishment</span>
  if (Number(stock) < 10) return <span style={{ color: '#d97706', fontSize: 12, fontWeight: 600 }}>🟡 Stock low — order soon</span>
  return <span style={{ color: '#16a34a', fontSize: 12 }}>🟢 Stock available — monitor demand</span>
}

function HeatBar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const color = pct >= 66 ? '#dc2626' : pct >= 33 ? '#f59e0b' : '#3b82f6'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 28 }}>{value}</span>
    </div>
  )
}

export default function ProductDemand() {
  const [rows, setRows]       = useState([])
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy]   = useState('demand_clicks')

  useEffect(() => {
    api.get('/telemetry/demand-summary')
      .then(r => { setRows(r.data.demand || []); setLoading(false) })
      .catch(() => { setError('Demand data could not be loaded.'); setLoading(false) })
  }, [])

  const sorted = [...rows].sort((a, b) => Number(b[sortBy] || 0) - Number(a[sortBy] || 0))
  const maxClicks = Math.max(...rows.map(r => Number(r.demand_clicks || 0)), 1)

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>🔥 Product Demand Intelligence</h1>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: 14 }}>
          Out-of-stock products that customers clicked on in the last 30 days. Use this to guide your next purchase order.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 16, color: '#dc2626', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔥</div>
            <div>Loading demand data…</div>
          </div>
        </div>
      ) : !rows.length ? (
        <div style={{ background: '#fff', borderRadius: 16, padding: 64, textAlign: 'center', color: '#94a3b8', border: '1px solid #f1f5f9' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#475569', marginBottom: 6 }}>No demand recorded in the last 30 days</div>
          <div style={{ fontSize: 13 }}>When customers click on out-of-stock products, they'll appear here automatically.</div>
        </div>
      ) : (
        <>
          {/* Stats bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Products with demand', value: rows.length, color: '#dc2626', icon: '🛍️' },
              { label: 'Total demand clicks',  value: rows.reduce((s,r) => s + Number(r.demand_clicks || 0), 0), color: '#d97706', icon: '🖱️' },
              { label: 'Unique customers',     value: rows.reduce((s,r) => s + Number(r.unique_customers || 0), 0), color: '#8b5cf6', icon: '👤' },
              { label: 'Guest clicks',         value: rows.reduce((s,r) => s + Number(r.guest_clicks || 0), 0), color: '#3b82f6', icon: '🌐' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #f1f5f9', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{Number(s.value).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Sort control */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b', alignSelf: 'center' }}>Sort by:</span>
            {[
              { key: 'demand_clicks',    label: 'Total Clicks' },
              { key: 'unique_customers', label: 'Unique Customers' },
              { key: 'guest_clicks',     label: 'Guest Clicks' },
            ].map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid',
                  borderColor: sortBy === s.key ? '#3b82f6' : '#e2e8f0',
                  background: sortBy === s.key ? '#dbeafe' : '#fff',
                  color: sortBy === s.key ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #f1f5f9' }}>
                  {['Rank','Product','Demand Clicks','Customers','Guest Clicks','Stock','Action'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 11,
                      color: '#64748b', letterSpacing: '.04em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((p, i) => (
                  <tr key={p.product_id}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ borderBottom: '1px solid #f8fafc', transition: 'background .1s' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: '50%', fontWeight: 800, fontSize: 12,
                        background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : i === 2 ? '#fdf4ff' : '#f8fafc',
                        color: i === 0 ? '#d97706' : i === 1 ? '#475569' : i === 2 ? '#7c3aed' : '#94a3b8'
                      }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{p.product_name || 'Unavailable product'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>ID #{p.product_id}</div>
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: 140 }}>
                      <HeatBar value={Number(p.demand_clicks)} max={maxClicks} />
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontWeight: 700, color: '#8b5cf6' }}>{p.unique_customers}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}> customers</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#64748b' }}>{p.guest_clicks}</td>
                    <td style={{ padding: '14px 16px' }}><StockStatus stock={p.stock} /></td>
                    <td style={{ padding: '14px 16px' }}><Rec stock={p.stock} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            💡 Review stock levels, supplier lead times, and actual sales history before placing a purchase order. Guest clicks are not unique customers.
          </div>
        </>
      )}
    </div>
  )
}
