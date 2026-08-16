import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { ROLE_META } from '../../lib/roles'

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box',color:'var(--text-primary)' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13,textDecoration:'none' }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'var(--bg-subtle)' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid var(--border)',fontSize:13,color:'var(--text-primary)' }
const B = 'var(--border)', S = '#6b7280'

const STATUSES = ['active', 'inactive', 'on_leave']

function statusBadge(status) {
  const map = {
    active:   { color:'#166534', bg:'#dcfce7', label:'Active' },
    inactive: { color:'var(--text-muted)', bg:'var(--border)', label:'Inactive' },
    on_leave: { color:'#92400e', bg:'#fef3c7', label:'On Leave' },
  }
  const s = map[status] || { color:S, bg:'var(--border)', label:status||'—' }
  return <span style={{ background:s.bg,color:s.color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600 }}>{s.label}</span>
}

function roleBadge(systemRole) {
  const meta = ROLE_META[systemRole]
  if (!meta) return <span style={{ fontSize:12,color:S }}>{systemRole||'—'}</span>
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:4,background:meta.bg,color:meta.color,borderRadius:50,padding:'2px 9px',fontSize:11,fontWeight:600 }}>
      <i className={meta.icon} style={{ fontSize:11 }}/>{meta.label}
    </span>
  )
}

export default function StaffList() {
  const [staff, setStaff]         = useState([])
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [statusTarget, setStatusTarget] = useState(null) // { staff, next }
  const [deleteItem, setDeleteItem] = useState(null)
  const [saving, setSaving]       = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/staff', { params: { page, limit: 20, search: search || undefined, status: statusFilter || undefined } })
      .then(r => { setStaff(r.data.staff || []); setTotal(r.data.total || 0); setStats(r.data.stats || {}) })
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false))
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])

  async function changeStatus() {
    setSaving(true)
    try {
      await api.patch(`/admin/staff/${statusTarget.staff.id}/status`, { status: statusTarget.next })
      toast.success(`Marked ${statusTarget.next.replace('_', ' ')}`)
      setStatusTarget(null)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await api.delete(`/admin/staff/${deleteItem.id}`)
      toast.success('Staff member deactivated')
      setDeleteItem(null)
      load()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove staff member')
    } finally {
      setSaving(false)
    }
  }

  const statCards = [
    { label:'Total Staff',   value:stats.total ?? '—',          icon:'ri-team-line',        color:'#405189' },
    { label:'Active',        value:stats.active ?? '—',         icon:'ri-checkbox-circle-line', color:'#0ab39c' },
    { label:'On Duty Today', value:stats.on_duty_today ?? '—',  icon:'ri-time-line',        color:'#f7b84b' },
    { label:'Departments',   value:stats.departments ?? '—',    icon:'ri-building-line',    color:'#a78bfa' },
  ]

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20, display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'var(--text-primary)' }}>Staff Directory</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage employee records, roles, and access.</div>
        </div>
        <Link to="/staff/add" style={btnP}><i className="ri-user-add-line"/>Add Staff</Link>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ background:'var(--bg-card)', borderRadius:12, border:`1px solid ${B}`, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 4px rgba(0,0,0,.05)' }}>
            <div style={{ width:40, height:40, borderRadius:9, background:c.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={c.icon} style={{ color:c.color, fontSize:18 }}/>
            </div>
            <div>
              <div style={{ fontSize:11, color:S }}>{c.label}</div>
              <div style={{ fontSize:20, fontWeight:800, color:'var(--text-primary)', fontFamily:'Syne,sans-serif' }}>{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>All Staff</span>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:20,pointerEvents:'none' }}/>
              <input type="text" placeholder="Search name, email, code…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} style={{ ...inp,paddingLeft:34,width:220 }}/>
            </div>
            <select value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1) }} style={{ ...inp, width:150 }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:38 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Employee','Code','Department','Role','System Role','Shift','Status','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {staff.length === 0 && (
                  <tr><td colSpan={8} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                    <i className="ri-team-line" style={{ fontSize:49,display:'block',marginBottom:8 }}/>No staff found
                  </td></tr>
                )}
                {staff.map(m => (
                  <tr key={m.id}>
                    <td style={TD}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:'#40518920', color:'#405189', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                          {(m.name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600 }}>{m.name}</div>
                          <div style={{ fontSize:11, color:S }}>{m.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}><code style={{ background:'var(--bg-muted)',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:700 }}>{m.employee_code}</code></td>
                    <td style={{ ...TD, color:S, fontSize:12 }}>{m.department}</td>
                    <td style={{ ...TD, fontSize:12 }}>{m.role}</td>
                    <td style={TD}>{roleBadge(m.system_role)}</td>
                    <td style={{ ...TD, fontSize:12, color:S, textTransform:'capitalize' }}>{m.shift}</td>
                    <td style={TD}>{statusBadge(m.status)}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        {m.status !== 'active' && (
                          <button onClick={()=>setStatusTarget({ staff:m, next:'active' })} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0fdf4',color:'#166534',cursor:'pointer' }} title="Reactivate"><i className="ri-play-circle-line"/></button>
                        )}
                        {m.status === 'active' && (
                          <button onClick={()=>setStatusTarget({ staff:m, next:'on_leave' })} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fffbeb',color:'#92400e',cursor:'pointer' }} title="Mark on leave"><i className="ri-pause-circle-line"/></button>
                        )}
                        <button onClick={()=>setDeleteItem(m)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }} title="Deactivate"><i className="ri-delete-bin-line"/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <span>Showing {staff.length} of {total} staff</span>
          <div style={{ display:'flex',gap:6 }}>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
            <span style={{ padding:'4px 8px',fontSize:12,color:S }}>Page {page}</span>
            <button style={{ ...btnL,padding:'4px 10px',fontSize:12 }} disabled={staff.length<20} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </div>

      {/* STATUS CHANGE CONFIRM */}
      {statusTarget && (
        <>
          <div onClick={()=>setStatusTarget(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'var(--bg-card)',borderRadius:14,width:'100%',maxWidth:360,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <i className="ri-user-settings-line" style={{ fontSize:30 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Update Status?</span>
                <button onClick={()=>setStatusTarget(null)} aria-label="Close" style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>
                  Mark <strong style={{ color:'var(--text-primary)' }}>{statusTarget.staff.name}</strong> as <strong>{statusTarget.next.replace('_',' ')}</strong>?
                </p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setStatusTarget(null)}>Cancel</button>
                  <button style={{ ...btnP,flex:1,justifyContent:'center' }} onClick={changeStatus} disabled={saving}>{saving?'Saving…':'Confirm'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DELETE CONFIRM */}
      {deleteItem && (
        <>
          <div onClick={()=>setDeleteItem(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'var(--bg-card)',borderRadius:14,width:'100%',maxWidth:360,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#7f1d1d',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <i className="ri-delete-bin-line" style={{ fontSize:30 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Deactivate Staff?</span>
                <button onClick={()=>setDeleteItem(null)} aria-label="Close" style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>
                  Deactivate <strong style={{ color:'var(--text-primary)' }}>{deleteItem.name}</strong>? Their account access will be disabled. This can be reversed by reactivating them later.
                </p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setDeleteItem(null)}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={handleDelete} disabled={saving}>{saving?'Deactivating…':'Deactivate'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}