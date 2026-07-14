import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import PageHeader from '../../components/ui/PageHeader'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = n  => `₦${Number(n || 0).toLocaleString('en-NG')}`
const fmtN  = n  => Number(n || 0).toLocaleString()
const ini   = n  => (n || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const today      = new Date().toISOString().slice(0, 10)
const monthStart = today.slice(0, 7) + '-01'

const AVATAR_COLORS = [
  '#405189', '#0ab39c', '#f7b84b', '#f06548', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#84cc16',
]

// ─── Shared style atoms ────────────────────────────────────────────────────────
const B   = '#e5e7eb'
const S   = '#6b7280'
const card = {
  background: '#fff',
  borderRadius: 12,
  border: `1px solid ${B}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
}
const inp = {
  padding: '8px 12px',
  border: `1.5px solid ${B}`,
  borderRadius: 8,
  fontFamily: 'Nunito, sans-serif',
  fontSize: 13,
  outline: 'none',
  background: '#fff',
  color: '#111827',
}

const TH = ({ children, right }) => (
  <th style={{
    padding: '9px 14px',
    fontSize: 10,
    fontWeight: 700,
    color: S,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap',
    background: '#f8fafc',
    borderBottom: `1px solid ${B}`,
    textAlign: right ? 'right' : 'left',
  }}>
    {children}
  </th>
)

const TD = ({ children, style }) => (
  <td style={{
    padding: '10px 14px',
    fontSize: 13,
    borderBottom: '1px solid #f9fafb',
    verticalAlign: 'middle',
    color: '#111827',
    ...style,
  }}>
    {children}
  </td>
)

// ─── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 9 }) {
  return (
    <tr>
      {[...Array(cols)].map((_, j) => (
        <TD key={j}>
          <div style={{ height: 12, background: '#f0f0f0', borderRadius: 4, width: j === 1 ? 140 : 60 }} />
        </TD>
      ))}
    </tr>
  )
}

// ─── KPI stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg, sub }) {
  return (
    <div style={{ ...card, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={icon} style={{ fontSize: 22, color }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: S, fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', fontFamily: 'Syne, sans-serif', lineHeight: 1.1 }}>{value}</div>
        {sub && <div style={{ fontSize: 10, color: S, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ─── Segment card ─────────────────────────────────────────────────────────────
function SegmentCard({ label, count, total, icon, color, bg, desc }) {
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
  return (
    <div style={{ ...card, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={icon} style={{ fontSize: 20, color }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, padding: '3px 10px', borderRadius: 50 }}>
          {pct}%
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', fontFamily: 'Syne, sans-serif' }}>{fmtN(count)}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: S, marginTop: 4 }}>{desc}</div>
    </div>
  )
}

// ─── Active / Inactive badge ───────────────────────────────────────────────────
function StatusBadge({ lastPurchase }) {
  const isActive = lastPurchase && (Date.now() - new Date(lastPurchase).getTime()) < 30 * 24 * 60 * 60 * 1000
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 10,
      fontWeight: 700,
      padding: '3px 9px',
      borderRadius: 50,
      background: isActive ? '#f0fdf4' : '#fef2f2',
      color: isActive ? '#16a34a' : '#dc2626',
      border: `1px solid ${isActive ? '#bbf7d0' : '#fecaca'}`,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({ page, pages, total, limit, onChange }) {
  if (pages <= 1) return null
  const from = (page - 1) * limit + 1
  const to   = Math.min(page * limit, total)
  return (
    <div style={{ padding: '12px 16px', borderTop: `1px solid ${B}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: S }}>
        Showing {fmtN(from)}–{fmtN(to)} of {fmtN(total)} customers
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          disabled={page === 1}
          onClick={() => onChange(1)}
          style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${B}`, background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#9ca3af' : '#374151', fontSize: 12, cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >«</button>
        <button
          disabled={page === 1}
          onClick={() => onChange(page - 1)}
          style={{ padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${B}`, background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#9ca3af' : '#374151', fontSize: 12, cursor: page === 1 ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >‹ Prev</button>
        {[...Array(Math.min(pages, 5))].map((_, i) => {
          let p = i + 1
          if (pages > 5) {
            if (page <= 3) p = i + 1
            else if (page >= pages - 2) p = pages - 4 + i
            else p = page - 2 + i
          }
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${page === p ? '#1B4332' : B}`, background: page === p ? '#1B4332' : '#fff', color: page === p ? '#fff' : '#374151', fontSize: 12, cursor: 'pointer', fontFamily: 'Nunito, sans-serif', fontWeight: page === p ? 700 : 400 }}
            >{p}</button>
          )
        })}
        <button
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
          style={{ padding: '5px 12px', borderRadius: 7, border: `1.5px solid ${B}`, background: page >= pages ? '#f9fafb' : '#fff', color: page >= pages ? '#9ca3af' : '#374151', fontSize: 12, cursor: page >= pages ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >Next ›</button>
        <button
          disabled={page >= pages}
          onClick={() => onChange(pages)}
          style={{ padding: '5px 10px', borderRadius: 7, border: `1.5px solid ${B}`, background: page >= pages ? '#f9fafb' : '#fff', color: page >= pages ? '#9ca3af' : '#374151', fontSize: 12, cursor: page >= pages ? 'default' : 'pointer', fontFamily: 'Nunito, sans-serif' }}
        >»</button>
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
const LIMIT = 20

const DEFAULT_DATA = {
  stats:    { total: 0, new_this_month: 0, active: 0, avg_order_value: 0 },
  customers: [],
  segments: { returning: 0, one_time: 0, vip: 0, at_risk: 0 },
  growth:   { this_month: 0, last_month: 0 },
  total: 0,
  page: 1,
  pages: 1,
}

export default function CustomerReport() {
  const navigate = useNavigate()

  const [data, setData]       = useState(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [sortBy, setSortBy]   = useState('total_spending')
  const [from, setFrom]       = useState(monthStart)
  const [to, setTo]           = useState(today)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/customers/report', {
        params: { search, from, to, sort_by: sortBy, page, limit: LIMIT },
      })
      setData({ ...DEFAULT_DATA, ...res.data })
    } catch {
      toast.error('Failed to load customer report')
      setData(DEFAULT_DATA)
    } finally {
      setLoading(false)
    }
  }, [search, from, to, sortBy, page])

  useEffect(() => { load() }, [load])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  // ── Derived ────────────────────────────────────────────────────────────────
  const { stats, customers, segments, growth } = data
  const growthRate = growth.last_month > 0
    ? (((growth.this_month - growth.last_month) / growth.last_month) * 100).toFixed(1)
    : growth.this_month > 0 ? '∞' : '0.0'
  const growthPositive = growth.this_month >= growth.last_month

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleExport = type => toast(`${type} export coming soon`, { icon: type === 'CSV' ? '📄' : '📑' })

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'Nunito, sans-serif' }}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <PageHeader
        title="Customer Report"
        subtitle={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: S }}>
            <Link to="/dashboard" style={{ color: '#0ab39c', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
            <i className="ri-arrow-right-s-line" style={{ fontSize: 13 }} />
            <Link to="/customers" style={{ color: '#0ab39c', textDecoration: 'none', fontWeight: 600 }}>Customers</Link>
            <i className="ri-arrow-right-s-line" style={{ fontSize: 13 }} />
            <span style={{ color: S }}>Customer Report</span>
          </span>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleExport('CSV')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${B}`, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'Nunito, sans-serif' }}
            >
              <i className="ri-file-text-line" style={{ color: '#0ab39c' }} /> Export CSV
            </button>
            <button
              onClick={() => handleExport('PDF')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#1B4332', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'Nunito, sans-serif' }}
            >
              <i className="ri-file-pdf-line" /> Export PDF
            </button>
          </div>
        }
      />

      {/* ── Stats Row ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard
          label="Total Customers"
          value={fmtN(stats.total)}
          icon="ri-user-3-line"
          color="#405189"
          bg="#eef2ff"
          sub="All registered customers"
        />
        <StatCard
          label="New This Month"
          value={fmtN(stats.new_this_month)}
          icon="ri-user-add-line"
          color="#0ab39c"
          bg="#e6faf7"
          sub={`Since ${new Date(monthStart).toLocaleDateString('en-NG', { day:'numeric', month:'short' })}`}
        />
        <StatCard
          label="Active Customers"
          value={fmtN(stats.active)}
          icon="ri-user-star-line"
          color="#f7b84b"
          bg="#fff8e1"
          sub="Ordered in last 30 days"
        />
        <StatCard
          label="Avg Order Value"
          value={fmt(stats.avg_order_value)}
          icon="ri-money-dollar-circle-line"
          color="#f06548"
          bg="#fff1ee"
          sub="Per completed order"
        />
      </div>

      {/* ── Filter Bar ───────────────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>

          {/* Date range */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: S, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>From</div>
            <input
              type="date"
              value={from}
              max={to}
              onChange={e => { setFrom(e.target.value); setPage(1) }}
              style={inp}
            />
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: S, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>To</div>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={e => { setTo(e.target.value); setPage(1) }}
              style={inp}
            />
          </div>

          {/* Search */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: S, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Search</div>
            <div style={{ position: 'relative' }}>
              <i className="ri-search-line" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 14, pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Name, email or phone…"
                style={{ ...inp, paddingLeft: 32, width: '100%', boxSizing: 'border-box' }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1) }} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', padding: 0, fontSize: 16 }}>
                  <i className="ri-close-line" />
                </button>
              )}
            </div>
          </div>

          {/* Sort */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: S, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sort By</div>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1) }}
              style={{ ...inp, cursor: 'pointer', paddingRight: 28 }}
            >
              <option value="total_spending">Highest Spending</option>
              <option value="total_orders">Most Orders</option>
              <option value="latest_purchase">Latest Purchase</option>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Export */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleExport('CSV')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${B}`, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}
            >
              <i className="ri-download-line" style={{ color: '#0ab39c' }} /> CSV
            </button>
            <button
              onClick={() => handleExport('PDF')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${B}`, background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}
            >
              <i className="ri-file-pdf-line" style={{ color: '#f06548' }} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Top Customers Table ───────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 20 }}>
        {/* Table header bar */}
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', fontFamily: 'Syne, sans-serif' }}>
              Top Customers
            </span>
            <span style={{ fontSize: 12, color: S, marginLeft: 10 }}>
              {fmtN(data.total)} result{data.total !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: S }}>Sort:</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1B4332' }}>
              {{
                total_spending: 'Highest Spending',
                total_orders:   'Most Orders',
                latest_purchase: 'Latest Purchase',
                newest: 'Newest',
                oldest: 'Oldest',
              }[sortBy] || sortBy}
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <TH>#</TH>
                <TH>Customer</TH>
                <TH>Contact</TH>
                <TH right>Total Orders</TH>
                <TH right>Total Spending</TH>
                <TH right>Avg Order</TH>
                <TH>Last Purchase</TH>
                <TH>Status</TH>
                <TH>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {loading && [...Array(8)].map((_, i) => <SkeletonRow key={i} cols={9} />)}

              {!loading && customers.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '56px 0', color: '#9ca3af', fontSize: 13 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <i className="ri-user-search-line" style={{ fontSize: 26, color: '#d1d5db' }} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No customers found</div>
                    <div style={{ fontSize: 12 }}>Try adjusting your filters or search query.</div>
                  </td>
                </tr>
              )}

              {!loading && customers.map((c, i) => {
                const rank   = (page - 1) * LIMIT + i + 1
                const isTop3 = rank <= 3
                return (
                  <tr
                    key={c.id}
                    style={{ background: '#fff', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                  >
                    {/* Rank */}
                    <TD style={{ fontWeight: 700, color: isTop3 ? ['#f7b84b','#9ca3af','#c2410c'][rank-1] : S, fontSize: 13, width: 40, textAlign: 'center' }}>
                      {isTop3
                        ? <i className={`ri-${['medal-line','medal-2-line','award-line'][rank-1]}`} style={{ fontSize: 16 }} />
                        : rank
                      }
                    </TD>

                    {/* Customer */}
                    <TD>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12, flexShrink: 0,
                        }}>
                          {ini(c.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>{c.name || '—'}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>
                            Joined {c.created_at ? new Date(c.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' }) : '—'}
                          </div>
                        </div>
                      </div>
                    </TD>

                    {/* Contact */}
                    <TD>
                      <div style={{ fontSize: 12, color: '#374151' }}>{c.email || '—'}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{c.phone || '—'}</div>
                    </TD>

                    {/* Total Orders */}
                    <TD style={{ textAlign: 'right', fontWeight: 700, color: '#405189' }}>
                      {fmtN(c.total_orders)}
                    </TD>

                    {/* Total Spending */}
                    <TD style={{ textAlign: 'right', fontWeight: 700, color: '#1B4332' }}>
                      {fmt(c.total_spending)}
                    </TD>

                    {/* Avg Order Value */}
                    <TD style={{ textAlign: 'right', color: S }}>
                      {fmt(c.avg_order_value)}
                    </TD>

                    {/* Last Purchase */}
                    <TD style={{ color: S, fontSize: 12, whiteSpace: 'nowrap' }}>
                      {c.last_purchase
                        ? new Date(c.last_purchase).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })
                        : <span style={{ color: '#d1d5db' }}>Never</span>
                      }
                    </TD>

                    {/* Status */}
                    <TD><StatusBadge lastPurchase={c.last_purchase} /></TD>

                    {/* Actions */}
                    <TD>
                      <button
                        title="View Customer"
                        onClick={() => navigate(`/customers/${c.id}`)}
                        style={{
                          width: 30, height: 30, borderRadius: '50%',
                          border: '1.5px solid #bfdbfe', background: '#eff6ff',
                          color: '#2563eb', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        <i className="ri-eye-line" style={{ fontSize: 13 }} />
                      </button>
                    </TD>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={data.page}
          pages={data.pages}
          total={data.total}
          limit={LIMIT}
          onChange={p => setPage(p)}
        />
      </div>

      {/* ── Growth & Segments Row ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Growth Chart */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${B}` }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', fontFamily: 'Syne, sans-serif' }}>
              Customer Growth
            </span>
          </div>

          {/* Chart placeholder */}
          <div style={{
            margin: '18px',
            borderRadius: 10,
            background: 'linear-gradient(135deg, #f0fdf4 0%, #e6faf7 100%)',
            border: `1.5px dashed #0ab39c`,
            padding: '40px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#ccf0ea', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <i className="ri-line-chart-line" style={{ fontSize: 26, color: '#0ab39c' }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1B4332', marginBottom: 4 }}>Customer Growth Chart</div>
            <div style={{ fontSize: 11, color: S }}>Chart integration coming soon</div>
          </div>

          {/* Growth summary numbers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, borderTop: `1px solid ${B}` }}>
            {[
              { label: 'This Month', value: fmtN(growth.this_month), color: '#0ab39c', icon: 'ri-user-add-line' },
              { label: 'Last Month', value: fmtN(growth.last_month), color: '#405189', icon: 'ri-user-3-line' },
              {
                label: 'Growth Rate',
                value: `${growthRate}%`,
                color: growthPositive ? '#16a34a' : '#dc2626',
                icon: growthPositive ? 'ri-arrow-up-line' : 'ri-arrow-down-line',
              },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '14px 16px',
                borderRight: i < 2 ? `1px solid ${B}` : 'none',
                textAlign: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                  <i className={item.icon} style={{ color: item.color, fontSize: 14 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: S, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: item.color, fontFamily: 'Syne, sans-serif' }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Segments */}
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', fontFamily: 'Syne, sans-serif' }}>
              Customer Segments
            </span>
            <span style={{ fontSize: 11, color: S }}>{fmtN(stats.total)} total</span>
          </div>
          <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SegmentCard
              label="Returning"
              count={segments.returning}
              total={stats.total}
              icon="ri-refresh-line"
              color="#405189"
              bg="#eef2ff"
              desc="Ordered more than once"
            />
            <SegmentCard
              label="One-time"
              count={segments.one_time}
              total={stats.total}
              icon="ri-user-received-line"
              color="#f7b84b"
              bg="#fff8e1"
              desc="Ordered exactly once"
            />
            <SegmentCard
              label="VIP"
              count={segments.vip}
              total={stats.total}
              icon="ri-vip-crown-2-line"
              color="#8b5cf6"
              bg="#f5f3ff"
              desc="Top 10% by spending"
            />
            <SegmentCard
              label="At-risk"
              count={segments.at_risk}
              total={stats.total}
              icon="ri-alarm-warning-line"
              color="#f06548"
              bg="#fff1ee"
              desc="No order in 60+ days"
            />
          </div>
        </div>
      </div>

      {/* ── Segment Summary Bar ───────────────────────────────────────────────── */}
      {stats.total > 0 && (
        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: S, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Segment Distribution
          </div>
          <div style={{ display: 'flex', height: 10, borderRadius: 50, overflow: 'hidden', gap: 2 }}>
            {[
              { key: 'returning', color: '#405189' },
              { key: 'one_time',  color: '#f7b84b' },
              { key: 'vip',       color: '#8b5cf6' },
              { key: 'at_risk',   color: '#f06548' },
            ].map(seg => {
              const pct = stats.total > 0 ? (segments[seg.key] / stats.total) * 100 : 0
              return pct > 0 ? (
                <div
                  key={seg.key}
                  title={`${seg.key}: ${pct.toFixed(1)}%`}
                  style={{ flex: pct, background: seg.color, minWidth: 4 }}
                />
              ) : null
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Returning', key: 'returning', color: '#405189' },
              { label: 'One-time',  key: 'one_time',  color: '#f7b84b' },
              { label: 'VIP',       key: 'vip',       color: '#8b5cf6' },
              { label: 'At-risk',   key: 'at_risk',   color: '#f06548' },
            ].map(seg => (
              <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                <span style={{ color: S }}>{seg.label}</span>
                <span style={{ fontWeight: 700, color: '#374151' }}>{fmtN(segments[seg.key])}</span>
                <span style={{ color: '#d1d5db' }}>·</span>
                <span style={{ color: S }}>{stats.total > 0 ? ((segments[seg.key] / stats.total) * 100).toFixed(1) : '0.0'}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
