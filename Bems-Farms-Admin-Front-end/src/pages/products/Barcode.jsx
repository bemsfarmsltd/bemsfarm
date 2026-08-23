import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:600,fontSize:13 }
const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'var(--body-font)',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box',color:'var(--text-primary)' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:5 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'var(--bg-subtle)' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid var(--border)',fontSize:13,color:'var(--text-primary)' }

function TableStepper({ value, onChange }) {
  const handleMinus = () => {
    if (value > 1) onChange(value - 1)
  }
  const handlePlus = () => {
    onChange(value + 1)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleMinus}
        style={{
          width: 28,
          height: 28,
          border: '1.5px solid var(--border)',
          borderRight: 'none',
          borderRadius: '6px 0 0 6px',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          fontSize: 14,
          fontWeight: 'bold',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        −
      </button>
      <input
        type="number"
        min={1}
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 1)}
        style={{
          width: 38,
          height: 28,
          border: '1.5px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          fontFamily: 'var(--body-font)',
          fontSize: 12,
          fontWeight: 600,
          outline: 'none',
          margin: 0,
        }}
      />
      <button
        type="button"
        onClick={handlePlus}
        style={{
          width: 28,
          height: 28,
          border: '1.5px solid var(--border)',
          borderLeft: 'none',
          borderRadius: '0 6px 6px 0',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          fontSize: 14,
          fontWeight: 'bold',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        +
      </button>
    </div>
  )
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
      <div
        onClick={onChange}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: checked ? 'none' : '1.5px solid var(--border)',
          background: checked ? 'var(--orange-accent)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          transition: 'all 0.15s',
        }}
      >
        {checked && <i className="ri-check-line" style={{ fontSize: 18 }} />}
      </div>
      {label}
    </label>
  )
}

