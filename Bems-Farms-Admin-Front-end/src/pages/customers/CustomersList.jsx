import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const fmt    = n => `₦${Number(n || 0).toLocaleString()}`
const ini    = name => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const fmtPts = n => Number(n || 0).toLocaleString() + ' pts'
const fmtDate = d => {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10)
}
const fmtLogin = d => {
  if (!d) return 'Never'
  const date = new Date(d)
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const TIER_CFG = {
  Platinum:{ bg:'#f5f3ff', color:'#7c3aed', border:'#ddd6fe', icon:'ri-vip-crown-2-fill'  },
  Gold:    { bg:'#fffbeb', color:'#d97706', border:'#fde68a', icon:'ri-medal-2-fill'       },
  Silver:  { bg:'#f8fafc', color:'#64748b', border:'#cbd5e1', icon:'ri-award-fill'         },
  Bronze:  { bg:'#fff7ed', color:'#c2410c', border:'#fed7aa', icon:'ri-star-half-fill'     },
}
const STATUS_CFG = {
  active:  { bg:'#f0fdf4', color:'#16a34a', border:'#bbf7d0', label:'Active'   },
  inactive:{ bg:'#fef2f2', color:'#dc2626', border:'#fecaca', label:'Inactive' },
}
const CHANNEL_CFG = {
  app:    { label: 'Mobile App', icon: 'ri-smartphone-line', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  web:    { label: 'Web Store',  icon: 'ri-global-line',     bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  pos:    { label: 'POS Store',  icon: 'ri-store-2-line',    bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  admin:  { label: 'Admin Desk', icon: 'ri-shield-user-line',bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
}
const AVATAR_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#0ea5e9','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16']

export default function CustomersList() {
  const [customers, setCustomers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [filterTier, setTier] = useState('all')
  const [filterSt, setSt]     = useState('all')
  const [selected, setSelected] = useState(null)
  const [modal, setModal]     = useState(null) // 'delete'
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword]   = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/customers', {
        params: {
          limit: 100,
          search: search || undefined,
          tier: filterTier !== 'all' ? filterTier : undefined,
          status: filterSt !== 'all' ? filterSt : undefined,
        },
      })
      setCustomers(res.data.customers || [])
      setStats(res.data.stats || null)
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [search, filterTier, filterSt])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  const closeModal = () => {
    setModal(null)
    setSelected(null)
    setAdminPassword('')
    setShowPassword(false)
    setDeleting(false)
  }

  async function toggleStatus(c) {
    const newStatus = c.status === 'active' ? 'inactive' : 'active'
    setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x))
    try {
      const target = (c.id != null && String(c.id) !== 'null') ? c.id : (c.customer_code && c.customer_code !== 'null' ? c.customer_code : c.email)
      await api.patch(`/admin/customers/${target}/status`, { status: newStatus })
      toast.success(`Customer ${c.name || ''} marked as ${newStatus}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
      setCustomers(prev => prev.map(x => x.id === c.id ? { ...x, status: c.status } : x))
    }
  }

  async function deleteCustomer(e) {
    if (e) e.preventDefault()
    if (!adminPassword.trim()) {
      toast.error('Please enter your administrator password to authorize deletion')
      return
    }
    setDeleting(true)
    try {
      const target = (selected.id != null && String(selected.id) !== 'null') ? selected.id : (selected.customer_code && selected.customer_code !== 'null' ? selected.customer_code : selected.email)
      await api.delete(`/admin/customers/${target}`, {
        data: { admin_password: adminPassword },
      })
      setCustomers(prev => prev.filter(c => c.id !== selected.id))
      toast.success(`Customer ${selected.name} deleted successfully`)
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete customer')
    } finally {
      setDeleting(false)
    }
  }

  const totalRevenue = customers.reduce((s,c)=>s+Number(c.total_spent || 0), 0)

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="page-heading d-flex align-items-center justify-content-between mb-3 flex-wrap gap-2">
        <div>
          <h6 className="mb-0">Online Customers</h6>
          <p className="text-muted mb-0" style={{fontSize:12}}>
            Self-registered customers ordering via the Bems Farms app &amp; website
          </p>
        </div>
        <ul className="breadcrumb mb-0">
          <li className="breadcrumb-item"><Link to="/customers">Customers</Link></li>
          <li className="breadcrumb-item active">All Customers</li>
        </ul>
      </div>

      {/* KPIs */}
      <div className="row g-3 mb-4">
        {[
          { label:'Total Customers',   val:stats?.total ?? customers.length, icon:'ri-group-line',             color:'#3b82f6', bg:'#eff6ff' },
          { label:'Active',            val:stats?.active ?? '—',             icon:'ri-user-follow-line',       color:'#22c55e', bg:'#f0fdf4' },
          { label:'New This Month',    val:stats?.new_this_month ?? '—',     icon:'ri-user-add-line',          color:'#0ea5e9', bg:'#f0f9ff' },
          { label:'Platinum Members',  val:stats?.platinum ?? '—',           icon:'ri-vip-crown-2-line',       color:'#8b5cf6', bg:'#f5f3ff' },
          { label:'Total Revenue',     val:fmt(stats?.total_revenue ?? totalRevenue), icon:'ri-money-naira-circle-line',color:'#22c55e', bg:'#f0fdf4' },
          { label:'Avg Spend/Customer',val:fmt(stats?.avg_spent ?? 0),       icon:'ri-shopping-cart-2-line',   color:'#f59e0b', bg:'#fffbeb' },
        ].map((k,i) => (
          <div key={i} className="col-6 col-md-4 col-xl-2">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body p-3">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="text-muted mb-1" style={{fontSize:11}}>{k.label}</div>
                    <div className="fw-bold" style={{fontSize:18}}>{k.val}</div>
                  </div>
                  <div className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{width:38,height:38,background:k.bg}}>
                    <i className={`${k.icon} fs-18`} style={{color:k.color}}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier tabs */}
      <div className="d-flex gap-2 flex-wrap mb-3 align-items-center">
        {['all','Platinum','Gold','Silver','Bronze'].map(t => {
          const cfg = t !== 'all' ? TIER_CFG[t] : null
          const isActive = filterTier === t
          return (
            <button key={t} onClick={()=>setTier(t)} className="btn btn-sm" style={{
              fontSize:11,
              background: isActive ? (cfg ? cfg.color : '#1e293b') : '#f8fafc',
              color: isActive ? '#fff' : '#64748b',
              border:`1px solid ${isActive ? 'transparent' : '#e2e8f0'}`,
            }}>
              {cfg && <i className={`${cfg.icon} me-1`}/>}
              {t==='all' ? 'All Tiers' : t}
            </button>
          )
        })}
        <div className="ms-auto d-flex gap-2">
          {['active','inactive'].map(s => (
            <button key={s} onClick={()=>setSt(filterSt===s?'all':s)} className="btn btn-sm" style={{
              fontSize:11,
              background: filterSt===s ? STATUS_CFG[s].color : '#f8fafc',
              color: filterSt===s ? '#fff' : '#64748b',
              border:`1px solid ${filterSt===s ? 'transparent' : '#e2e8f0'}`,
            }}>{s.charAt(0).toUpperCase()+s.slice(1)}</button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body p-3">
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0"><i className="ri-search-line text-muted"/></span>
            <input type="text" className="form-control border-start-0 bg-light"
              placeholder="Search by name, phone, email, area or ID…"
              value={search} onChange={e=>setSearch(e.target.value)}/>
            {search && (
              <button className="btn btn-outline-secondary" onClick={()=>setSearch('')}>
                <i className="ri-close-line"/>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between py-2">
          <span style={{fontSize:13}}>
            {customers.length} customer{customers.length!==1?'s':''}
          </span>
          <span className="text-muted" style={{fontSize:12}}>
            Combined revenue: <strong>{fmt(totalRevenue)}</strong>
          </span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0" style={{fontSize:13}}>
            <thead style={{background:'#f8fafc'}}>
              <tr>
                {['CUSTOMER','CONTACT','CHANNEL','ZONE','TIER','ORDERS','TOTAL SPENT','LAST LOGIN','STATUS','ACTIONS'].map(h=>(
                  <th key={h} className="px-3 py-2 fw-medium text-muted text-nowrap" style={{fontSize:11}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} className="text-center py-5 text-muted">Loading customers…</td></tr>
              )}
              {!loading && customers.length===0 && (
                <tr>
                  <td colSpan={10} className="text-center py-5 text-muted">
                    <i className="ri-user-search-line d-block mb-2" style={{fontSize:28}}/>
                    No customers match your search.
                  </td>
                </tr>
              )}
              {!loading && customers.map((c,i) => {
                const tc = TIER_CFG[c.tier] || TIER_CFG.Bronze
                const sc = STATUS_CFG[c.status] || STATUS_CFG.active
                const customerId = (c.id != null && String(c.id) !== 'null') ? c.id : c.customer_code
                const profileUrl = `/customers/${customerId}`
                const displayCode = (c.customer_code && c.customer_code !== 'null' && c.customer_code !== 'undefined')
                  ? c.customer_code
                  : ('CUS-' + String(c.id || '').padStart(4, '0'))
                const ch = (c.last_channel || 'web').toLowerCase()
                const chCfg = CHANNEL_CFG[ch] || CHANNEL_CFG.web
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-3">
                        <Link to={profileUrl} className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white flex-shrink-0 text-decoration-none"
                          style={{width:38,height:38,background:AVATAR_COLORS[i%AVATAR_COLORS.length],fontSize:13}}>
                          {ini(c.name)}
                        </Link>
                        <div>
                          <Link to={profileUrl} className="fw-bold text-dark text-decoration-none d-block hover-underline">
                            {c.name}
                          </Link>
                          <div className="text-muted" style={{fontSize:10}}>
                            <span className="font-monospace text-primary">{displayCode}</span>
                            <span> · Joined {fmtDate(c.joined_at)}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div style={{fontSize:12}}>{c.phone}</div>
                      <div className="text-muted" style={{fontSize:11}}>{c.email}</div>
                    </td>
                    <td className="px-3 py-2 text-nowrap">
                      <span className="badge d-inline-flex align-items-center gap-1 shadow-xs"
                        style={{fontSize:11, background:chCfg.bg, color:chCfg.color, border:`1px solid ${chCfg.border}`, padding: '4px 8px', borderRadius: 6}}>
                        <i className={chCfg.icon} style={{fontSize:12}}/>
                        <span>{chCfg.label}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-1" style={{fontSize:12}}>
                        <i className="ri-map-pin-line text-muted" style={{fontSize:11}}/>
                        {c.zone || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="badge d-flex align-items-center gap-1"
                        style={{fontSize:10,background:tc.bg,color:tc.color,border:`1px solid ${tc.border}`,width:'fit-content'}}>
                        <i className={tc.icon}/>{c.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2 fw-semibold text-center">{c.total_orders || 0}</td>
                    <td className="px-3 py-2 fw-bold text-success">{fmt(c.total_spent)}</td>
                    <td className="px-3 py-2 text-nowrap">
                      <div className="d-flex align-items-center gap-1" style={{fontSize:12, fontWeight:500, color: c.last_login ? '#0f172a' : '#94a3b8'}}>
                        <i className={`ri-time-line ${c.last_login ? 'text-primary' : 'text-muted'}`} style={{fontSize:13}}/>
                        <span>{fmtLogin(c.last_login)}</span>
                      </div>
                      {c.last_login && (
                        <div className="text-muted" style={{fontSize:10, paddingLeft:17}}>
                          {new Date(c.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="d-flex align-items-center gap-2">
                        <div className="form-check form-switch mb-0">
                          <input className="form-check-input" type="checkbox" role="switch"
                            checked={c.status==='active'} onChange={()=>toggleStatus(c)}
                            style={{width:34,height:18,cursor:'pointer'}} title="Toggle Customer Active Status"/>
                        </div>
                        <span className="badge" style={{fontSize:10,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`}}>
                          {sc.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="d-flex gap-1 align-items-center">
                        <Link to={profileUrl}
                          className="btn btn-sm btn-outline-primary d-flex align-items-center justify-content-center"
                          style={{width:30,height:30,padding:0,borderRadius:'50%'}} title="View Deep Customer Information">
                          <i className="ri-arrow-right-line" style={{fontSize:14}}/>
                        </Link>
                        <button
                          className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                          style={{width:30,height:30,padding:0,borderRadius:'50%'}} title="Remove"
                          onClick={()=>{ setSelected(c); setModal('delete') }}>
                          <i className="ri-delete-bin-line" style={{fontSize:13}}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DELETE / REMOVE MODAL WITH ADMIN PASSWORD AUTHORIZATION */}
      {modal==='delete' && selected && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:1050,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
          onClick={closeModal}>
          <div style={{background:'#fff',borderRadius:14,width:'100%',maxWidth:440,boxShadow:'0 25px 70px rgba(0,0,0,0.3)',overflow:'hidden'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{background:'#dc2626',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div className="d-flex align-items-center gap-2 text-white">
                <i className="ri-shield-keyhole-line" style={{fontSize:20}}/>
                <span style={{fontWeight:600,fontSize:15}}>Security Authorization Required</span>
              </div>
              <button className="btn-close btn-close-white btn-sm" onClick={closeModal}/>
            </div>
            <form onSubmit={deleteCustomer} className="p-4 text-start">
              <div className="d-flex align-items-center gap-3 mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{width:48,height:48,background:'#fee2e2'}}>
                  <i className="ri-delete-bin-2-line" style={{color:'#dc2626',fontSize:22}}/>
                </div>
                <div>
                  <div className="fw-bold text-dark" style={{fontSize:16}}>Delete Customer</div>
                  <div className="text-muted" style={{fontSize:12}}>
                    {selected.name} ({selected.customer_code || ('CUS-' + String(selected.id).padStart(4, '0'))})
                  </div>
                </div>
              </div>

              <div className="p-3 rounded mb-3" style={{background:'#fef2f2',border:'1px solid #fecaca'}}>
                <div style={{fontSize:12,color:'#991b1b',lineHeight:1.5}}>
                  <strong className="d-block mb-1">
                    <i className="ri-error-warning-line me-1"/>
                    Warning: Irreversible Action
                  </strong>
                  Deleting this customer account will remove their personal profile, delivery addresses, and revoke all active login sessions immediately.
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold text-dark" style={{fontSize:12}}>
                  Enter Your Administrator Password to Confirm:
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light text-muted border-end-0">
                    <i className="ri-lock-password-line"/>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control border-start-0 border-end-0"
                    placeholder="Enter admin password"
                    value={adminPassword}
                    autoFocus
                    required
                    onChange={e => setAdminPassword(e.target.value)}
                    style={{fontSize:13}}
                  />
                  <button
                    type="button"
                    className="btn btn-light border border-start-0 text-muted"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'}/>
                  </button>
                </div>
                <div className="form-text" style={{fontSize:11}}>
                  Your current login password is used to verify you have authorization to delete records.
                </div>
              </div>

              <div className="d-flex gap-2 pt-2 border-top">
                <button
                  type="button"
                  className="btn btn-outline-secondary flex-fill"
                  onClick={closeModal}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-danger flex-fill d-flex align-items-center justify-content-center gap-1"
                  disabled={deleting || !adminPassword.trim()}
                >
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm"/>
                      <span>Verifying &amp; Deleting…</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-delete-bin-line"/>
                      <span>Verify &amp; Delete</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
