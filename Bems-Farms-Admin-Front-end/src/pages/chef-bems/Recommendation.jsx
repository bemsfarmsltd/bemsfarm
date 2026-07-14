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
      <div style={{ position:'relative', background:'#fff', borderRadius:14, padding:'24px 28px', width:'100%', maxWidth:600, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)', zIndex:1 }}>
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

const BLANK = { title:'', trigger_condition:'', recommended_items:'', context_tags:'', priority:5, is_active:true }

function RecForm({ form, setForm }) {
  const priority = parseInt(form.priority || 5)
  const priColor = priority <= 3 ? '#dc2626' : priority <= 6 ? '#b45309' : '#15803d'
  return (
    <div style={{ display:'grid', gap:16 }}>
      <div>
        <label style={lbl}>Title <span style={{ color:'#dc2626' }}>*</span></label>
        <input value={form.title} onChange={e => setForm(f => ({...f, title:e.target.value}))} placeholder="e.g. High Protein Post-Workout Recommendation" style={inp} />
      </div>
      <div>
        <label style={lbl}>Trigger Condition <span style={{ color:'#dc2626' }}>*</span></label>
        <textarea value={form.trigger_condition} onChange={e => setForm(f => ({...f, trigger_condition:e.target.value}))} rows={3}
          placeholder="When should this recommendation trigger? (e.g. customer mentions bodybuilding, gym, or high protein needs)" style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Describe the customer intent or context that triggers this recommendation</div>
      </div>
      <div>
        <label style={lbl}>Recommended Items <span style={{ color:'#dc2626' }}>*</span></label>
        <textarea value={form.recommended_items} onChange={e => setForm(f => ({...f, recommended_items:e.target.value}))} rows={4}
          placeholder="List the items to recommend, e.g.: Grilled Chicken Breast (35g protein), Grilled Tilapia (28g protein), Beans Porridge (18g plant protein)" style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>What should Chef Bems AI suggest when this condition is triggered?</div>
      </div>
      <div>
        <label style={lbl}>Context Tags</label>
        <input value={form.context_tags} onChange={e => setForm(f => ({...f, context_tags:e.target.value}))} placeholder="e.g. high-protein, gym, bodybuilding, post-workout" style={inp} />
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>Comma-separated tags for AI matching context</div>
      </div>
      <div>
        <label style={lbl}>Priority — {priority} <span style={{ fontSize:11, color:'#9ca3af' }}>(1 = highest, 10 = lowest)</span></label>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:11, color:'#9ca3af', width:10 }}>1</span>
          <input type="range" min={1} max={10} step={1} value={priority}
            onChange={e => setForm(f => ({...f, priority:parseInt(e.target.value)}))}
            style={{ flex:1 }} />
          <span style={{ fontSize:11, color:'#9ca3af', width:16 }}>10</span>
          <span style={{ fontSize:13, fontWeight:800, color:priColor, minWidth:20, textAlign:'center' }}>{priority}</span>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <Toggle checked={!!form.is_active} onChange={() => setForm(f => ({...f, is_active:!f.is_active}))} />
        <span style={{ fontSize:13, color:'#374151', fontWeight:600 }}>
          {form.is_active ? 'Active — Chef Bems AI will use this recommendation' : 'Inactive — recommendation is disabled'}
        </span>
      </div>
    </div>
  )
}

