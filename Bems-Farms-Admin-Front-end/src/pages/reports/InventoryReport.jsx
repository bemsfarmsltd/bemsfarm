import { useState, useCallback } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const S = '#6b7280', B = '#e5e7eb'
const TH = { padding:'10px 16px',fontSize:11,fontWeight:700,color:S,textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',background:'#f9fafb',whiteSpace:'nowrap' }
const TD = { padding:'11px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }
const inp = { padding:'8px 12px',border:`1.5px solid ${B}`,borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',color:'#111827' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 20px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }

function ngn(v) { return `₦${Number(v||0).toLocaleString()}` }

export default function InventoryReport() {
  const [warehouseId, setWarehouseId] = useState('')
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (warehouseId) params.warehouse_id = warehouseId
      const r = await api.get('/admin/reports/inventory', { params })
      setData(r.data)
    } catch {
      toast.error('Failed to generate inventory report')
    } finally {
      setLoading(false)
    }
  }, [warehouseId])

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Inventory Report</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Stock levels, valuation, low stock alerts, and category breakdown.</div>
      </div>

      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:'16px 20px',marginBottom:20,display:'flex',flexWrap:'wrap',gap:12,alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:11,fontWeight:700,color:S,marginBottom:4 }}>WAREHOUSE ID <span style={{ fontWeight:400 }}>(optional)</span></div>
          <input style={inp} value={warehouseId} onChange={e=>setWarehouseId(e.target.value)} placeholder="Leave blank for all warehouses"/>
        </div>
        <button style={btnP} onClick={generate} disabled={loading}>
          <i className="ri-archive-line"/>{loading?'Generating…':'Generate Report'}
        </button>
      </div>

      {!data && !loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-archive-line" style={{ fontSize:40,display:'block',marginBottom:10 }}/>
          <div style={{ fontSize:14,fontWeight:600 }}>Click Generate Report to view inventory data</div>
        </div>
      )}

      {loading && (
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:60,textAlign:'center',color:S }}>
          <i className="ri-loader-4-line" style={{ fontSize:32,display:'block',marginBottom:8 }}/>Loading…
        </div>
      )}

      {data && !loading && (
        <>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:14,marginBottom:20 }}>
            {[
              { label:'Total Products',  value:Number(data.summary?.total_products||0).toLocaleString(),   color:'#1B4332', bg:'#dcfce7', icon:'ri-box-3-line' },
              { label:'Total Value',     value:ngn(data.summary?.total_value),                              color:'#0369a1', bg:'#e0f2fe', icon:'ri-money-dollar-circle-line' },
              { label:'Low Stock Items', value:Number(data.summary?.low_stock_count||0).toLocaleString(),   color:'#b45309', bg:'#fef3c7', icon:'ri-alarm-warning-line' },
              { label:'Out of Stock',    value:Number(data.summary?.out_of_stock_count||0).toLocaleString(),color:'#991b1b', bg:'#fee2e2', icon:'ri-close-circle-line' },
            ].map(k=>(
              <div key={k.label} style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:18,display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:40,height:40,borderRadius:10,background:k.bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
                  <i className={k.icon} style={{ fontSize:20,color:k.color }}/>
                </div>
                <div>
                  <div style={{ fontSize:11,color:S,fontWeight:600,marginBottom:2 }}>{k.label}</div>
                  <div style={{ fontSize:18,fontWeight:800,color:'#111827' }}>{k.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16 }}>
            {data.by_category?.length > 0 && (
              <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Stock by Category</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Category','Items','Value'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.by_category.map((c,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,fontWeight:600 }}>{c.category}</td>
                        <td style={TD}>{Number(c.count||0).toLocaleString()}</td>
                        <td style={{ ...TD,fontWeight:600,color:'#1B4332' }}>{ngn(c.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.low_stock?.length > 0 && (
              <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden' }}>
                <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13,color:'#b45309' }}>Low Stock Alert</div>
                <table style={{ width:'100%',borderCollapse:'collapse' }}>
                  <thead><tr>{['Product','SKU','Stock','Reorder At'].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {data.low_stock.map((p,i)=>(
                      <tr key={i}>
                        <td style={{ ...TD,fontWeight:600 }}>{p.name}</td>
                        <td style={{ ...TD,fontSize:11,color:S }}>{p.sku}</td>
                        <td style={TD}><span style={{ background:'#fef3c7',color:'#92400e',borderRadius:50,padding:'2px 8px',fontSize:11,fontWeight:700 }}>{p.stock}</span></td>
                        <td style={{ ...TD,color:S,fontSize:12 }}>{p.reorder_level}</td>
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
