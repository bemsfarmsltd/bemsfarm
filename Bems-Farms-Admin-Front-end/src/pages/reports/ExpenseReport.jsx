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

export default function ExpenseReport() {
  const [filters, setFilters] = useState({ from:monthStart, to:today, category:'' })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const params = { from:filters.from, to:filters.to }
      if (filters.category) params.category = filters.category
      const r = await api.get('/admin/reports/expenses', { params })
      setData(r.data)
    } catch {
      toast.error('Failed to generate expense report')
    } finally {
      setLoading(false)
    }
  }, [filters])

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Expense Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Track business expenses by category and date range.</div>
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
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>CATEGORY <span style={{ fontWeight:400 }}>(optional)</span></div>
          <input style={inp} value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))} placeholder="e.g. Logistics"/>
        </div>
        <button style={btnP} onClick={generate} disabled={loading}>
          <i className="ri-bill-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-bill-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
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
          {/* Summary */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:20 }}>
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:20,display:'flex',alignItems:'center',gap:14 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:'#fee2e2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                <i className="ri-money-dollar-circle-line" style={{ fontSize:22,color:'#991b1b' }}/>
              </div>
              <div>
                <div style={{ fontSize:11,color:S,fontWeight:600,marginBottom:2 }}>Total Expenses</div>
                <div style={{ fontSize:22,fontWeight:800,color:'#991b1b' }}>{ngn(data.summary?.total)}</div>
              </div>
            </div>
          </div>

          {/* By Category */}
          {data.summary?.by_category?.length > 0 && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',marginBottom:20 }}>
              <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Expenses by Category</div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr>{['Category','Amount','% of Total'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.summary.by_category.map((r,i)=>{
                    const pct = data.summary.total > 0 ? ((r.amount/data.summary.total)*100).toFixed(1) : 0
                    return (
                      <tr key={i}>
                        <td style={{ ...TD,fontWeight:600 }}>{r.category}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#991b1b' }}>{ngn(r.amount)}</td>
                        <td style={TD}>
                          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                            <div style={{ flex:1,height:6,borderRadius:3,background:'#f3f4f6',overflow:'hidden' }}>
                              <div style={{ height:'100%',width:`${pct}%`,background:'#f06548',borderRadius:3 }}/>
                            </div>
                            <span style={{ fontSize:12,color:S,minWidth:36 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Expense list */}
          {data.expenses?.length > 0 && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Expense Entries</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(data.expenses[0]||{}).map(k=><th key={k} style={TH}>{k.replace(/_/g,' ')}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {data.expenses.map((e,i)=>(
                      <tr key={i}>
                        {Object.values(e).map((v,j)=>(
                          <td key={j} style={TD}>{typeof v === 'number' && j > 0 ? ngn(v) : String(v||'—')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
