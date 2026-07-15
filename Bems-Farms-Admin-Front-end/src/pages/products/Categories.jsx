import { useState, useMemo, useEffect } from 'react'
import ImportModal from '../../components/ImportModal'

import api from '../../lib/api'
import toast from 'react-hot-toast'

function genCode(name, existingCodes=[]) {
  const slug = name.trim().toUpperCase().replace(/[^A-Z]/g,'').slice(0,3).padEnd(3,'X')
  let n=1, code
  do { code=`CAT-${slug}-${String(n).padStart(3,'0')}`; n++ }
  while (existingCodes.includes(code))
  return code
}

const IMPORT_FIELDS = [
  { key:'name',        label:'Name',        required:true  },
  { key:'description', label:'Description', required:false },
  { key:'status',      label:'Status',      required:false },
]

const BLANK = { name:'', code:'', products:0, status:'active', description:'' }

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

export default function Categories() {
  const [items, setItems]               = useState([])
  const [search, setSearch]             = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeModal, setActiveModal]   = useState(null)
  const [editItem, setEditItem]         = useState(null)
  const [form, setForm]                 = useState(BLANK)
  const [loading, setLoading]           = useState(true)

  const fetchItems = async () => {
    try {
      const res = await api.get('/admin/config/categories')
      setItems(res.data.categories)
    } catch (err) {
      toast.error('Failed to load categories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
  }, [])

  useEffect(() => {
    if (!editItem && form.name.trim()) {
      setForm(f => ({ ...f, code: genCode(f.name, items.map(i=>i.code)) }))
    }
  }, [form.name]) // eslint-disable-line

  const filtered = useMemo(() => items.filter(r => {
    const m = r.name.toLowerCase().includes(search.toLowerCase()) || r.code.toLowerCase().includes(search.toLowerCase())
    return m && (filterStatus==='all' || r.status===filterStatus)
  }), [items, search, filterStatus])

  const stats = useMemo(() => ({
    total:    items.length,
    active:   items.filter(i=>i.status==='active').length,
    inactive: items.filter(i=>i.status==='inactive').length,
    products: items.reduce((s,i)=>s+i.products,0),
  }), [items])

  function openAdd() { setEditItem(null); setForm({ ...BLANK }); setActiveModal('form') }
  function openEdit(r) { setEditItem(r); setForm({ ...r }); setActiveModal('form') }
  function openDelete(r) { setEditItem(r); setActiveModal('delete') }
  function closeModal() { setActiveModal(null); setEditItem(null) }

  async function saveForm(e) {
    e.preventDefault()
    const payload = { ...form, code: form.code || genCode(form.name, items.map(i=>i.code)) }
    
    try {
      if (editItem) {
        const res = await api.put(`/admin/config/categories/${editItem.id}`, payload)
        setItems(p => p.map(r => r.id === editItem.id ? { ...res.data, products: r.products } : r))
        toast.success('Category updated')
      } else {
        const res = await api.post('/admin/config/categories', payload)
        setItems(p => [{ ...res.data, products: 0 }, ...p])
        toast.success('Category created')
      }
      closeModal()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save category')
    }
  }

  async function confirmDelete() { 
    try {
      await api.delete(`/admin/config/categories/${editItem.id}`)
      setItems(p => p.filter(r => r.id !== editItem.id))
      toast.success('Category deleted')
      closeModal()
    } catch (err) {
      toast.error('Failed to delete category')
    }
  }

  function handleImport(rows) {
    const existingCodes = items.map(i=>i.code)
    const today = new Date().toISOString().slice(0,10)
    const newItems = rows.map((row,idx) => {
      const name = row.name?.trim()||`Imported ${idx+1}`
      const code = genCode(name,[...existingCodes]); existingCodes.push(code)
      return { id:Math.max(...items.map(i=>i.id),0)+idx+1,name,code,description:row.description||'',products:0,status:row.status?.toLowerCase()==='inactive'?'inactive':'active',created:today }
    })
    setItems(p=>[...p,...newItems]); closeModal()
  }

  const B = '#e5e7eb', S = '#6b7280'

  const STAT_CARDS = [
    { label:'Total Categories', value:stats.total,    icon:'ri-price-tag-3-line',     color:'#405189', filter:'all'      },
    { label:'Active',           value:stats.active,   icon:'ri-checkbox-circle-line', color:'#0ab39c', filter:'active'   },
    { label:'Inactive',         value:stats.inactive, icon:'ri-close-circle-line',    color:'#f7b84b', filter:'inactive' },
    { label:'Total Products',   value:stats.products, icon:'ri-box-3-line',           color:'#299cdb', filter:'all'      },
  ]

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Page header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Categories</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Categories</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24 }}>
        {STAT_CARDS.map(c=>(
          <div key={c.label} onClick={()=>setFilterStatus(c.filter)}
            style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,borderLeft:`4px solid ${c.color}`,padding:16,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',alignItems:'center',gap:14 }}>
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
          <div style={{ position:'relative',flex:'1 1 220px' }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
            <input type="text" placeholder="Search categories…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp,paddingLeft:34 }}/>
          </div>
          <select style={{ ...inp,width:'auto' }} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button style={btnL} onClick={()=>setActiveModal('import')}><i className="ri-upload-cloud-2-line"/>Import</button>
          <button style={btnP} onClick={openAdd}><i className="ri-add-line"/>Add Category</button>
        </div>

        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Category','Description','Code','Products','Status','Created','Action'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.length===0&&(
                <tr><td colSpan={7} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                  <i className="ri-price-tag-3-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>No categories found
                </td></tr>
              )}
              {filtered.map(r=>(
                <tr key={r.id}>
                  <td style={{ ...TD,fontWeight:600 }}>{r.name}</td>
                  <td style={{ ...TD,color:S,fontSize:12,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }} title={r.description}>{r.description || '—'}</td>
                  <td style={TD}><code style={{ fontSize:11,background:'#f3f4f6',padding:'2px 6px',borderRadius:4,color:'#374151' }}>{r.code}</code></td>
                  <td style={TD}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:600 }}>{r.products}</span></td>
                  <td style={TD}>
                    <span style={{ background:r.status==='active'?'#dcfce7':'#f3f4f6',color:r.status==='active'?'#166534':'#6b7280',borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600 }}>
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
          Showing {filtered.length} of {items.length} categories
        </div>
      </div>

      {/* ADD/EDIT MODAL */}
      {activeModal==='form'&&(
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:460,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-price-tag-3-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{editItem?'Edit Category':'Add New Category'}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={saveForm} style={{ padding:24 }}>
                <div style={{ marginBottom:16 }}>
                  <label style={LBL}>Category Name <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Fresh Produce"/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={LBL}>Description</label>
                  <textarea style={{ ...inp,height:60,resize:'none' }} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="e.g., Organic vegetables and greens"/>
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={LBL}>Code <span style={{ fontSize:11,fontWeight:400,color:S }}>(auto-generated)</span></label>
                  <input style={{ ...inp,background:'#f9fafb',color:S }} readOnly value={form.code} placeholder="Type name above to generate code"/>
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
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }}>{editItem?'Save Changes':'Add Category'}</button>
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
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Category?</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}><strong style={{ color:'#111827' }}>{editItem?.name}</strong></p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={confirmDelete}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeModal==='import'&&<ImportModal entityName="Categories" fields={IMPORT_FIELDS} onImport={handleImport} onClose={closeModal}/>}
    </div>
  )
}
