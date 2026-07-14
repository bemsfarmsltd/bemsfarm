import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import api from '../../lib/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../context/AuthContext'

const inp = {
  width:'100%', padding:'9px 12px', borderRadius:8, border:'1.5px solid #e5e7eb',
  fontSize:13, fontFamily:'Nunito, sans-serif', outline:'none', boxSizing:'border-box',
  color:'#111827', background:'#fff',
}
const lbl = { display:'block', fontSize:12, fontWeight:700, color:'#374151', marginBottom:5 }

const btn = (bg, color, border) => ({
  display:'inline-flex', alignItems:'center', gap:6, padding:'9px 16px',
  borderRadius:8, border: border ?? 'none', cursor:'pointer',
  background:bg, color, fontSize:13, fontWeight:700, fontFamily:'Nunito, sans-serif',
})

function Spinner({ size = 32, inline = false }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding: inline ? 0 : 48 }}>
      <div style={{ width:size, height:size, border:'3px solid #e5e7eb', borderTopColor:'#1B4332', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function Modal({ open, onClose, title, danger, children }) {
  if (!open) return null
  return (
    <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)' }} />
      <div style={{ position:'relative', background:'#fff', borderRadius:14, padding:'24px 28px', width:'100%', maxWidth:560, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', zIndex:1 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <h3 style={{ margin:0, fontSize:16, fontWeight:800, color:danger?'#dc2626':'#111827', fontFamily:'Syne, sans-serif' }}>{title}</h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#6b7280', fontSize:20, padding:2, display:'flex', alignItems:'center' }}>
            <i className="ri-close-line" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const BLANK = { condition:'', rule_text:'', tags:'', priority:0 }

function RuleForm({ form, setForm }) {
  return (
    <div style={{ display:'grid', gap:16 }}>
      <div>
        <label style={lbl}>Condition <span style={{ color:'#dc2626' }}>*</span></label>
        <input value={form.condition} onChange={e => setForm(f => ({...f, condition:e.target.value}))} placeholder="e.g. Lactose Intolerance" style={inp} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>The dietary condition or restriction (used by Chef Bems AI for matching)</div>
      </div>
      <div>
        <label style={lbl}>Rule Text <span style={{ color:'#dc2626' }}>*</span></label>
        <textarea value={form.rule_text} onChange={e => setForm(f => ({...f, rule_text:e.target.value}))} rows={4}
          placeholder="Describe what the AI should do when this condition is detected..." style={{ ...inp, resize:'vertical', lineHeight:1.6 }} />
      </div>
      <div>
        <label style={lbl}>Tags</label>
        <input value={form.tags} onChange={e => setForm(f => ({...f, tags:e.target.value}))} placeholder="e.g. dairy-free, no-milk, no-cheese" style={inp} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Comma-separated tags used for AI context matching</div>
      </div>
      <div>
        <label style={lbl}>Priority</label>
        <input type="number" min={0} max={100} value={form.priority} onChange={e => setForm(f => ({...f, priority:+e.target.value}))} style={{ ...inp, width:120 }} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Higher number = higher priority (0 = default)</div>
      </div>
    </div>
  )
}

export default function DietaryRules() {
  const { user }  = useAuth()
  const [rules, setRules]           = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [addModal, setAddModal]     = useState(false)
  const [editModal, setEditModal]   = useState(null)   // rule object
  const [deleteModal, setDeleteModal] = useState(null) // rule object
  const [form, setForm]             = useState({ ...BLANK })
  const [editForm, setEditForm]     = useState({ ...BLANK })

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit:50 }
      if (search) params.search = search
      const { data } = await api.get('/admin/chef-bems/dietary-rules', { params })
      setRules(data.rules || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load dietary rules')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchRules() }, [fetchRules])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const saveRule = async () => {
    if (!form.condition.trim()) { toast.error('Condition is required'); return }
    if (!form.rule_text.trim()) { toast.error('Rule text is required'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/admin/chef-bems/dietary-rules', form)
      setRules(prev => [data.rule, ...prev])
      setTotal(t => t+1)
      setForm({ ...BLANK })
      setAddModal(false)
      toast.success('Dietary rule added')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  const updateRule = async () => {
    if (!editForm.condition.trim()) { toast.error('Condition is required'); return }
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/chef-bems/dietary-rules/${editModal.id}`, editForm)
      setRules(prev => prev.map(r => r.id === editModal.id ? data.rule : r))
      setEditModal(null)
      toast.success('Rule updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update rule')
    } finally {
      setSaving(false)
    }
  }

  const deleteRule = async () => {
    setSaving(true)
    try {
      await api.delete(`/admin/chef-bems/dietary-rules/${deleteModal.id}`)
      setRules(prev => prev.filter(r => r.id !== deleteModal.id))
      setTotal(t => t-1)
      setDeleteModal(null)
      toast.success('Dietary rule deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete rule')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r) => {
    setEditForm({ condition: r.condition||'', rule_text: r.rule_text||'', tags: r.tags||'', priority: r.priority||0 })
    setEditModal(r)
  }

  const kpi = {
    total,
    high: rules.filter(r => (r.priority||0) >= 70).length,
    recent: rules.filter(r => { const d = new Date(r.created_at); return Date.now() - d < 7*24*3600*1000 }).length,
  }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PageHeader
        title="Chef Bems AI — Dietary Rules"
        subtitle="Manage the dietary rules that guide Chef Bems AI responses to customer meal queries."
        actions={
          <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={btn('#1B4332','#fff')}>
            <i className="ri-add-line" />New Rule
          </button>
        }
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Rules',      value:total,      icon:'ri-file-list-3-line',     bg:'#eff6ff', color:'#1d4ed8' },
          { label:'High Priority',    value:kpi.high,   icon:'ri-alarm-warning-line',   bg:'#fef2f2', color:'#dc2626' },
          { label:'Added This Week',  value:kpi.recent, icon:'ri-calendar-check-line',  bg:'#f0fdf4', color:'#15803d' },
        ].map(k => (
          <div key={k.label} style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', padding:'16px 20px', display:'flex', alignItems:'center', gap:14, boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ width:44, height:44, borderRadius:10, background:k.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={k.icon} style={{ fontSize:20, color:k.color }} />
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:'#111827', fontFamily:'Syne, sans-serif', lineHeight:1 }}>{k.value}</div>
              <div style={{ fontSize:11, color:'#6b7280', marginTop:2 }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <div style={{ position:'relative', flex:1 }}>
          <i className="ri-search-line" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search conditions, rule text, or tags..."
            style={{ ...inp, paddingLeft:34 }} />
        </div>
        <button onClick={fetchRules} style={{ ...btn('#f1f5f9','#374151'), padding:'9px 14px' }}>
          <i className="ri-refresh-line" />
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f3f4f6', background:'#f8fafc' }}>
              {['Condition','Rule Text','Tags','Priority','Created','Actions'].map(h => (
                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><Spinner /></td></tr>
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign:'center', padding:'48px 0', color:'#9ca3af' }}>
                  <i className="ri-file-list-3-line" style={{ fontSize:36, display:'block', marginBottom:8 }} />
                  <div>No dietary rules found. {search && 'Try a different search.'}</div>
                  {!search && <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={{ ...btn('#1B4332','#fff'), marginTop:12 }}><i className="ri-add-line" />Add First Rule</button>}
                </td>
              </tr>
            ) : rules.map((r, i) => {
              const priority = r.priority || 0
              const priBg = priority >= 70 ? '#fee2e2' : priority >= 40 ? '#fef3c7' : '#f1f5f9'
              const priColor = priority >= 70 ? '#dc2626' : priority >= 40 ? '#b45309' : '#475569'
              return (
                <tr key={r.id} style={{ borderBottom:'1px solid #f9fafb', background: i%2===0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#111827', fontFamily:'Nunito, sans-serif', maxWidth:160 }}>
                    {r.condition}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'#374151', fontFamily:'Nunito, sans-serif', maxWidth:240 }}>
                    <div style={{ overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', lineHeight:1.5 }}>
                      {r.rule_text}
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', maxWidth:180 }}>
                    {r.tags ? (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                        {r.tags.split(',').slice(0,3).map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:50, background:'#e0f2fe', color:'#0369a1' }}>{t}</span>
                        ))}
                        {r.tags.split(',').length > 3 && <span style={{ fontSize:10, color:'#9ca3af' }}>+{r.tags.split(',').length-3}</span>}
                      </div>
                    ) : <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:50, background:priBg, color:priColor }}>{priority}</span>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:11, color:'#9ca3af', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(r)} style={{ ...btn('#1B4332','#fff'), padding:'5px 10px', fontSize:11 }}>
                        <i className="ri-edit-line" />Edit
                      </button>
                      {user?.role === 'superadmin' && (
                        <button onClick={() => setDeleteModal(r)} style={{ ...btn('transparent','#dc2626','1.5px solid #fca5a5'), padding:'5px 10px', fontSize:11 }}>
                          <i className="ri-delete-bin-line" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Dietary Rule">
        <RuleForm form={form} setForm={setForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setAddModal(false)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={saveRule} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Save Rule
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Dietary Rule">
        <RuleForm form={editForm} setForm={setEditForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setEditModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={updateRule} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Update Rule
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Dietary Rule" danger>
        {deleteModal && (
          <>
            <div style={{ background:'#fff7ed', border:'1px solid #fed7aa', borderRadius:10, padding:'14px 16px', marginBottom:20, display:'flex', gap:10 }}>
              <i className="ri-alarm-warning-line" style={{ fontSize:20, color:'#ea580c', flexShrink:0, marginTop:1 }} />
              <div>
                <div style={{ fontWeight:700, fontSize:13, color:'#c2410c', marginBottom:4 }}>Warning: This affects live AI responses</div>
                <p style={{ fontSize:12, color:'#9a3412', margin:0, lineHeight:1.6 }}>
                  Deleting <strong>"{deleteModal.condition}"</strong> will remove this rule from Chef Bems AI immediately.
                </p>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
              <button onClick={deleteRule} disabled={saving} style={{ ...btn('#dc2626','#fff'), opacity:saving?0.7:1 }}>
                {saving ? <Spinner size={14} inline /> : <i className="ri-delete-bin-line" />}Delete Rule
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
