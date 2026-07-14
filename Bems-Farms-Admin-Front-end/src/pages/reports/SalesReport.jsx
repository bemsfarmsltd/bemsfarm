import { useState, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const S = '#6b7280', B = '#e5e7eb'
const TH = { padding:'10px 16px',fontSize:11,fontWeight:700,color:S,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',background:'#f9fafb',whiteSpace:'nowrap' }
const TD = { padding:'11px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const inp = { padding:'8px 12px',border:`1.5px solid ${B}`,borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',color:'#111827' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

function ngn(v) { return `₦${Number(v||0).toLocaleString()}` }

function KpiCard({ label, value, icon, color, bg }) {
  return (
    <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:20,display:'flex',alignItems:'center',gap:14 }}>
      <div style={{ width:44,height:44,borderRadius:12,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <i className={icon} style={{ fontSize:22,color }}/>
      </div>
      <div>
        <div style={{ fontSize:11,color:S,fontWeight:600,marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:20,fontWeight:800,color:'#111827' }}>{value}</div>
      </div>
    </div>
  )
}

const today = new Date().toISOString().slice(0,10)
const monthStart = today.slice(0,7)+'-01'

export default function SalesReport() {
  const [filters, setFilters] = useState({ from:monthStart, to:today, group_by:'day', source:'' })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/reports/sales', { params: filters })
      setData(r.data)
    } catch {
      toast.error('Failed to generate sales report')
    } finally {
      setLoading(false)
    }
  }, [filters])

  function set(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Sales Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Analyse orders, revenue, and top-selling products.</div>
      </div>

      {/* Filters */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:'16px 20px',marginBottom:20,display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>FROM DATE</div>
          <input type="date" style={inp} value={filters.from} onChange={e=>set('from',e.target.value)}/>
        </div>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>TO DATE</div>
          <input type="date" style={inp} value={filters.to} onChange={e=>set('to',e.target.value)}/>
        </div>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>ORDER SOURCE</div>
          <select style={inp} value={filters.source} onChange={e=>set('source',e.target.value)}>
            <option value="">All Sources</option>
            <option value="Web App">Web App</option>
            <option value="Mobile App">Mobile App</option>
            <option value="AI Agent">AI Agent</option>
            <option value="Physical Store (POS)">Physical Store (POS)</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>GROUP BY</div>
          <select style={inp} value={filters.group_by} onChange={e=>set('group_by',e.target.value)}>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
        <button style={btnP} onClick={generate} disabled={loading}>
          <i className="ri-line-chart-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-bar-chart-2-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
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
          {/* KPI Cards */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:20 }}>
            <KpiCard label="Total Orders"    value={Number(data.summary?.total_orders||0).toLocaleString()} icon="ri-shopping-cart-2-line" color="#1B4332" bg="#dcfce7"/>
            <KpiCard label="Total Revenue"   value={ngn(data.summary?.total_revenue)}                        icon="ri-money-dollar-circle-line" color="#0369a1" bg="#e0f2fe"/>
            <KpiCard label="Avg Order Value" value={ngn(data.summary?.avg_order_value)}                      icon="ri-bar-chart-line" color="#b45309" bg="#fef3c7"/>
            <KpiCard label="Total Customers" value={Number(data.summary?.total_customers||0).toLocaleString()} icon="ri-user-3-line" color="#7c3aed" bg="#ede9fe"/>
          </div>

          {/* Breakdown Table */}
          {data.chart && data.chart.length > 0 && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',marginBottom:20 }}>
              <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>
                {filters.group_by.charAt(0).toUpperCase()+filters.group_by.slice(1)}ly Breakdown
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Period','Orders','Revenue'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.chart.map((row,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,fontWeight:600 }}>{row.date}</td>
                        <td style={TD}>{Number(row.orders||0).toLocaleString()}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{ngn(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Products */}
          {data.top_products && data.top_products.length > 0 && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Top Products</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['#','Product','Qty Sold','Revenue'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.top_products.map((p,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,color:S,width:40 }}>{i+1}</td>
                        <td style={{ ...TD,fontWeight:600 }}>{p.name}</td>
                        <td style={TD}>{Number(p.qty||0).toLocaleString()}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{ngn(p.revenue)}</td>
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
