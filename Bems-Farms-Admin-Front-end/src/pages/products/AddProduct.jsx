import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'var(--body-font)',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box',color:'var(--text-primary)' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:9,border:'none',background:'var(--orange-accent)',color:'#fff',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'10px 20px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'var(--body-font)',fontWeight:600,fontSize:13 }

function NumericStepper({ value, onChange, min=0 }) {
  const handleMinus = () => {
    const val = parseInt(value) || 0
    if (val > min) onChange(val - 1)
  }
  const handlePlus = () => {
    const val = parseInt(value) || 0
    onChange(val + 1)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={handleMinus}
        style={{
          width: 32,
          height: 32,
          border: '1.5px solid var(--border)',
          borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          fontSize: 16,
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
        min={min}
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{
          width: 48,
          height: 32,
          border: '1.5px solid var(--border)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          textAlign: 'center',
          fontFamily: 'var(--body-font)',
          fontSize: 13,
          fontWeight: 600,
          outline: 'none',
          margin: 0,
        }}
      />
      <button
        type="button"
        onClick={handlePlus}
        style={{
          width: 32,
          height: 32,
          border: '1.5px solid var(--border)',
          borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          background: 'var(--bg-card)',
          color: 'var(--text-secondary)',
          fontSize: 16,
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

function Card({ title, children, style={} }) {
  return (
    <div style={{ background:'var(--bg-card)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20,...style }}>
      <div style={{ padding:'14px 20px',borderBottom:'1px solid var(--border)',fontFamily:'var(--heading-font)',fontWeight:700,fontSize:13,color:'var(--text-primary)' }}>{title}</div>
      <div style={{ padding:20 }}>{children}</div>
    </div>
  )
}

export default function AddProduct() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name:'', description:'', category_id:'', sub_category_id:'',
    unit_of_measure_id:'', unit:'', model_variant:'', sku:'', tags:'',
    unit_price:'', cost_price:'', tax_rate:'7.5', available_for_sale:true,
    stock_quantity:0, low_stock_threshold:10, track_inventory:true,
    expiry_date:'', return_policy:'no_return', status:'active',
    image_url:'', video_url:'', image_2_url:'', image_3_url:'', image_4_url:'',
    image_title:'', image_tags:'', barcode:'', hsn_code:'',
  })
  const [categories, setCategories] = useState([])
  const [subCategories, setSubCategories] = useState([])
  const [units, setUnits] = useState([])
  const [loadingRefs, setLoadingRefs] = useState(true)

  const margin = formData.unit_price && formData.cost_price
    ? (((parseFloat(formData.unit_price)-parseFloat(formData.cost_price))/parseFloat(formData.unit_price))*100).toFixed(1)
    : ''

  useEffect(() => {
    api.get('/admin/products/form-data')
      .then(r => {
        setCategories(r.data.categories||[])
        setSubCategories(r.data.sub_categories||[])
        setUnits(r.data.units||[])

        if (isEdit) {
          api.get(`/admin/products/${id}`)
            .then(res => {
              const p = res.data
              setFormData({
                name: p.name || '',
                description: p.description || '',
                category_id: p.category_id || '',
                sub_category_id: p.sub_category_id || '',
                unit_of_measure_id: p.unit_of_measure_id || '',
                unit: p.unit || '',
                model_variant: p.model_variant || '',
                sku: p.sku || '',
                tags: p.tags ? (typeof p.tags === 'string' ? p.tags : JSON.stringify(p.tags)) : '',
                unit_price: p.unit_price || p.price || '',
                cost_price: p.cost_price || '',
                tax_rate: p.tax_rate || '7.5',
                available_for_sale: p.available_for_sale !== undefined ? p.available_for_sale : true,
                stock_quantity: p.stock !== undefined ? p.stock : (p.stock_quantity || 0),
                low_stock_threshold: p.low_stock_threshold || 10,
                track_inventory: p.track_inventory !== undefined ? p.track_inventory : true,
                expiry_date: p.expiry_date ? p.expiry_date.slice(0, 10) : '',
                return_policy: p.return_policy || 'no_return',
                status: p.status || 'active',
                image_url: p.image_url || '',
                video_url: p.video_url || '',
                image_2_url: p.images?.[1]?.image_url || '',
                image_3_url: p.images?.[2]?.image_url || '',
                image_4_url: p.images?.[3]?.image_url || '',
                image_title: p.images?.[0]?.image_title || '',
                image_tags: p.images?.[0]?.image_tags || '',
                barcode: p.barcode || '',
                hsn_code: p.hsn_code || '',
              })
            })
            .catch(() => toast.error('Failed to load product details'))
        }
      })
      .catch(() => toast.error('Failed to load form data'))
      .finally(() => setLoadingRefs(false))
  }, [id, isEdit])

  const filteredSubs = formData.category_id ? subCategories.filter(s=>String(s.category_id)===String(formData.category_id)) : []
  const set = (key, value) => setFormData(p=>({...p,[key]:value}))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!formData.name.trim()) return toast.error('Product name is required')
    if (!formData.unit_price) return toast.error('Unit price is required')
    if (!formData.category_id) return toast.error('Category is required')
    if (!formData.image_url?.trim()) return toast.error('Main Product Image URL is required')
    setSaving(true)
    try {
      if (isEdit) {
        await api.patch(`/admin/products/${id}`, formData)
        toast.success('Product updated successfully!')
      } else {
        await api.post('/admin/products', formData)
        toast.success('Product created successfully!')
      }
      navigate('/products')
    } catch (err) { toast.error(err.response?.data?.message||'Failed to save product') }
    finally { setSaving(false) }
  }

  if (loadingRefs) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',minHeight:300,fontFamily:'var(--body-font)',color:'var(--text-muted)' }}>
      <i className="ri-loader-4-line" style={{ fontSize:49,display:'block',marginBottom:8,textAlign:'center' }}/>
    </div>
  )

  const S = '#6b7280', B = 'var(--border)'

  const location = useLocation()
  const currentTab = location.pathname.includes('/import') ? 'import' : 'single'

  return (
    <div style={{ fontFamily:'var(--body-font)' }}>
      {/* Header & Breadcrumbs */}
      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:12 }}>
        <div>
          <div style={{ fontFamily:'var(--heading-font)',fontWeight:800,fontSize:20,color:'var(--text-primary)' }}>{isEdit ? 'Edit Product' : 'Add Products'}</div>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text-muted)' }}>
          <span style={{ cursor:'pointer' }} onClick={()=>navigate('/products')}>Products</span>
          <i className="ri-arrow-right-s-line" style={{ fontSize:19 }} />
          <span style={{ fontWeight:600,color:'var(--text-primary)' }}>{isEdit ? 'Edit Product' : 'Add Products'}</span>
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display:'flex',gap:12,marginBottom:24,borderBottom:'1px solid var(--border)',paddingBottom:12 }}>
        <Link
          to="/products/add"
          style={{
            display:'inline-flex',
            alignItems:'center',
            gap:6,
            padding:'9px 16px',
            borderRadius:8,
            border:'none',
            background: currentTab === 'single' ? 'var(--orange-accent)' : 'var(--bg-card)',
            color: currentTab === 'single' ? '#fff' : 'var(--text-secondary)',
            cursor:'pointer',
            fontFamily:'var(--body-font)',
            fontWeight:700,
            fontSize:13,
            textDecoration:'none',
            border: currentTab === 'single' ? 'none' : '1px solid var(--border)',
            boxShadow: currentTab === 'single' ? '0 4px 12px rgba(245,124,0,0.15)' : 'none',
            transition:'all 0.15s'
          }}
        >
          <i className="ri-file-text-line" style={{ fontSize:20 }}/>
          Add Single Product
        </Link>
        <Link
          to="/products/import"
          style={{
            display:'inline-flex',
            alignItems:'center',
            gap:6,
            padding:'9px 16px',
            borderRadius:8,
            border:'none',
            background: currentTab === 'import' ? 'var(--orange-accent)' : 'var(--bg-card)',
            color: currentTab === 'import' ? '#fff' : 'var(--text-secondary)',
            cursor:'pointer',
            fontFamily:'var(--body-font)',
            fontWeight:700,
            fontSize:13,
            textDecoration:'none',
            border: currentTab === 'import' ? 'none' : '1px solid var(--border)',
            boxShadow: currentTab === 'import' ? '0 4px 12px rgba(245,124,0,0.15)' : 'none',
            transition:'all 0.15s'
          }}
        >
          <i className="ri-cloud-upload-line" style={{ fontSize:20 }}/>
          Bulk Import
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-sidebar-split" style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:24,alignItems:'start' }}>

          {/* LEFT */}
          <div>
            <Card title="Product Information">
              <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
                <div>
                  <label style={LBL}>Product Name <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} type="text" placeholder="e.g. Ofada Rice (1kg)" value={formData.name} onChange={e=>set('name',e.target.value)} required/>
                </div>
                <div>
                  <label style={LBL}>Description</label>
                  <textarea style={{ ...inp,resize:'vertical' }} rows={3} placeholder="Describe this product…" value={formData.description} onChange={e=>set('description',e.target.value)}/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
                  <div>
                    <label style={LBL}>Category <span style={{ color:'#f06548' }}>*</span></label>
                    <select style={inp} value={formData.category_id} onChange={e=>{ set('category_id',e.target.value); set('sub_category_id','') }} required>
                      <option value="">— Select category —</option>
                      {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Sub-Category</label>
                    <select style={{ ...inp,opacity:(!formData.category_id||filteredSubs.length===0) ? 0.5 : 1 }}
                      value={formData.sub_category_id} onChange={e=>set('sub_category_id',e.target.value)}
                      disabled={!formData.category_id||filteredSubs.length===0}>
                      <option value="">{formData.category_id?'— Pick a category —':'— Pick category first —'}</option>
                      {filteredSubs.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Brand</label>
                    <select style={inp} defaultValue="">
                      <option value="">— Select brand —</option>
                      <option value="bems_farms">Bems Farms</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12 }}>
                  <div>
                    <label style={LBL}>Unit of Measure <span style={{ color:'#f06548' }}>*</span></label>
                    <select style={inp} value={formData.unit_of_measure_id} onChange={e=>{ set('unit_of_measure_id',e.target.value); const u=units.find(u=>String(u.id)===e.target.value); if(u) set('unit',u.abbreviation) }} required>
                      <option value="">— Select unit —</option>
                      {units.map(u=><option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={LBL}>Model / Variant</label>
                    <input style={inp} type="text" placeholder="e.g. 1kg, 500ml" value={formData.model_variant} onChange={e=>set('model_variant',e.target.value)}/>
                  </div>
                  <div>
                    <label style={LBL}>Tags</label>
                    <input style={inp} type="text" placeholder="e.g. Organic, Best Seller" value={formData.tags} onChange={e=>set('tags',e.target.value)}/>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Pricing & Stock">
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16 }}>
                <div>
                  <label style={LBL}>Unit Price (₦) <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={formData.unit_price} onChange={e=>set('unit_price',e.target.value)} required/>
                </div>
                <div>
                  <label style={LBL}>Cost Price (₦)</label>
                  <input style={inp} type="number" min="0" step="0.01" placeholder="0.00" value={formData.cost_price} onChange={e=>set('cost_price',e.target.value)}/>
                </div>
                <div>
                  <label style={LBL}>Margin (%) — Auto</label>
                  <input style={{ ...inp,background:'var(--bg-subtle)',color:margin?'#16a34a':'#6b7280',fontWeight:700 }} readOnly value={margin?`${margin}%`:'—'}/>
                </div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1.2fr 1.2fr 1fr',gap:16,alignItems:'center' }}>
                <div>
                  <label style={LBL}>Stock Quantity</label>
                  <NumericStepper value={formData.stock_quantity} onChange={v => set('stock_quantity', v)} />
                </div>
                <div>
                  <label style={LBL}>Low Stock Alert</label>
                  <NumericStepper value={formData.low_stock_threshold} onChange={v => set('low_stock_threshold', v)} />
                </div>
                <div style={{ display:'flex',flexDirection:'column',justifyContent:'center',height:'100%',paddingTop:18 }}>
                  <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--text-secondary)' }}>
                    <div onClick={()=>set('available_for_sale',!formData.available_for_sale)}
                      style={{ width:40,height:22,borderRadius:20,background:formData.available_for_sale?'var(--orange-accent)':'var(--border-strong)',position:'relative',transition:'background .2s',cursor:'pointer',flexShrink:0 }}>
                      <div style={{ position:'absolute',top:2,left:formData.available_for_sale?20:2,width:18,height:18,borderRadius:'50%',background:'var(--bg-card)',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
                    </div>
                    Available for Sale
                  </label>
                </div>
              </div>
            </Card>

            <Card title="Advanced Settings">
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16 }}>
                <div>
                  <label style={LBL}>SKU</label>
                  <input style={inp} type="text" placeholder="Auto-generated if empty" value={formData.sku} onChange={e=>set('sku',e.target.value)}/>
                </div>
                <div>
                  <label style={LBL}>Barcode</label>
                  <input style={inp} type="text" placeholder="e.g. 5901234123457" value={formData.barcode} onChange={e=>set('barcode',e.target.value)}/>
                </div>
                <div>
                  <label style={LBL}>HSN Code</label>
                  <input style={inp} type="text" placeholder="e.g. 1006.30" value={formData.hsn_code} onChange={e=>set('hsn_code',e.target.value)}/>
                </div>
                <div>
                  <label style={LBL}>Tax Rate (%)</label>
                  <input style={inp} type="number" min="0" step="0.5" value={formData.tax_rate} onChange={e=>set('tax_rate',e.target.value)}/>
                </div>
                <div>
                  <label style={LBL}>Product Status</label>
                  <select style={inp} value={formData.status} onChange={e=>set('status',e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
                <div>
                  <label style={LBL}>Expiry Date</label>
                  <input style={inp} type="date" value={formData.expiry_date} onChange={e=>set('expiry_date',e.target.value)}/>
                </div>
                <div>
                  <label style={LBL}>Return Policy</label>
                  <select style={inp} value={formData.return_policy} onChange={e=>set('return_policy',e.target.value)}>
                    <option value="no_return">No Returns</option>
                    <option value="7days">7-Day Return</option>
                    <option value="14days">14-Day Return</option>
                    <option value="30days">30-Day Return</option>
                  </select>
                </div>
                <div style={{ display:'flex',alignItems:'flex-end',paddingBottom:2 }}>
                  <label style={{ display:'flex',alignItems:'center',gap:8,cursor:'pointer',fontSize:13,fontWeight:600,color:'var(--text-secondary)' }}>
                    <div onClick={()=>set('track_inventory',!formData.track_inventory)}
                      style={{ width:40,height:22,borderRadius:20,background:formData.track_inventory?'var(--orange-accent)':'var(--border-strong)',position:'relative',transition:'background .2s',cursor:'pointer',flexShrink:0 }}>
                      <div style={{ position:'absolute',top:2,left:formData.track_inventory?20:2,width:18,height:18,borderRadius:'50%',background:'var(--bg-card)',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,.3)' }}/>
                    </div>
                    Track Inventory
                  </label>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT */}
          <div style={{ position:'sticky',top:80 }}>
            <Card title="Product Images & Media">
              <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
                {/* Main image — set by URL; there's no file-upload backend
                    in this app, so this stays an honest URL field rather
                    than a drag-and-drop zone that doesn't actually work. */}
                <div style={{
                  border: '1.5px solid var(--border)',
                  borderRadius: 12,
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--bg-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <i className="ri-image-line" style={{ fontSize: 43, color: 'var(--text-light)' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Main Product Image</div>
                  <input
                    type="url"
                    placeholder="Paste image URL here..."
                    value={formData.image_url}
                    onChange={e => set('image_url', e.target.value)}
                    required
                    style={{
                      ...inp,
                      marginTop: 8,
                      textAlign: 'center',
                      borderStyle: 'solid',
                      fontSize: 12,
                    }}
                  />
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      style={{ marginTop: 8, width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, border: `1px solid var(--border)` }}
                    />
                  )}
                </div>

                {/* Smaller Thumbnail Upload slots */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {/* Image 2 */}
                  <div style={{
                    border: '1.5px dashed var(--border)',
                    borderRadius: 8,
                    padding: '10px 8px',
                    textAlign: 'center',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <i className="ri-image-add-line" style={{ fontSize: 24, color: 'var(--text-light)' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Image 2</div>
                    <input
                      type="url"
                      placeholder="Paste URL..."
                      value={formData.image_2_url}
                      onChange={e => set('image_2_url', e.target.value)}
                      style={{ ...inp, padding: '4px 6px', fontSize: 10, textAlign: 'center', marginTop: 4 }}
                    />
                  </div>

                  {/* Image 3 */}
                  <div style={{
                    border: '1.5px dashed var(--border)',
                    borderRadius: 8,
                    padding: '10px 8px',
                    textAlign: 'center',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <i className="ri-image-add-line" style={{ fontSize: 24, color: 'var(--text-light)' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Image 3</div>
                    <input
                      type="url"
                      placeholder="Paste URL..."
                      value={formData.image_3_url}
                      onChange={e => set('image_3_url', e.target.value)}
                      style={{ ...inp, padding: '4px 6px', fontSize: 10, textAlign: 'center', marginTop: 4 }}
                    />
                  </div>

                  {/* Image 4 */}
                  <div style={{
                    border: '1.5px dashed var(--border)',
                    borderRadius: 8,
                    padding: '10px 8px',
                    textAlign: 'center',
                    background: 'var(--bg-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <i className="ri-image-add-line" style={{ fontSize: 24, color: 'var(--text-light)' }} />
                    <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Image 4</div>
                    <input
                      type="url"
                      placeholder="Paste URL..."
                      value={formData.image_4_url}
                      onChange={e => set('image_4_url', e.target.value)}
                      style={{ ...inp, padding: '4px 6px', fontSize: 10, textAlign: 'center', marginTop: 4 }}
                    />
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={LBL}>Image Title</label>
                    <input style={inp} type="text" placeholder="Alt text" value={formData.image_title} onChange={e=>set('image_title',e.target.value)}/>
                  </div>
                  <div>
                    <label style={LBL}>Image Tags</label>
                    <input style={inp} type="text" placeholder="e.g. front-view" value={formData.image_tags} onChange={e=>set('image_tags',e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label style={LBL}>Product Video URL</label>
                  <input style={inp} type="url" placeholder="YouTube / Vimeo" value={formData.video_url} onChange={e=>set('video_url',e.target.value)}/>
                </div>
              </div>
            </Card>

            <div style={{ display:'flex',gap:10 }}>
              <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={()=>navigate('/products')}>Cancel</button>
              <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>
                {saving?<><i className="ri-loader-4-line"/>Saving…</>:<><i className="ri-save-line"/>Save Product</>}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
