import { useState, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const S = '#6b7280', B = '#e5e7eb'
const TH = { padding:'10px 16px',fontSize:11,fontWeight:700,color:S,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',background:'#f9fafb',whiteSpace:'nowrap' }
const TD = { padding:'11px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const inp = { padding:'8px 12px',border:`1.5px solid ${B}`,borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',color:'#111827' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

function ngn(v) { return `₦${Number(v||0).toLocaleString()}` }

function paymentStatusBadge(status) {
  const map = {
    paid:     { bg:'#dcfce7', color:'#166534' },
    partial:  { bg:'#fef3c7', color:'#92400e' },
    pending:  { bg:'#e0f2fe', color:'#0369a1' },
    overdue:  { bg:'#fee2e2', color:'#991b1b' },
  }
  const key = (status||'').toLowerCase()
  const style = map[key] || { bg:'#f3f4f6', color:S }
  return (
    <span style={{ background:style.bg,color:style.color,borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>
      {status||'—'}
    </span>
  )
}

const today = new Date().toISOString().slice(0,10)
const monthStart = today.slice(0,7)+'-01'

export default function SupplierReport() {
  const [filters, setFilters] = useState({ from:monthStart, to:today })
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/admin/reports/suppliers', { params: filters })
      setData(r.data)
    } catch {
      toast.error('Failed to generate supplier report')
    } finally {
      setLoading(false)
    }
  }, [filters])

  function set(k, v) { setFilters(f => ({ ...f, [k]: v })) }

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Supplier Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>View total purchases, outstanding balances, and payment status per supplier.</div>
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
          <i className="ri-truck-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {/* Empty state */}
      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-truck-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
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
          {/* Summary count badge */}
          {data.suppliers && data.suppliers.length > 0 && (
            <div style={{ marginBottom:14,fontSize:13,color:S }}>
              Showing <strong style={{ color:'#111827' }}>{data.suppliers.length}</strong> supplier{data.suppliers.length!==1?'s':''} for selected period.
            </div>
          )}

          {/* Supplier Table */}
          <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>
              Supplier Summary
            </div>
            {(!data.suppliers || data.suppliers.length === 0) ? (
              <div style={{ padding:60,textAlign:'center',color:S }}>
                <i className="ri-inbox-line" style={{ fontSize:32,display:'block',marginBottom:8 }}/>
                <div style={{ fontSize:13 }}>No supplier data found for the selected period.</div>
              </div>
            ) : (
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead>
                    <tr>
                      {['#','Supplier','Total Purchased','Balance Due','Payment Status'].map(h=>(
                        <th key={h} style={TH}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.suppliers.map((s,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,color:S,width:40,fontWeight:600 }}>{i+1}</td>
                        <td style={{ ...TD,fontWeight:600 }}>{s.name}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{ngn(s.total_purchased)}</td>
                        <td style={{ ...TD,fontWeight:600,color:Number(s.balance_due||0)>0?'#991b1b':'#166534' }}>
                          {ngn(s.balance_due)}
                        </td>
                        <td style={TD}>{paymentStatusBadge(s.payment_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background:'#f9fafb' }}>
                      <td colSpan={2} style={{ ...TD,fontWeight:700,color:'#111827',borderTop:'2px solid #e5e7eb' }}>TOTAL</td>
                      <td style={{ ...TD,fontWeight:700,color:'#1B4332',borderTop:'2px solid #e5e7eb' }}>
                        {ngn(data.suppliers.reduce((acc,s)=>acc+Number(s.total_purchased||0),0))}
                      </td>
                      <td style={{ ...TD,fontWeight:700,color:'#991b1b',borderTop:'2px solid #e5e7eb' }}>
                        {ngn(data.suppliers.reduce((acc,s)=>acc+Number(s.balance_due||0),0))}
                      </td>
                      <td style={{ ...TD,borderTop:'2px solid #e5e7eb' }}/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
