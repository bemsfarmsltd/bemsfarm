import { useState, useMemo, useRef, useEffect } from 'react'
import api from '../../lib/api'

const BARCODE_TYPES = ['code128','code39','qr']
const LABEL_SIZES   = ['58x40mm','80x50mm','100x60mm','A4 Sheet']

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

function BarcodeDisplay({ value, type }) {
  const BAR_W = 1.5
  const bars = useMemo(() => {
    let hash = 0
    for (let i=0;i<value.length;i++) hash=(hash*31+value.charCodeAt(i))>>>0
    const count = 20 + (hash % 15)
    const result = []
    for (let i=0;i<count;i++) result.push((hash>>(i%32))&1 ? BAR_W*(1+(i%3)) : BAR_W*0.7)
    return result
  }, [value])

  if (type==='qr') return (
    <div style={{ width:64,height:64,display:'grid',gridTemplateColumns:'repeat(8,8px)',gap:0 }}>
      {[...Array(64)].map((_,i)=>{
        let h=0; for(let j=0;j<value.length;j++) h=(h*31+value.charCodeAt(j))>>>0
        return <div key={i} style={{ width:8,height:8,background:(h>>((i*3)%32))&1?'#111827':'transparent' }}/>
      })}
    </div>
  )

  return (
    <div style={{ display:'flex',alignItems:'flex-end',height:40,gap:'1px' }}>
      {bars.map((w,i)=>(
        <div key={i} style={{ width:w,height:i%2===0?40:30,background:'#111827',flexShrink:0 }}/>
      ))}
    </div>
  )
}

