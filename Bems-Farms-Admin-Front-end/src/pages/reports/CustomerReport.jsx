import { useState, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const S = '#6b7280', B = '#e5e7eb'
const TH = { padding:'10px 16px',fontSize:11,fontWeight:700,color:S,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',background:'#f9fafb',whiteSpace:'nowrap' }
const TD = { padding:'11px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const inp = { padding:'8px 12px',border:`1.5px solid ${B}`,borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',color:'#111827' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

function ngn(v) { return `₦${Number(v||0).toLocaleString()}` }

const today = new Date().toISOString().slice(0,10)
const monthStart = today.slice(0,7)+'-01'

export default function CustomerReport() {
  const [filters, setFilters] = useState({ from:monthStart, to:today })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/reports/customers', { params: filters })
      setData(r.data)
    } catch {
      toast.error('Failed to generate customer report')
    } finally {
      setLoading(false)
    }
  }, [filters])

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Customer Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>New vs returning customers, top spenders, and growth trends.</div>
      </div>

      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:'16px 20px',marginBottom:20,display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>FROM DATE</div>
          <input type="date" style={inp} value={filters.from} onChange={e=>setFilters(f=>({...f,from:e.target.value}))}/>
        </div>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>TO DATE</div>
          <input type="date" style={inp} value={filters.to} onChange={e=>setFilters(f=>({...f,to:e.target.value}))}/>
        </div>
        <button style={btnP} onClick={generate} disabled={loading}>
          <i className="ri-user-3-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-user-3-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
          <div style={{ fontSize:14,fontWeight:600 }}>Select date range and click Generate Report</div>
        </div>
      )}

      {loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-loader-4-line" style={{ fontSize:32,display:'block',marginBottom:8 }}/>Loading…
        </div>
      )}

      {data && !loading && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:20 }}>
            {[
              { label:'Total Customers',    value:Number(data.summary?.total||0).toLocaleString(),          color:'#1B4332', bg:'#dcfce7', icon:'ri-group-line' },
              { label:'New Customers',      value:Number(data.summary?.new_customers||0).toLocaleString(),  color:'#0369a1', bg:'#e0f2fe', icon:'ri-user-add-line' },
              { label:'Returning',          value:Number(data.summary?.returning||0).toLocaleString(),      color:'#b45309', bg:'#fef3c7', icon:'ri-user-follow-line' },
              { label:'Top Spender',        value:data.summary?.top_spender||'—',                           color:'#7c3aed', bg:'#ede9fe', icon:'ri-vip-crown-line' },
            ].map(k=>(
              <div key={k.label} style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:18,display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <i className={k.icon} style={{ fontSize:20,color:k.color }}/>
                </div>
                <div>
                  <div style={{ fontSize:11,color:S,fontWeight:600,marginBottom:2 }}>{k.label}</div>
                  <div style={{ fontSize:16,fontWeight:800,color:'#111827',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:120 }}>{k.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            {/* Top Customers */}
            {data.top_customers?.length > 0 && (
              <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Top Customers</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Customer','Orders','Total Spent'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.top_customers.map((c,i)=>(
                      <tr key={i}>
                        <td style={TD}>
                          <div style={{ fontWeight:600 }}>{c.name}</div>
                          <div style={{ fontSize:11,color:S }}>{c.email}</div>
                        </td>
                        <td style={TD}>{Number(c.orders||0).toLocaleString()}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{ngn(c.total_spent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* By Month */}
            {data.by_month?.length > 0 && (
              <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>New Customers by Month</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Month','New Customers'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.by_month.map((r,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,fontWeight:600 }}>{r.month}</td>
                        <td style={TD}>{Number(r.new_customers||0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
