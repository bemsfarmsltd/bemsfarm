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

export default function FinanceReport() {
  const [filters, setFilters] = useState({ from:monthStart, to:today })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/reports/finance', { params: filters })
      setData(r.data)
    } catch {
      toast.error('Failed to generate finance report')
    } finally {
      setLoading(false)
    }
  }, [filters])

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Finance Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Income vs expenses, net profit, and bank balances.</div>
      </div>

      {/* Filters */}
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
          <i className="ri-funds-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-funds-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
          <div style={{ fontSize:14,fontWeight:600 }}>Select a date range and click Generate Report</div>
        </div>
      )}

      {loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-loader-4-line" style={{ fontSize:32,display:'block',marginBottom:8 }}/>Loading…
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:20 }}>
            {[
              { label:'Total Income',  value:ngn(data.income?.total),   color:'#166534', bg:'#dcfce7', icon:'ri-arrow-up-circle-line' },
              { label:'Total Expenses',value:ngn(data.expenses?.total), color:'#991b1b', bg:'#fee2e2', icon:'ri-arrow-down-circle-line' },
              { label:'Net Profit',    value:ngn(data.net_profit),       color:data.net_profit>=0?'#166534':'#991b1b', bg:data.net_profit>=0?'#dcfce7':'#fee2e2', icon:'ri-line-chart-line' },
            ].map(k=>(
              <div key={k.label} style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:20,display:'flex',alignItems:'center',gap:14 }}>
                <div style={{ width:44,height:44,borderRadius:12,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <i className={k.icon} style={{ fontSize:22,color:k.color }}/>
                </div>
                <div>
                  <div style={{ fontSize:11,color:S,fontWeight:600,marginBottom:2 }}>{k.label}</div>
                  <div style={{ fontSize:18,fontWeight:800,color:k.color }}>{k.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
            {/* Income by category */}
            {data.income?.by_category?.length > 0 && (
              <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,color:'#166534' }}>Income by Category</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Category','Amount'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.income.by_category.map((r,i)=>(
                      <tr key={i}>
                        <td style={TD}>{r.category}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#166534' }}>{ngn(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Expenses by category */}
            {data.expenses?.by_category?.length > 0 && (
              <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,color:'#991b1b' }}>Expenses by Category</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Category','Amount'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.expenses.by_category.map((r,i)=>(
                      <tr key={i}>
                        <td style={TD}>{r.category}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#991b1b' }}>{ngn(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bank Balances */}
          {data.bank_balances?.length > 0 && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Bank Balances</div>
              <table style={{ width:'100%',borderCollapse:'collapse' }}>
                <thead><tr>{['Bank','Balance'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {data.bank_balances.map((b,i)=>(
                    <tr key={i}>
                      <td style={{ ...TD,fontWeight:600 }}>{b.bank_name}</td>
                      <td style={{ ...TD,fontWeight:700,color:'#1B4332' }}>{ngn(b.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