export default function Barcode() {
  const navigate = useNavigate()
  const [products, setProducts]       = useState([])
  const [categories, setCategories]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedList, setSelectedList] = useState([])
  
  const [selectedCategory, setSelectedCategory] = useState('')
  
  const [barcodeType, setBarcodeType]   = useState('code128')
  const [encodeValue, setEncodeValue]   = useState('sku')
  const [labelSize, setLabelSize]       = useState('80x50mm')
  
  const [showName, setShowName]         = useState(true)
  const [showPrice, setShowPrice]       = useState(true)
  const [includeLogo, setIncludeLogo]   = useState(false)
  const [printing, setPrinting]         = useState(false)

  useEffect(() => {
    // Fetch products
    api.get('/admin/products?limit=100')
      .then(res => {
        const items = (res.data?.products || res.data || []).map(p => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode || `CAT-MEA-00${p.id}`,
          category: p.category || 'Meals',
          category_id: p.category_id || '',
          price: p.price || p.unit_price || 0,
          image_url: p.image_url || ''
        }))
        setProducts(items)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load products for barcodes:', err)
        setLoading(false)
      })

    // Fetch categories
    api.get('/admin/config/categories')
      .then(res => setCategories(res.data.categories || []))
      .catch(err => console.error('Failed to load categories:', err))
  }, [])

  const filteredSuggestions = useMemo(() => {
    if (!search.trim()) return []
    return products.filter(p => {
      const matchText = p.name.toLowerCase().includes(search.toLowerCase()) ||
                        p.sku.toLowerCase().includes(search.toLowerCase()) ||
                        (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()))
      const matchCat = selectedCategory ? String(p.category_id) === selectedCategory : true
      return matchText && matchCat
    })
  }, [products, search, selectedCategory])

  const handleAddProduct = (product) => {
    setSelectedList(prev => {
      const exists = prev.find(p => p.id === product.id)
      if (exists) {
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p)
      }
      return [...prev, { ...product, quantity: 1 }]
    })
    setSearch('')
    setShowSuggestions(false)
  }

  const handleRemoveProduct = (id) => {
    setSelectedList(prev => prev.filter(p => p.id !== id))
  }

  const handleUpdateQty = (id, qty) => {
    setSelectedList(prev => prev.map(p => p.id === id ? { ...p, quantity: qty } : p))
  }

  const handleReset = () => {
    setSelectedList([])
    setSearch('')
    setSelectedCategory('')
    setSelectedBrand('')
    setBarcodeType('code128')
    setEncodeValue('sku')
    setLabelSize('80x50mm')
    setShowName(true)
    setShowPrice(true)
    setIncludeLogo(false)
  }

  const handlePrint = () => {
    setPrinting(true)
    setTimeout(() => {
      window.print()
      setPrinting(false)
    }, 500)
  }

  const B = 'var(--border)', S = '#6b7280'

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:300,fontFamily:'var(--body-font)',color:'var(--text-muted)' }}>
      <i className="ri-loader-4-line" style={{ fontSize:49,display:'block',marginBottom:8,textAlign:'center' }}/>
    </div>
  )

  return (
    <div style={{ fontFamily:'var(--body-font)' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--heading-font)',fontWeight:800,fontSize:20,color:'var(--text-primary)' }}>Barcode</div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-muted)' }}>
          <span style={{ cursor:'pointer' }} onClick={()=>navigate('/products')}>Products</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:19 }} />
          <span style={{ fontWeight:600,color:'var(--text-primary)' }}>Barcode</span>
        </div>
      </div>

      {/* Main card */}
      <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,padding:24,boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:24 }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontFamily:'var(--heading-font)',fontWeight:700,fontSize:16,color:'var(--text-primary)' }}>Print Barcodes</div>
          <div style={{ fontSize:12,color:S,marginTop:2 }}>Generate, customize and print product barcodes with advanced options</div>
        </div>

        <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 14px', borderRadius:10, marginBottom:20, background:'#fffbeb', border:'1px solid #fde68a', color:'#92400e', fontSize:12 }}>
          <i className="ri-alert-line" style={{ fontSize:22, flexShrink:0, marginTop:1 }} />
          <span>Printed labels show product name, SKU and price only — this page does not render a real scannable barcode/QR graphic. Use the product's existing barcode (set in Products) if you need a physical label a scanner can read.</span>
        </div>

        {/* Product Selection Area */}
        <div className="grid-sidebar-split" style={{ display:'grid',gridTemplateColumns:'1fr 280px',gap:24,marginBottom:24 }}>
          {/* Left Selection */}
          <div style={{ border:`1.5px solid ${B}`,borderRadius:12,padding:20,background:'var(--bg-card)' }}>
            <div style={{ fontFamily:'var(--heading-font)',fontWeight:700,fontSize:13,color:'var(--text-primary)',marginBottom:14 }}>Product Selection</div>
            
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
              <div>
                <label style={LBL}>Category</label>
                <select style={inp} value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}>
                  <option value="">— All Categories —</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ position:'relative' }}>
              <label style={LBL}>Product</label>
              <div style={{ position:'relative' }}>
                <i className="ri-search-line" style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:S,fontSize:20,pointerEvents:'none' }}/>
                <input
                  type="text"
                  placeholder="Product name, SKU or barcode"
                  value={search}
                  onChange={e=>setSearch(e.target.value)}
                  style={{ ...inp,paddingLeft:36 }}
                  onFocus={()=>setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && search.trim() && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--bg-card)',
                  border: `1px solid ${B}`,
                  borderRadius: 8,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  zIndex: 200,
                  maxHeight: 200,
                  overflowY: 'auto',
                  marginTop: 4
                }}>
                  {filteredSuggestions.length === 0 ? (
                    <div style={{ padding: '10px 14px', fontSize: 13, color: S }}>No products found</div>
                  ) : (
                    filteredSuggestions.map(p => (
                      <div
                        key={p.id}
                        onClick={() => handleAddProduct(p)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          borderBottom: `1px solid var(--border)`,
                          fontSize: 13,
                          transition: 'background 0.1s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: S }}>SKU: {p.sku} | Barcode: {p.barcode}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Import */}
          <div style={{ border:`1.5px dashed ${B}`,borderRadius:12,padding:20,background:'var(--bg-page)',textAlign:'center',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:8,cursor:'pointer' }}>
            <div style={{ fontFamily:'var(--heading-font)',fontWeight:700,fontSize:13,color:'var(--text-primary)',alignSelf:'flex-start',marginBottom:4 }}>Bulk Import</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
              <i className="ri-cloud-upload-line" style={{ fontSize:38,color:'var(--text-light)' }}/>
              <div style={{ fontSize:12,fontWeight:700,color:'var(--text-secondary)' }}>Upload CSV</div>
            </div>
          </div>
        </div>

        {/* Selected Products Table */}
        <div style={{ border:`1px solid ${B}`,borderRadius:12,overflow:'hidden',marginBottom:24 }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Product Name','SKU','Price','Quantity','Actions'].map(h=><th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {selectedList.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...TD,textAlign:'center',padding:'40px 0',color:S }}>
                    No products selected. Search and select products above to print barcodes.
                  </td>
                </tr>
              ) : (
                selectedList.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...TD,fontWeight:600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img
                          src={p.image_url || 'https://placehold.co/40x40?text=BF'}
                          alt={p.name}
                          style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', border: `1px solid ${B}` }}
                        />
                        <div>
                          <div>{p.name}</div>
                          <div style={{ fontSize: 11, color: S, fontWeight: 400 }}>{p.category || 'Product'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={TD}><code style={{ fontSize:11,background:'var(--bg-muted)',padding:'2px 6px',borderRadius:4,color:'var(--text-secondary)' }}>{p.sku}</code></td>
                    <td style={{ ...TD,fontWeight:600 }}>₦{p.price.toLocaleString()}</td>
                    <td style={TD}>
                      <TableStepper value={p.quantity} onChange={q => handleUpdateQty(p.id, q)} />
                    </td>
                    <td style={TD}>
                      <button
                        onClick={() => handleRemoveProduct(p.id)}
                        style={{
                          display:'flex',alignItems:'center',justifyContent:'center',
                          width:30,height:30,borderRadius:6,border:'none',
                          background:'#fee2e2',color:'#ef4444',cursor:'pointer'
                        }}
                      >
                        <i className="ri-delete-bin-line"/>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barcode Options */}
        <div style={{ borderTop:`1px solid ${B}`,paddingTop:20 }}>
          <div style={{ fontFamily:'var(--heading-font)',fontWeight:700,fontSize:14,color:'var(--text-primary)',marginBottom:16 }}>Barcode Options</div>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:20 }}>
            <div>
              <label style={LBL}>Barcode Type</label>
              <select style={inp} value={barcodeType} onChange={e=>setBarcodeType(e.target.value)}>
                <option value="code128">CODE128</option>
                <option value="code39">CODE39</option>
                <option value="qr">QR Code</option>
              </select>
            </div>
            <div>
              <label style={LBL}>Encode Value</label>
              <select style={inp} value={encodeValue} onChange={e=>setEncodeValue(e.target.value)}>
                <option value="sku">SKU</option>
                <option value="barcode">Barcode</option>
              </select>
            </div>
            <div>
              <label style={LBL}>Label Template</label>
              <select style={inp} value={labelSize} onChange={e=>setLabelSize(e.target.value)}>
                <option value="58x40mm">58x40mm</option>
                <option value="80x50mm">80x50mm</option>
                <option value="100x60mm">100x60mm</option>
              </select>
            </div>
          </div>

          <div style={{ display:'flex',gap:24,alignItems:'center',marginBottom:24 }}>
            <Checkbox checked={showName} onChange={()=>setShowName(!showName)} label="Show Product Name" />
            <Checkbox checked={showPrice} onChange={()=>setShowPrice(!showPrice)} label="Show Price" />
            <Checkbox checked={includeLogo} onChange={()=>setIncludeLogo(!includeLogo)} label="Include Store Logo" />
          </div>

          {/* Action buttons footer */}
          <div style={{ display:'flex',justifyContent:'flex-end',gap:12 }}>
            <button
              onClick={handleReset}
              style={{
                display:'inline-flex',alignItems:'center',gap:6,
                padding:'10px 20px',borderRadius:8,border:'none',
                background:'#0f172a',color:'#fff',cursor:'pointer',
                fontFamily:'var(--body-font)',fontWeight:700,fontSize:13
              }}
            >
              <i className="ri-refresh-line"/>
              Reset
            </button>
            <button
              onClick={handlePrint}
              disabled={selectedList.length === 0}
              style={{
                display:'inline-flex',alignItems:'center',gap:6,
                padding:'10px 20px',borderRadius:8,border:'none',
                background:'#2563eb',color:'#fff',cursor:'pointer',
                fontFamily:'var(--body-font)',fontWeight:700,fontSize:13,
                opacity: selectedList.length === 0 ? 0.5 : 1
              }}
            >
              <i className="ri-printer-line"/>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
