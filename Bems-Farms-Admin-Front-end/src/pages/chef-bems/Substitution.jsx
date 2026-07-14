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

function Toggle({ checked, onChange }) {
  return (
    <div onClick={onChange} role="switch" aria-checked={checked}
      style={{ width:38, height:21, borderRadius:50, cursor:'pointer', flexShrink:0, position:'relative', transition:'background 0.2s', background: checked ? '#1B4332' : '#d1d5db' }}>
      <div style={{ position:'absolute', width:17, height:17, borderRadius:'50%', background:'#fff', top:2, left: checked ? 19 : 2, transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.25)' }} />
    </div>
  )
}

const BLANK = { original_item:'', substitute_item:'', reason:'', dietary_tags:'', confidence:0.80, is_active:true }

function SubForm({ form, setForm }) {
  const confPct = Math.round(parseFloat(form.confidence || 0) * 100)
  const confColor = confPct >= 80 ? '#15803d' : confPct >= 60 ? '#b45309' : '#dc2626'
  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={lbl}>Original Item <span style={{ color:'#dc2626' }}>*</span></label>
          <input value={form.original_item} onChange={e => setForm(f => ({...f, original_item:e.target.value}))} placeholder="e.g. Butter" style={inp} />
        </div>
        <div>
          <label style={lbl}>Substitute Item <span style={{ color:'#dc2626' }}>*</span></label>
          <input value={form.substitute_item} onChange={e => setForm(f => ({...f, substitute_item:e.target.value}))} placeholder="e.g. Coconut Oil" style={inp} />
        </div>
      </div>
      <div>
        <label style={lbl}>Reason</label>
        <textarea value={form.reason} onChange={e => setForm(f => ({...f, reason:e.target.value}))} rows={3}
          placeholder="Why is this a good substitution? (e.g. dairy-free alternative)" style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
      </div>
      <div>
        <label style={lbl}>Dietary Tags</label>
        <input value={form.dietary_tags} onChange={e => setForm(f => ({...f, dietary_tags:e.target.value}))} placeholder="e.g. dairy-free, vegan, lactose-intolerant" style={inp} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Comma-separated dietary conditions this substitution applies to</div>
      </div>
      <div>
        <label style={lbl}>Confidence — {confPct}%</label>
        <input type="range" min={0} max={1} step={0.01} value={form.confidence}
          onChange={e => setForm(f => ({...f, confidence:parseFloat(e.target.value)}))}
          style={{ width:'100%' }} />
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ fontSize:10, color:'#9ca3af' }}>0% — uncertain</span>
          <span style={{ fontSize:11, fontWeight:700, color:confColor }}>{confPct}%</span>
          <span style={{ fontSize:10, color:'#9ca3af' }}>100% — certain</span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Toggle checked={!!form.is_active} onChange={() => setForm(f => ({...f, is_active:!f.is_active}))} />
        <span style={{ fontSize:13, color:'#374151', fontWeight:600 }}>
          {form.is_active ? 'Active — Chef Bems AI will use this substitution' : 'Inactive — rule is disabled'}
        </span>
      </div>
    </div>
  )
}

