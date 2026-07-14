import { useState, useEffect, useCallback } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const NAV = [
  { label:'General',      to:'/settings/general'        },
  { label:'Tax',          to:'/settings/tax'            },
  { label:'Coupons',      to:'/settings/coupons'        },
  { label:'POS',          to:'/settings/pos'            },
  { label:'Payment',      to:'/settings/payment'        },
  { label:'Currencies',   to:'/settings/currencies'     },
  { label:'Invoices',     to:'/settings/invoices'       },
  { label:'Manager',      to:'/settings/manager'        },
  { label:'Notifications',to:'/settings/notifications'  },
]

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const B = '#e5e7eb', S = '#6b7280'

function SettingsNav() {
  const { pathname } = useLocation()
  return (
    <div style={{ display:'flex',gap:0,borderBottom:`2px solid ${B}`,marginBottom:24,overflowX:'auto' }}>
      {NAV.map(n=>(
        <Link key={n.to} to={n.to} style={{ padding:'10px 16px',border:'none',borderBottom:pathname===n.to?'2px solid #1B4332':'2px solid transparent',background:'transparent',fontFamily:'Nunito,sans-serif',fontWeight:pathname===n.to?700:500,fontSize:13,color:pathname===n.to?'#1B4332':S,cursor:'pointer',textDecoration:'none',whiteSpace:'nowrap',marginBottom:-2 }}>
          {n.label}
        </Link>
      ))}
    </div>
  )
}

const BLANK_FORM = { code:'', name:'', symbol:'', rate:0, is_default:false, is_active:true }