export default function Barcode() {
  const [products, setProducts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState([])
  const [barcodeType, setBarcodeType] = useState('code128')
  const [labelSize, setLabelSize]     = useState('58x40mm')
  const [showName, setShowName]       = useState(true)
  const [showPrice, setShowPrice]     = useState(true)
  const [showSKU, setShowSKU]         = useState(true)
  const [copies, setCopies]           = useState(1)
  const [printing, setPrinting]       = useState(false)
  const printRef = useRef(null)

  useEffect(() => {
    api.get('/admin/products?limit=100')
      .then(res => {
        const items = (res.data?.products || res.data || []).map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || `N/A-${p.id}`,
          category: p.category || '',
          price: p.price || p.unit_price || 0,
          unit: p.unit || 'pcs'
        }))
        setProducts(items)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load products for barcodes:', err)
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
  ), [products, search])

  function toggleSelect(id) {
    setSelected(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id])
  }
  function toggleAll() {
    setSelected(p=>p.length===filtered.length?[]:filtered.map(p=>p.id))
  }

  const selectedProducts = products.filter(p=>selected.includes(p.id))

  function handlePrint() {
    setPrinting(true)
    setTimeout(() => { window.print(); setPrinting(false) }, 500)
  }

  const B = '#e5e7eb', S = '#6b7280'

  function Toggle({ value, onChange, label }) {
    return (
      <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'#374151' }}>
        <div onClick={onChange} style={{ width:38,height:20,borderRadius:20,background:value?'#1B4332':'#d1d5db',position:'relative',cursor:'pointer',flexShrink:0,transition:'background .2s' }}>
          <div style={{ position:'absolute',top:2,left:value?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
        </div>
        {label}
      </label>
    )
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Barcode Generator</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Barcode</div>
        </div>
        {selected.length>0&&(
          <button style={btnP} onClick={handlePrint} disabled={printing}>
            {printing?<><i className="ri-loader-4-line"/>Preparing…</>:<><i className="ri-printer-line"/>Print {selected.length} Label{selected.length>1?'s':''}</>}
          </button>
        )}
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 300px',gap:20,alignItems:'start' }}>
        {/* Product selection */}
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:10 }}>
            <div style={{ position:'relative',flex:1 }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
              <input type="text" placeholder="Search products…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp,paddingLeft:34 }}/>
            </div>
            {selected.length>0&&<button style={btnL} onClick={()=>setSelected([])}><i className="ri-close-line"/>Clear ({selected.length})</button>}
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  <th style={TH}><input type="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={toggleAll} style={{ cursor:'pointer' }}/></th>
                  {['Product','SKU','Barcode','Category','Price','Preview'].map(h=><th key={h} style={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p.id} style={{ background:selected.includes(p.id)?'#f0fdf4':'transparent' }}>
                    <td style={TD}><input type="checkbox" checked={selected.includes(p.id)} onChange={()=>toggleSelect(p.id)} style={{ cursor:'pointer' }}/></td>
                    <td style={{ ...TD,fontWeight:600 }}>{p.name}</td>
                    <td style={TD}><code style={{ fontSize:11,background:'#f3f4f6',padding:'2px 6px',borderRadius:4,color:'#374151' }}>{p.sku}</code></td>
                    <td style={{ ...TD,fontSize:11,color:S }}>{p.barcode}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{p.category}</td>
                    <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>₦{p.price.toLocaleString()}</td>
                    <td style={TD}>
                      <div style={{ transform:'scale(0.5)',transformOrigin:'left center',height:22 }}>
                        <BarcodeDisplay value={p.barcode} type={barcodeType}/>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Print Settings */}
        <div style={{ position:'sticky',top:80 }}>
          <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Label Settings</div>
            <div style={{ padding:20,display:'flex',flexDirection:'column',gap:14 }}>
              <div>
                <label style={LBL}>Barcode Type</label>
                <select style={inp} value={barcodeType} onChange={e=>setBarcodeType(e.target.value)}>
                  {BARCODE_TYPES.map(t=><option key={t} value={t}>{t.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Label Size</label>
                <select style={inp} value={labelSize} onChange={e=>setLabelSize(e.target.value)}>
                  {LABEL_SIZES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={LBL}>Copies per Product</label>
                <input type="number" min={1} max={100} style={inp} value={copies} onChange={e=>setCopies(parseInt(e.target.value)||1)}/>
              </div>
              <div style={{ display:'flex',flexDirection:'column',gap:10,paddingTop:4 }}>
                <Toggle value={showName}  onChange={()=>setShowName(v=>!v)}  label="Show Product Name"/>
                <Toggle value={showPrice} onChange={()=>setShowPrice(v=>!v)} label="Show Price"/>
                <Toggle value={showSKU}   onChange={()=>setShowSKU(v=>!v)}   label="Show SKU"/>
              </div>
            </div>
          </div>

          {/* Label Preview */}
          {selectedProducts.length>0&&(
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
              <div style={{ padding:'12px 16px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:12 }}>Label Preview</div>
              <div style={{ padding:16,display:'flex',justifyContent:'center' }}>
                <div style={{ border:'1px dashed #9ca3af',borderRadius:6,padding:'10px 14px',minWidth:130,textAlign:'center',background:'#fafafa' }}>
                  <div style={{ display:'flex',justifyContent:'center',marginBottom:6 }}>
                    <BarcodeDisplay value={selectedProducts[0].barcode} type={barcodeType}/>
                  </div>
                  <div style={{ fontSize:8,color:'#374151',fontFamily:'monospace' }}>{selectedProducts[0].barcode}</div>
                  {showName&&<div style={{ fontSize:10,fontWeight:700,color:'#111827',marginTop:4,lineHeight:'1.2' }}>{selectedProducts[0].name}</div>}
                  {showSKU&&<div style={{ fontSize:8,color:S }}>{selectedProducts[0].sku}</div>}
                  {showPrice&&<div style={{ fontSize:11,fontWeight:700,color:'#1B4332',marginTop:2 }}>₦{selectedProducts[0].price.toLocaleString()}</div>}
                </div>
              </div>
            </div>
          )}

          <button style={{ ...btnP,width:'100%',justifyContent:'center',opacity:selected.length===0?.5:1 }} disabled={selected.length===0||printing} onClick={handlePrint}>
            {printing?<><i className="ri-loader-4-line"/>Preparing…</>:<><i className="ri-printer-line"/>Print {selected.length>0?`${selected.length} Label${selected.length>1?'s':''}`:' Labels'}</>}
          </button>
          {selected.length===0&&<div style={{ textAlign:'center',fontSize:12,color:S,marginTop:8 }}>Select products from the table first</div>}
        </div>
      </div>
    </div>
  )
}