export default function Substitution() {
  const { user } = useAuth()
  const [subs, setSubs]               = useState([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [addModal, setAddModal]       = useState(false)
  const [editModal, setEditModal]     = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm]               = useState({ ...BLANK })
  const [editForm, setEditForm]       = useState({ ...BLANK })

  const fetchSubs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit:50 }
      if (search) params.search = search
      const { data } = await api.get('/admin/chef-bems/substitutions', { params })
      setSubs(data.substitutions || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load substitutions')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchSubs() }, [fetchSubs])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const saveSub = async () => {
    if (!form.original_item.trim())  { toast.error('Original item is required');   return }
    if (!form.substitute_item.trim()){ toast.error('Substitute item is required'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/admin/chef-bems/substitutions', form)
      setSubs(prev => [data.substitution, ...prev])
      setTotal(t => t+1)
      setForm({ ...BLANK })
      setAddModal(false)
      toast.success('Substitution added')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save substitution')
    } finally {
      setSaving(false)
    }
  }

  const updateSub = async () => {
    if (!editForm.original_item.trim())  { toast.error('Original item is required');   return }
    if (!editForm.substitute_item.trim()){ toast.error('Substitute item is required'); return }
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/chef-bems/substitutions/${editModal.id}`, editForm)
      setSubs(prev => prev.map(s => s.id === editModal.id ? data.substitution : s))
      setEditModal(null)
      toast.success('Substitution updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update substitution')
    } finally {
      setSaving(false)
    }
  }

  const deleteSub = async () => {
    setSaving(true)
    try {
      await api.delete(`/admin/chef-bems/substitutions/${deleteModal.id}`)
      setSubs(prev => prev.filter(s => s.id !== deleteModal.id))
      setTotal(t => t-1)
      setDeleteModal(null)
      toast.success('Substitution deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete substitution')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (sub) => {
    try {
      const { data } = await api.put(`/admin/chef-bems/substitutions/${sub.id}`, { ...sub, is_active:!sub.is_active })
      setSubs(prev => prev.map(s => s.id === sub.id ? data.substitution : s))
      toast.success(data.substitution.is_active ? 'Substitution activated' : 'Substitution deactivated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const openEdit = (s) => {
    setEditForm({ original_item:s.original_item||'', substitute_item:s.substitute_item||'', reason:s.reason||'', dietary_tags:s.dietary_tags||'', confidence:parseFloat(s.confidence||0.80), is_active: s.is_active !== false })
    setEditModal(s)
  }

  const kpi = {
    total,
    active:   subs.filter(s => s.is_active !== false).length,
    highConf: subs.filter(s => parseFloat(s.confidence||0) >= 0.8).length,
  }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PageHeader
        title="Chef Bems AI — Substitutions"
        subtitle="Manage ingredient and meal substitutions for dietary-specific recommendations."
        actions={
          <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={btn('#1B4332','#fff')}>
            <i className="ri-add-line" />Add Substitution
          </button>
        }
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Substitutions', value:total,        icon:'ri-exchange-line',        bg:'#eff6ff', color:'#1d4ed8' },
          { label:'Active',              value:kpi.active,   icon:'ri-checkbox-circle-line', bg:'#f0fdf4', color:'#15803d' },
          { label:'High Confidence',     value:kpi.highConf, icon:'ri-bar-chart-line',       bg:'#fdf4ff', color:'#7e22ce' },
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
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search by item name or dietary tags..."
            style={{ ...inp, paddingLeft:34 }} />
        </div>
        <button onClick={fetchSubs} style={{ ...btn('#f1f5f9','#374151'), padding:'9px 14px' }}>
          <i className="ri-refresh-line" />
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f3f4f6', background:'#f8fafc' }}>
              {['Original Item','Substitute Item','Dietary Tags','Confidence','Active','Created','Actions'].map(h => (
                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><Spinner /></td></tr>
            ) : subs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign:'center', padding:'48px 0', color:'#9ca3af' }}>
                  <i className="ri-exchange-line" style={{ fontSize:36, display:'block', marginBottom:8 }} />
                  <div>No substitutions found. {search ? 'Try a different search.' : 'Add your first ingredient substitution.'}</div>
                  {!search && <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={{ ...btn('#1B4332','#fff'), marginTop:12 }}><i className="ri-add-line" />Add First Substitution</button>}
                </td>
              </tr>
            ) : subs.map((s, i) => {
              const conf = parseFloat(s.confidence || 0)
              const confPct = Math.round(conf * 100)
              const confColor = confPct >= 80 ? '#15803d' : confPct >= 60 ? '#b45309' : '#dc2626'
              const isActive = s.is_active !== false
              return (
                <tr key={s.id} style={{ borderBottom:'1px solid #f9fafb', background: i%2===0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#111827', fontFamily:'Nunito, sans-serif' }}>
                    {s.original_item}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'#374151', fontFamily:'Nunito, sans-serif' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <i className="ri-arrow-right-line" style={{ color:'#9ca3af', fontSize:12, flexShrink:0 }} />
                      {s.substitute_item}
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', maxWidth:180 }}>
                    {s.dietary_tags ? (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                        {s.dietary_tags.split(',').slice(0,3).map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:50, background:'#e0f2fe', color:'#0369a1' }}>{t}</span>
                        ))}
                        {s.dietary_tags.split(',').length > 3 && <span style={{ fontSize:10, color:'#9ca3af' }}>+{s.dietary_tags.split(',').length-3}</span>}
                      </div>
                    ) : <span style={{ fontSize:11, color:'#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:48, height:5, background:'#e5e7eb', borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${confPct}%`, background:confColor, borderRadius:999 }} />
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:confColor }}>{confPct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Toggle checked={isActive} onChange={() => toggleActive(s)} />
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:11, color:'#9ca3af', whiteSpace:'nowrap' }}>
                    {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(s)} style={{ ...btn('#1B4332','#fff'), padding:'5px 10px', fontSize:11 }}>
                        <i className="ri-edit-line" />Edit
                      </button>
                      {(user?.role === 'superadmin' || user?.role === 'manager') && (
                        <button onClick={() => setDeleteModal(s)} style={{ ...btn('transparent','#dc2626','1.5px solid #fca5a5'), padding:'5px 10px', fontSize:11 }}>
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
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Substitution">
        <SubForm form={form} setForm={setForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setAddModal(false)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={saveSub} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Save
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Substitution">
        <SubForm form={editForm} setForm={setEditForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setEditModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={updateSub} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Update
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Substitution" danger>
        {deleteModal && (
          <>
            <p style={{ fontSize:13, color:'#374151', marginBottom:20, lineHeight:1.6 }}>
              Are you sure you want to delete the substitution <strong>"{deleteModal.original_item} → {deleteModal.substitute_item}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
              <button onClick={deleteSub} disabled={saving} style={{ ...btn('#dc2626','#fff'), opacity:saving?0.7:1 }}>
                {saving ? <Spinner size={14} inline /> : <i className="ri-delete-bin-line" />}Delete
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