export default function Recommendation() {
  const { user } = useAuth()
  const [recs, setRecs]               = useState([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [addModal, setAddModal]       = useState(false)
  const [editModal, setEditModal]     = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [viewModal, setViewModal]     = useState(null)
  const [form, setForm]               = useState({ ...BLANK })
  const [editForm, setEditForm]       = useState({ ...BLANK })

  const fetchRecs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit:50 }
      if (search) params.search = search
      const { data } = await api.get('/admin/chef-bems/recommendations', { params })
      setRecs(data.recommendations || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchRecs() }, [fetchRecs])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const saveRec = async () => {
    if (!form.title.trim())             { toast.error('Title is required');             return }
    if (!form.trigger_condition.trim()) { toast.error('Trigger condition is required'); return }
    if (!form.recommended_items.trim()) { toast.error('Recommended items are required');return }
    setSaving(true)
    try {
      const { data } = await api.post('/admin/chef-bems/recommendations', form)
      setRecs(prev => [data.recommendation, ...prev])
      setTotal(t => t+1)
      setForm({ ...BLANK })
      setAddModal(false)
      toast.success('Recommendation added')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save recommendation')
    } finally {
      setSaving(false)
    }
  }

  const updateRec = async () => {
    if (!editForm.title.trim())             { toast.error('Title is required');             return }
    if (!editForm.trigger_condition.trim()) { toast.error('Trigger condition is required'); return }
    if (!editForm.recommended_items.trim()) { toast.error('Recommended items are required');return }
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/chef-bems/recommendations/${editModal.id}`, editForm)
      setRecs(prev => prev.map(r => r.id === editModal.id ? data.recommendation : r))
      setEditModal(null)
      toast.success('Recommendation updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update recommendation')
    } finally {
      setSaving(false)
    }
  }

  const deleteRec = async () => {
    setSaving(true)
    try {
      await api.delete(`/admin/chef-bems/recommendations/${deleteModal.id}`)
      setRecs(prev => prev.filter(r => r.id !== deleteModal.id))
      setTotal(t => t-1)
      setDeleteModal(null)
      toast.success('Recommendation deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete recommendation')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (rec) => {
    try {
      const { data } = await api.put(`/admin/chef-bems/recommendations/${rec.id}`, { ...rec, is_active:!rec.is_active })
      setRecs(prev => prev.map(r => r.id === rec.id ? data.recommendation : r))
      toast.success(data.recommendation.is_active ? 'Recommendation activated' : 'Recommendation deactivated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update')
    }
  }

  const openEdit = (r) => {
    setEditForm({ title:r.title||'', trigger_condition:r.trigger_condition||'', recommended_items:r.recommended_items||'', context_tags:r.context_tags||'', priority:r.priority||5, is_active: r.is_active !== false })
    setEditModal(r)
  }

  const kpi = {
    total,
    active: recs.filter(r => r.is_active !== false).length,
    highPri: recs.filter(r => parseInt(r.priority||5) <= 3).length,
  }

  const priColor = (p) => {
    const n = parseInt(p || 5)
    return n <= 3 ? { bg:'#fee2e2', color:'#dc2626' } : n <= 6 ? { bg:'#fef3c7', color:'#b45309' } : { bg:'#dcfce7', color:'#15803d' }
  }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PageHeader
        title="Chef Bems AI — Recommendations"
        subtitle="Define rules that tell Chef Bems AI what to recommend when specific conditions are detected."
        actions={
          <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={btn('#1B4332','#fff')}>
            <i className="ri-add-line" />Add Recommendation
          </button>
        }
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Recommendations', value:total,       icon:'ri-thumb-up-line',        bg:'#eff6ff', color:'#1d4ed8' },
          { label:'Active',                value:kpi.active,  icon:'ri-checkbox-circle-line', bg:'#f0fdf4', color:'#15803d' },
          { label:'High Priority (1-3)',   value:kpi.highPri, icon:'ri-alarm-warning-line',   bg:'#fef2f2', color:'#dc2626' },
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
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search title, trigger condition, or recommended items..."
            style={{ ...inp, paddingLeft:34 }} />
        </div>
        <button onClick={fetchRecs} style={{ ...btn('#f1f5f9','#374151'), padding:'9px 14px' }}>
          <i className="ri-refresh-line" />
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f3f4f6', background:'#f8fafc' }}>
              {['Title','Trigger Condition','Recommended Items','Priority','Active','Actions'].map(h => (
                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><Spinner /></td></tr>
            ) : recs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign:'center', padding:'48px 0', color:'#9ca3af' }}>
                  <i className="ri-thumb-up-line" style={{ fontSize:36, display:'block', marginBottom:8 }} />
                  <div>No recommendations found. {search ? 'Try a different search.' : 'Add your first AI recommendation rule.'}</div>
                  {!search && <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={{ ...btn('#1B4332','#fff'), marginTop:12 }}><i className="ri-add-line" />Add First Recommendation</button>}
                </td>
              </tr>
            ) : recs.map((r, i) => {
              const pc = priColor(r.priority)
              const isActive = r.is_active !== false
              return (
                <tr key={r.id} style={{ borderBottom:'1px solid #f9fafb', background: i%2===0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding:'12px 16px', fontFamily:'Nunito, sans-serif', minWidth:160 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:'#111827', marginBottom:2 }}>{r.title}</div>
                    {r.context_tags && (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:4 }}>
                        {r.context_tags.split(',').slice(0,2).map(t => t.trim()).filter(Boolean).map(t => (
                          <span key={t} style={{ fontSize:9, fontWeight:600, padding:'1px 6px', borderRadius:50, background:'#ede9fe', color:'#5b21b6' }}>{t}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'#374151', fontFamily:'Nunito, sans-serif', maxWidth:200 }}>
                    <div style={{ overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', lineHeight:1.5 }}>
                      {r.trigger_condition}
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'#374151', fontFamily:'Nunito, sans-serif', maxWidth:200 }}>
                    <div style={{ overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', lineHeight:1.5 }}>
                      {r.recommended_items}
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:12, fontWeight:700, padding:'3px 9px', borderRadius:50, background:pc.bg, color:pc.color }}>{r.priority || 5}</span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <Toggle checked={isActive} onChange={() => toggleActive(r)} />
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => setViewModal(r)} style={{ ...btn('#f1f5f9','#374151'), padding:'5px 10px', fontSize:11 }}>
                        <i className="ri-eye-line" />
                      </button>
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

      {/* View Modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.title || 'Recommendation Detail'}>
        {viewModal && (() => {
          const pc = priColor(viewModal.priority)
          return (
            <div style={{ display:'grid', gap:16 }}>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:50, background:pc.bg, color:pc.color }}>Priority {viewModal.priority || 5}</span>
                <span style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:50, background: viewModal.is_active !== false ? '#dcfce7' : '#f1f5f9', color: viewModal.is_active !== false ? '#15803d' : '#475569' }}>
                  {viewModal.is_active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Trigger Condition</div>
                <div style={{ background:'#f8fafc', border:'1px solid #e5e7eb', borderRadius:8, padding:'12px', fontSize:13, color:'#374151', lineHeight:1.6 }}>{viewModal.trigger_condition}</div>
              </div>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Recommended Items</div>
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'12px', fontSize:13, color:'#166534', lineHeight:1.7, whiteSpace:'pre-line' }}>{viewModal.recommended_items}</div>
              </div>
              {viewModal.context_tags && (
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:6 }}>Context Tags</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {viewModal.context_tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} style={{ fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:50, background:'#ede9fe', color:'#5b21b6' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ fontSize:11, color:'#9ca3af' }}>
                Created: {viewModal.created_at ? new Date(viewModal.created_at).toLocaleString() : '—'}
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button onClick={() => { setViewModal(null); openEdit(viewModal) }} style={btn('#1B4332','#fff')}>
                  <i className="ri-edit-line" />Edit
                </button>
              </div>
            </div>
          )
        })()}
      </Modal>

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Recommendation Rule">
        <RecForm form={form} setForm={setForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setAddModal(false)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={saveRec} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Save
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Recommendation Rule">
        <RecForm form={editForm} setForm={setEditForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setEditModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={updateRec} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Update
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Recommendation" danger>
        {deleteModal && (
          <>
            <p style={{ fontSize:13, color:'#374151', marginBottom:20, lineHeight:1.6 }}>
              Are you sure you want to delete <strong>"{deleteModal.title}"</strong>? Chef Bems AI will no longer use this recommendation rule.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
              <button onClick={deleteRec} disabled={saving} style={{ ...btn('#dc2626','#fff'), opacity:saving?0.7:1 }}>
                {saving ? <Spinner size={14} inline /> : <i className="ri-delete-bin-line" />}Delete
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
