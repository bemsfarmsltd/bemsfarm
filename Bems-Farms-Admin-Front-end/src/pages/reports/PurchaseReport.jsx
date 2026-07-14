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

export default function PurchaseReport() {
  const [filters, setFilters] = useState({ from:monthStart, to:today })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/reports/purchases', { params: filters })
      setData(r.data)
    } catch {
      toast.error('Failed to generate purchase report')
    } finally {
      setLoading(false)
    }
  }, [filters])

  function set(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Purchase Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Track supplier purchase orders, totals, and payment status.</div>
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
        <button style={btnP} onClick={generate} disabled={loading}>
          <i className="ri-shopping-basket-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-shopping-basket-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
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
          {/* KPI Cards */}
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:20 }}>
            <KpiCard label="Total Orders"    value={Number(data.summary?.total_orders||0).toLocaleString()} icon="ri-file-list-3-line"     color="#1B4332" bg="#dcfce7"/>
            <KpiCard label="Total Value"     value={ngn(data.summary?.total_value)}                          icon="ri-money-dollar-circle-line" color="#0369a1" bg="#e0f2fe"/>
            <KpiCard label="Paid"            value={ngn(data.summary?.paid)}                                 icon="ri-checkbox-circle-line"  color="#166534" bg="#dcfce7"/>
            <KpiCard label="Pending"         value={ngn(data.summary?.pending)}                              icon="ri-time-line"             color="#b45309" bg="#fef3c7"/>
          </div>

          {/* By Supplier Table */}
          {data.by_supplier && data.by_supplier.length > 0 && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
              <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>
                Purchases by Supplier
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Supplier','Orders','Total Value'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {data.by_supplier.map((row,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,fontWeight:600 }}>{row.supplier}</td>
                        <td style={TD}>{Number(row.orders||0).toLocaleString()}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{ngn(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty result state */}
          {(!data.by_supplier || data.by_supplier.length === 0) && (
            <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:40,textAlign:'center',color:S }}>
              <i className="ri-inbox-line" style={{ fontSize:32,display:'block',marginBottom:8 }}/>
              <div style={{ fontSize:13 }}>No purchase data found for the selected period.</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
