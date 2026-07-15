import { useState, useMemo, useEffect } from 'react'

import api from '../../lib/api'
import toast from 'react-hot-toast'
const BLANK = { name:'', short:'', type:'count', step:1, status:'active' }

const TYPES = ['weight','volume','count']

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

const TYPE_COLOR = { weight:'#0ab39c', volume:'#299cdb', count:'#a78bfa' }

export default function Units() {
  const [items, setItems]             = useState([])
  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal] = useState(null)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm]               = useState(BLANK)

  const fetchItems = async () => {
    try {
      const res = await api.get('/admin/config/units')
      setItems(res.data.units)
    } catch (err) {
      toast.error('Failed to load units')
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  const filtered = useMemo(() => items.filter(r => {
    const m = r.name.toLowerCase().includes(search.toLowerCase()) || r.short.toLowerCase().includes(search.toLowerCase())
    return m && (filterType==='all'||r.type===filterType) && (filterStatus==='all'||r.status===filterStatus)
  }), [items, search, filterType, filterStatus])

  const stats = useMemo(() => ({
    total:    items.length,
    weight:   items.filter(i=>i.type==='weight').length,
    volume:   items.filter(i=>i.type==='volume').length,
    count:    items.filter(i=>i.type==='count').length,
  }), [items])

  function openAdd() { setEditItem(null); setForm({ ...BLANK }); setActiveModal('form') }
  function openEdit(r) { setEditItem(r); setForm({ ...r }); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  async function saveForm(e) {
    e.preventDefault()
    try {
      if (editItem) {
        const res = await api.put(`/admin/config/units/${editItem.id}`, form)
        setItems(p=>p.map(r=>r.id===editItem.id?{...res.data, products: r.products}:r))
        toast.success('Unit updated')
      } else {
        const res = await api.post('/admin/config/units', form)
        setItems(p=>[{...res.data, products:0}, ...p])
        toast.success('Unit created')
      }
      closeModal()
    } catch (err) {
      toast.error('Failed to save unit')
    }
  }

  async function confirmDelete() { 
    try {
      await api.delete(`/admin/config/units/${editItem.id}`)
      setItems(p=>p.filter(r=>r.id!==editItem.id))
      toast.success('Unit deleted')
      closeModal()
    } catch (err) {
      toast.error('Failed to delete')
    }
  }

  const B = '#e5e7eb', S = '#6b7280'

  const STAT_CARDS = [
    { label:'Total Units', value:stats.total,  icon:'ri-ruler-2-line',      color:'#405189' },
    { label:'Weight',      value:stats.weight, icon:'ri-scales-3-line',     color:'#0ab39c' },
    { label:'Volume',      value:stats.volume, icon:'ri-flask-line',        color:'#299cdb' },
    { label:'Count',       value:stats.count,  icon:'ri-hashtag',           color:'#a78bfa' },
  ]

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Units of Measure</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Units</div>
        </div>
        <button style={btnP} onClick={openAdd}><i className="ri-add-line"/>Add Unit</button>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24 }}>
        {STAT_CARDS.map(c=>(
          <div key={c.label} style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,borderLeft:`4px solid ${c.color}`,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:44,height:44,borderRadius:'50%',background:`${c.color}1a`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <i className={c.icon} style={{ fontSize:22,color:c.color }}/>
            </div>
            <div>
              <div style={{ fontWeight:800,fontSize:22,color:c.color,fontFamily:'Syne,sans-serif' }}>{c.value}</div>
              <div style={{ fontSize:12,color:S }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <div style={{ position:'relative',flex:'1 1 200px' }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
            <input type="text" placeholder="Search units…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp,paddingLeft:34 }}/>
          </div>
          <select style={{ ...inp,width:'auto' }} value={filterType} onChange={e=>setFilterType(e.target.value)}>
            <option value="all">All Types</option>
            {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          <select style={{ ...inp,width:'auto' }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Unit Name','Short Name','Type','Step','Products','Status','Created','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length===0&&(
                <tr><td colSpan={8} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                  <i className="ri-ruler-2-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No units found
                </td></tr>
              )}
              {filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{ ...TD,fontWeight:600 }}>{r.name}</td>
                  <td style={TD}><code style={{ fontSize:12,background:'#f3f4f6',padding:'2px 8px',borderRadius:4,color:'#374151',fontWeight:600 }}>{r.short}</code></td>
                  <td style={TD}>
                    <span style={{ background:`${TYPE_COLOR[r.type]}1a`,color:TYPE_COLOR[r.type],borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>{r.type}</span>
                  </td>
                  <td style={{ ...TD,color:S }}>{r.step}</td>
                  <td style={TD}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600 }}>{r.products}</span></td>
                  <td style={TD}>
                    <span style={{ background:r.status==='active'?'#dcfce7':'#fee2e2',color:r.status==='active'?'#166534':'#991b1b',borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600 }}>
                      {r.status==='active'?'Active':'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...TD,color:S,fontSize:12 }}>{r.created}</td>
                  <td style={TD}>
                    <div style={{ display:'flex',gap:4 }}>
                      <button onClick={()=>openEdit(r)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}><i className="ri-pencil-line"/></button>
                      <button onClick={()=>openDelete(r)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }}><i className="ri-delete-bin-line"/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S }}>
          Showing {filtered.length} of {items.length} units
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {activeModal==='form'&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:440,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-ruler-2-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{editItem?'Edit Unit':'Add New Unit'}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={saveForm} style={{ padding:24 }}>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Unit Name <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Kilogram"/>
                  </div>
                  <div>
                    <label style={LBL}>Short Name <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.short} onChange={e=>setForm(f=>({...f,short:e.target.value}))} placeholder="e.g., kg"/>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Type</label>
                    <select style={inp} value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                      {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Step / Increment</label>
                    <input style={inp} type="number" min={0.01} step={0.01} value={form.step} onChange={e=>setForm(f=>({...f,step:parseFloat(e.target.value)||1}))}/>
                  </div>
                </div>
                <div style={{ marginBottom:24 }}>
                  <label style={LBL}>Status</label>
                  <select style={inp} value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }}>{editItem?'Save Changes':'Add Unit'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* DELETE MODAL */}
      {activeModal==='delete'&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:360,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#7f1d1d',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-delete-bin-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Unit?</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24 }}>
                <p style={{ color:'#6b7280',fontSize:14,textAlign:'center',marginBottom:24 }}>Delete <strong style={{ color:'#111827' }}>{editItem?.name}</strong>? Products using this unit will be affected.</p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
