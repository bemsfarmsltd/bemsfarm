import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const btnD = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#f06548',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

function fmtCurrency(n) { return `₦${Number(n||0).toLocaleString('en-NG')}` }

function stockBadge(p) {
  if ((p.stock||0)===0) return ['Out of Stock','#fee2e2','#991b1b']
  if ((p.stock||0)<=(p.low_stock_threshold||10)) return ['Low Stock','#fef3c7','#92400e']
  return ['In Stock','#dcfce7','#166534']
}
function statusBadge(s) {
  if (s==='active') return ['#dcfce7','#166534']
  if (s==='draft') return ['#fef3c7','#92400e']
  return ['#fee2e2','#991b1b']
}

function Badge({ label, bg, color }) {
  return <span style={{ background:bg,color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,whiteSpace:'nowrap' }}>{label}</span>
}

export default function ProductsList() {
  const [products, setProducts] = useState([])
  const [total, setTotal]       = useState(0)
  const [pages, setPages]       = useState(1)
  const [page, setPage]         = useState(1)
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus]     = useState('')
  const [stock, setStock]       = useState('')
  const [categories, setCategories] = useState([])
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selected, setSelected] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/products', { params:{ page,limit:20,search,category,status,stock } })
      setProducts(res.data.products)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } catch { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }, [page, search, category, status, stock])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/admin/products/form-data').then(r=>setCategories(r.data.categories||[])).catch(()=>{}) }, [])
  useEffect(() => { const t=setTimeout(()=>{ setPage(1); load() },400); return ()=>clearTimeout(t) }, [search])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/admin/products/${deleteId}`)
      toast.success('Product archived'); setDeleteId(null); load()
    } catch { toast.error('Failed to delete product') }
    finally { setDeleting(false) }
  }

  const toggleSelect = id => setSelected(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id])
  const toggleAll    = () => setSelected(p => p.length===products.length ? [] : products.map(p=>p.id))

  const B = '#e5e7eb', S = '#6b7280', BG2 = '#f9fafb'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      {/* Page header */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Products</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>{total} products total</div>
        </div>
        <div style={{ display:'flex',gap:8,flexWrap:'wrap' }}>
          {selected.length>0&&<button style={btnD}><i className="ri-delete-bin-line"/>Delete ({selected.length})</button>}
          <Link to="/products/import" style={{ ...btnL,textDecoration:'none' }}><i className="ri-upload-cloud-2-line"/>Import</Link>
          <Link to="/products/add" style={{ ...btnP,textDecoration:'none' }}><i className="ri-add-line"/>Add Product</Link>
        </div>
      </div>

      {/* Table card */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        {/* Filters */}
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
          <div style={{ position:'relative',flex:'1 1 220px' }}>
            <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
            <input type="text" placeholder="Search products…" value={search} onChange={e=>{ setSearch(e.target.value); setPage(1) }} style={{ ...inp,paddingLeft:34 }}/>
          </div>
          <select style={{ ...inp,width:'auto',minWidth:150 }} value={category} onChange={e=>{ setCategory(e.target.value); setPage(1) }}>
            <option value="">All Categories</option>
            {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select style={{ ...inp,width:'auto',minWidth:130 }} value={status} onChange={e=>{ setStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
          <select style={{ ...inp,width:'auto',minWidth:130 }} value={stock} onChange={e=>{ setStock(e.target.value); setPage(1) }}>
            <option value="">All Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>
                <th style={TH}><input type="checkbox" checked={selected.length===products.length&&products.length>0} onChange={toggleAll} style={{ cursor:'pointer' }}/></th>
                {['Product','Category','Price','Cost','Stock','Status','Revenue','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading&&[...Array(6)].map((_,i)=>(
                <tr key={i}>{[...Array(9)].map((_,j)=><td key={j} style={TD}><div style={{ height:14,background:'#f0f0f0',borderRadius:4 }}/></td>)}</tr>
              ))}
              {!loading&&products.map(p=>{
                const [slbl,sbg,sclr]=stockBadge(p); const [stbg,stclr]=statusBadge(p.status)
                return (
                  <tr key={p.id} style={{ background:selected.includes(p.id)?'#f0fdf4':'transparent' }}>
                    <td style={TD}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleSelect(p.id)} style={{ cursor:'pointer' }}/></td>
                    <td style={TD}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} style={{ width:36,height:36,borderRadius:8,objectFit:'cover',border:`1px solid ${B}`,flexShrink:0 }}/>
                          : <div style={{ width:36,height:36,borderRadius:8,background:'#f0f4ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>🌿</div>
                        }
                        <div>
                          <div style={{ fontWeight:600,fontSize:13 }}>{p.name}</div>
                          <div style={{ fontSize:10,color:S }}>{p.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{p.category||'—'}</td>
                    <td style={{ ...TD,fontWeight:600 }}>{fmtCurrency(p.unit_price||p.price)}</td>
                    <td style={{ ...TD,color:S }}>{p.cost_price?fmtCurrency(p.cost_price):'—'}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                        <Badge label={slbl} bg={sbg} color={sclr}/>
                        <span style={{ fontSize:11,color:S }}>({p.stock||0})</span>
                      </div>
                    </td>
                    <td style={TD}><Badge label={p.status} bg={stbg} color={stclr}/></td>
                    <td style={{ ...TD,fontWeight:600,color:'#16a34a' }}>{p.revenue?fmtCurrency(p.revenue):'₦0'}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <Link to={`/products/${p.id}`} title="View" style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:BG2,color:'#374151',textDecoration:'none' }}><i className="ri-eye-line"/></Link>
                        <Link to={`/products/${p.id}/edit`} title="Edit" style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:BG2,color:'#374151',textDecoration:'none' }}><i className="ri-pencil-line"/></Link>
                        <button title="Delete" onClick={()=>setDeleteId(p.id)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:BG2,color:'#f06548',cursor:'pointer' }}><i className="ri-delete-bin-line"/></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!loading&&products.length===0&&(
                <tr><td colSpan={9} style={{ ...TD,textAlign:'center',padding:'60px 0',color:S }}>
                  <i className="ri-inbox-line" style={{ fontSize:36,display:'block',marginBottom:8 }}/>
                  No products found. <Link to="/products/add" style={{ color:'#1B4332' }}>Add your first product →</Link>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages>1&&(
          <div style={{ padding:'12px 20px',borderTop:`1px solid ${B}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8 }}>
            <span style={{ fontSize:12,color:S }}>Showing {(page-1)*20+1}–{Math.min(page*20,total)} of {total} products</span>
            <div style={{ display:'flex',gap:4 }}>
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} style={{ ...btnL,padding:'5px 10px',opacity:page===1?.5:1,cursor:page===1?'not-allowed':'pointer' }}><i className="ri-arrow-left-s-line"/></button>
              {[...Array(Math.min(pages,5))].map((_,i)=>(
                <button key={i} onClick={()=>setPage(i+1)} style={{ ...page===i+1?{...btnP,minWidth:34}:{...btnL,minWidth:34},padding:'5px 12px',justifyContent:'center' }}>{i+1}</button>
              ))}
              <button disabled={page===pages} onClick={()=>setPage(p=>p+1)} style={{ ...btnL,padding:'5px 10px',opacity:page===pages?.5:1,cursor:page===pages?'not-allowed':'pointer' }}><i className="ri-arrow-right-s-line"/></button>
            </div>
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId&&(
        <>
          <div onClick={()=>setDeleteId(null)} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:380,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#7f1d1d',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}><i className="ri-delete-bin-line" style={{ fontSize:18 }}/></div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>Delete Product?</span>
                <button onClick={()=>setDeleteId(null)} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <div style={{ padding:24,textAlign:'center' }}>
                <p style={{ color:S,fontSize:14,marginBottom:24 }}>It will be archived and hidden from the store.</p>
                <div style={{ display:'flex',gap:10 }}>
                  <button style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>setDeleteId(null)}>Cancel</button>
                  <button style={{ ...btnD,flex:1,justifyContent:'center' }} onClick={handleDelete} disabled={deleting}>{deleting?'Deleting…':'Yes, Delete'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