export default function CurrencySettings() {
  const [currencies, setCurrencies] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [modal, setModal]           = useState(null)   // null | 'add' | currency object
  const [form, setForm]             = useState(BLANK_FORM)
  const [saving, setSaving]         = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/settings/currencies')
      .then(r => setCurrencies(r.data.currencies || []))
      .catch(() => toast.error('Failed to load currencies'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = currencies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setForm({ ...BLANK_FORM }); setModal('add') }
  function openEdit(c) { setForm({ code:c.code,name:c.name,symbol:c.symbol,rate:c.rate,is_default:c.is_default,is_active:c.is_active }); setModal(c) }
  function closeModal() { setModal(null); setForm(BLANK_FORM) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/admin/settings/currencies', form)
      toast.success(modal === 'add' ? 'Currency added' : 'Currency updated')
      closeModal()
      load()
    } catch {
      toast.error('Failed to save currency')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Settings</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Manage store preferences and system configurations.</div>
      </div>
      <SettingsNav/>

      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'16px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Currencies</span>
          <div style={{ display:'flex',gap:10,alignItems:'center' }}>
            <div style={{ position:'relative' }}>
              <i className="ri-search-line" style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:S,fontSize:15,pointerEvents:'none' }}/>
              <input type="text" placeholder="Search currency…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp,paddingLeft:34,width:200 }}/>
            </div>
            <button style={btnP} onClick={openAdd}><i className="ri-add-line"/>Add Currency</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign:'center',padding:60,color:S }}><i className="ri-loader-4-line" style={{ fontSize:28 }}/><div style={{ marginTop:8 }}>Loading…</div></div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse' }}>
              <thead>
                <tr>{['Currency','Code','Symbol','Rate (to NGN)','Default','Active','Action'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ ...TD,textAlign:'center',padding:'60px 0' }}>No currencies found</td></tr>
                )}
                {filtered.map(c=>(
                  <tr key={c.code}>
                    <td style={{ ...TD,fontWeight:600 }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:32,height:32,borderRadius:8,background:'#f0fdf4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0 }}>{c.symbol}</div>
                        {c.name}
                      </div>
                    </td>
                    <td style={TD}><code style={{ background:'#f3f4f6',padding:'2px 8px',borderRadius:4,fontSize:12,fontWeight:700 }}>{c.code}</code></td>
                    <td style={{ ...TD,fontWeight:700,fontSize:16 }}>{c.symbol}</td>
                    <td style={TD}>
                      {c.is_default
                        ? <span style={{ background:'#dcfce7',color:'#166534',borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600 }}>Base</span>
                        : <span style={{ fontWeight:600 }}>₦{Number(c.rate).toLocaleString()} <span style={{ fontSize:11,color:S,fontWeight:400 }}>per 1 {c.code}</span></span>
                      }
                    </td>
                    <td style={TD}>
                      {c.is_default && <span style={{ background:'#dcfce7',color:'#166534',borderRadius:50,padding:'3px 8px',fontSize:10,fontWeight:700 }}>DEFAULT</span>}
                    </td>
                    <td style={TD}>
                      <span style={{ background:c.is_active?'#dcfce7':'#f3f4f6',color:c.is_active?'#166534':S,borderRadius:50,padding:'3px 8px',fontSize:11,fontWeight:600 }}>
                        {c.is_active?'Active':'Inactive'}
                      </span>
                    </td>
                    <td style={TD}>
                      <button onClick={()=>openEdit(c)} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}>
                        <i className="ri-pencil-line"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ padding:'10px 20px',borderTop:`1px solid ${B}`,fontSize:12,color:S }}>
          {currencies.length} currencies
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {modal !== null && (
        <>
          <div onClick={closeModal} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:800 }}/>
          <div style={{ position:'fixed',inset:0,zIndex:810,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
            <div style={{ background:'#fff',borderRadius:14,width:'100%',maxWidth:460,boxShadow:'0 24px 48px rgba(0,0,0,.3)',overflow:'hidden' }}>
              <div style={{ background:'#1B4332',color:'#fff',padding:'14px 20px',display:'flex',alignItems:'center',gap:10 }}>
                <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <i className="ri-money-dollar-circle-line" style={{ fontSize:18 }}/>
                </div>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14,flex:1 }}>{modal==='add'?'Add Currency':'Edit Currency'}</span>
                <button onClick={closeModal} style={{ background:'none',border:'none',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:20 }}><i className="ri-close-line"/></button>
              </div>
              <form onSubmit={handleSave} style={{ padding:24 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Currency Name <span style={{ color:'#f06548' }}>*</span></label>
                  <input style={inp} required value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. US Dollar"/>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14 }}>
                  <div>
                    <label style={LBL}>Code <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} placeholder="USD" maxLength={5}/>
                  </div>
                  <div>
                    <label style={LBL}>Symbol <span style={{ color:'#f06548' }}>*</span></label>
                    <input style={inp} required value={form.symbol} onChange={e=>setForm(f=>({...f,symbol:e.target.value}))} placeholder="$"/>
                  </div>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={LBL}>Exchange Rate <span style={{ fontSize:11,fontWeight:400,color:S }}>(₦ per 1 unit)</span></label>
                  <input type="number" style={inp} min={0} step={0.01} value={form.rate} onChange={e=>setForm(f=>({...f,rate:parseFloat(e.target.value)||0}))} placeholder="e.g. 1650"/>
                </div>
                <div style={{ display:'flex',gap:20,marginBottom:24 }}>
                  <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={()=>setForm(f=>({...f,is_active:!f.is_active}))} style={{ accentColor:'#1B4332',width:16,height:16 }}/>
                    Active
                  </label>
                  <label style={{ display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer' }}>
                    <input type="checkbox" checked={form.is_default} onChange={()=>setForm(f=>({...f,is_default:!f.is_default}))} style={{ accentColor:'#1B4332',width:16,height:16 }}/>
                    Set as Default
                  </label>
                </div>
                <div style={{ display:'flex',gap:10 }}>
                  <button type="button" style={{ ...btnL,flex:1,justifyContent:'center' }} onClick={closeModal}>Cancel</button>
                  <button type="submit" style={{ ...btnP,flex:1,justifyContent:'center' }} disabled={saving}>{saving?'Saving…':modal==='add'?'Add Currency':'Save Changes'}</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
