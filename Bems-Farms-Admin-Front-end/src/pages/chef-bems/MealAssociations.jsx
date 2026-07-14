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

const ASSOCIATION_TYPES = [
  'pairs_well_with',
  'substitute_for',
  'complement',
  'avoid_with',
  'recommended_with',
  'similar_to',
]

const TYPE_CFG = {
  'pairs_well_with':    { bg:'#dcfce7', color:'#15803d', label:'Pairs Well With' },
  'substitute_for':     { bg:'#dbeafe', color:'#1e40af', label:'Substitute For' },
  'complement':         { bg:'#ede9fe', color:'#5b21b6', label:'Complement' },
  'avoid_with':         { bg:'#fee2e2', color:'#dc2626', label:'Avoid With' },
  'recommended_with':   { bg:'#fef3c7', color:'#b45309', label:'Recommended With' },
  'similar_to':         { bg:'#f1f5f9', color:'#475569', label:'Similar To' },
}

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

const BLANK = { product_name:'', associated_product_name:'', association_type:'pairs_well_with', strength:1.0, notes:'' }

function AssocForm({ form, setForm }) {
  return (
    <div style={{ display:'grid', gap:16 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <label style={lbl}>Product <span style={{ color:'#dc2626' }}>*</span></label>
          <input value={form.product_name} onChange={e => setForm(f => ({...f, product_name:e.target.value}))} placeholder="e.g. Jollof Rice" style={inp} />
        </div>
        <div>
          <label style={lbl}>Associated Product <span style={{ color:'#dc2626' }}>*</span></label>
          <input value={form.associated_product_name} onChange={e => setForm(f => ({...f, associated_product_name:e.target.value}))} placeholder="e.g. Fried Plantain" style={inp} />
        </div>
      </div>
      <div>
        <label style={lbl}>Association Type</label>
        <select value={form.association_type} onChange={e => setForm(f => ({...f, association_type:e.target.value}))} style={inp}>
          {ASSOCIATION_TYPES.map(t => (
            <option key={t} value={t}>{TYPE_CFG[t]?.label || t}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={lbl}>Strength / Weight</label>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <input type="range" min={0} max={2} step={0.1} value={form.strength}
            onChange={e => setForm(f => ({...f, strength:parseFloat(e.target.value)}))}
            style={{ flex:1 }} />
          <span style={{ fontSize:13, fontWeight:700, color:'#1B4332', minWidth:40 }}>{parseFloat(form.strength).toFixed(1)}</span>
        </div>
        <div style={{ fontSize:11, color:'#9ca3af', marginTop:4 }}>0.0 = weak association, 2.0 = very strong</div>
      </div>
      <div>
        <label style={lbl}>Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes:e.target.value}))} rows={3}
          placeholder="Optional context for this association..." style={{ ...inp, resize:'vertical', lineHeight:1.5 }} />
      </div>
    </div>
  )
}

export default function MealAssociations() {
  const { user } = useAuth()
  const [assocs, setAssocs]           = useState([])
  const [total, setTotal]             = useState(0)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch]           = useState('')
  const [typeFilter, setTypeFilter]   = useState('All')
  const [addModal, setAddModal]       = useState(false)
  const [editModal, setEditModal]     = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm]               = useState({ ...BLANK })
  const [editForm, setEditForm]       = useState({ ...BLANK })

  const fetchAssocs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { limit:50 }
      if (search) params.search = search
      const { data } = await api.get('/admin/chef-bems/meal-associations', { params })
      setAssocs(data.associations || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load meal associations')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetchAssocs() }, [fetchAssocs])

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const filtered = typeFilter === 'All' ? assocs : assocs.filter(a => a.association_type === typeFilter)

  const saveAssoc = async () => {
    if (!form.product_name.trim())            { toast.error('Product name is required'); return }
    if (!form.associated_product_name.trim()) { toast.error('Associated product name is required'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/admin/chef-bems/meal-associations', form)
      setAssocs(prev => [data.association, ...prev])
      setTotal(t => t+1)
      setForm({ ...BLANK })
      setAddModal(false)
      toast.success('Meal association added')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save association')
    } finally {
      setSaving(false)
    }
  }

  const updateAssoc = async () => {
    if (!editForm.product_name.trim())            { toast.error('Product name is required'); return }
    if (!editForm.associated_product_name.trim()) { toast.error('Associated product name is required'); return }
    setSaving(true)
    try {
      const { data } = await api.put(`/admin/chef-bems/meal-associations/${editModal.id}`, editForm)
      setAssocs(prev => prev.map(a => a.id === editModal.id ? data.association : a))
      setEditModal(null)
      toast.success('Association updated')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update association')
    } finally {
      setSaving(false)
    }
  }

  const deleteAssoc = async () => {
    setSaving(true)
    try {
      await api.delete(`/admin/chef-bems/meal-associations/${deleteModal.id}`)
      setAssocs(prev => prev.filter(a => a.id !== deleteModal.id))
      setTotal(t => t-1)
      setDeleteModal(null)
      toast.success('Association deleted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete association')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (a) => {
    setEditForm({ product_name: a.product_name||'', associated_product_name: a.associated_product_name||'', association_type: a.association_type||'pairs_well_with', strength: parseFloat(a.strength)||1.0, notes: a.notes||'' })
    setEditModal(a)
  }

  const kpi = {
    total,
    types: [...new Set(assocs.map(a => a.association_type))].length,
    strong: assocs.filter(a => parseFloat(a.strength||0) >= 1.5).length,
  }

  return (
    <div style={{ fontFamily:'Nunito, sans-serif' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <PageHeader
        title="Chef Bems AI — Meal Associations"
        subtitle="Define how products relate to each other for smarter AI recommendations."
        actions={
          <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={btn('#1B4332','#fff')}>
            <i className="ri-add-line" />Add Association
          </button>
        }
      />

      {/* KPI Strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Associations', value:total,      icon:'ri-links-line',         bg:'#eff6ff', color:'#1d4ed8' },
          { label:'Association Types',  value:kpi.types,  icon:'ri-price-tag-3-line',   bg:'#fdf4ff', color:'#7e22ce' },
          { label:'Strong Links (≥1.5)',value:kpi.strong, icon:'ri-star-line',           bg:'#fef9c3', color:'#713f12' },
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
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:240 }}>
          <i className="ri-search-line" style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'#9ca3af', fontSize:14 }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search product names or association type..."
            style={{ ...inp, paddingLeft:34 }} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ ...inp, width:'auto', minWidth:180 }}>
          <option value="All">All Types</option>
          {ASSOCIATION_TYPES.map(t => <option key={t} value={t}>{TYPE_CFG[t]?.label || t}</option>)}
        </select>
        <button onClick={fetchAssocs} style={{ ...btn('#f1f5f9','#374151'), padding:'9px 14px' }}>
          <i className="ri-refresh-line" />
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:12, border:'1px solid #e5e7eb', boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid #f3f4f6', background:'#f8fafc' }}>
              {['Product','Associated Product','Type','Strength','Notes','Created','Actions'].map(h => (
                <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:'Nunito, sans-serif', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><Spinner /></td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign:'center', padding:'48px 0', color:'#9ca3af' }}>
                  <i className="ri-links-line" style={{ fontSize:36, display:'block', marginBottom:8 }} />
                  <div>No meal associations found. {search && 'Try a different search.'}</div>
                  {!search && <button onClick={() => { setForm({...BLANK}); setAddModal(true) }} style={{ ...btn('#1B4332','#fff'), marginTop:12 }}><i className="ri-add-line" />Add First Association</button>}
                </td>
              </tr>
            ) : filtered.map((a, i) => {
              const typeCfg = TYPE_CFG[a.association_type] || { bg:'#f1f5f9', color:'#475569', label: a.association_type }
              const strength = parseFloat(a.strength || 0)
              const strColor = strength >= 1.5 ? '#15803d' : strength >= 0.8 ? '#b45309' : '#dc2626'
              return (
                <tr key={a.id} style={{ borderBottom:'1px solid #f9fafb', background: i%2===0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding:'12px 16px', fontSize:13, fontWeight:700, color:'#111827', fontFamily:'Nunito, sans-serif' }}>
                    {a.product_name}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'#374151', fontFamily:'Nunito, sans-serif' }}>
                    {a.associated_product_name}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <span style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:50, background:typeCfg.bg, color:typeCfg.color, whiteSpace:'nowrap' }}>
                      {typeCfg.label}
                    </span>
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:56, height:5, background:'#e5e7eb', borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.min(100, (strength/2)*100)}%`, background:strColor, borderRadius:999 }} />
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, color:strColor }}>{strength.toFixed(1)}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'#6b7280', fontFamily:'Nunito, sans-serif', maxWidth:200 }}>
                    {a.notes ? (
                      <div style={{ overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
                        {a.notes}
                      </div>
                    ) : <span style={{ color:'#d1d5db' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:11, color:'#9ca3af', whiteSpace:'nowrap' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => openEdit(a)} style={{ ...btn('#1B4332','#fff'), padding:'5px 10px', fontSize:11 }}>
                        <i className="ri-edit-line" />Edit
                      </button>
                      {(user?.role === 'superadmin' || user?.role === 'manager') && (
                        <button onClick={() => setDeleteModal(a)} style={{ ...btn('transparent','#dc2626','1.5px solid #fca5a5'), padding:'5px 10px', fontSize:11 }}>
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
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Meal Association">
        <AssocForm form={form} setForm={setForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setAddModal(false)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={saveAssoc} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Save
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Meal Association">
        <AssocForm form={editForm} setForm={setEditForm} />
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <button onClick={() => setEditModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
          <button onClick={updateAssoc} disabled={saving} style={{ ...btn('#1B4332','#fff'), opacity:saving?0.7:1 }}>
            {saving ? <Spinner size={14} inline /> : <i className="ri-save-line" />}Update
          </button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Association" danger>
        {deleteModal && (
          <>
            <p style={{ fontSize:13, color:'#374151', marginBottom:20, lineHeight:1.6 }}>
              Are you sure you want to delete the association between <strong>"{deleteModal.product_name}"</strong> and <strong>"{deleteModal.associated_product_name}"</strong>? This action cannot be undone.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteModal(null)} style={btn('#f1f5f9','#374151')}>Cancel</button>
              <button onClick={deleteAssoc} disabled={saving} style={{ ...btn('#dc2626','#fff'), opacity:saving?0.7:1 }}>
                {saving ? <Spinner size={14} inline /> : <i className="ri-delete-bin-line" />}Delete
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
