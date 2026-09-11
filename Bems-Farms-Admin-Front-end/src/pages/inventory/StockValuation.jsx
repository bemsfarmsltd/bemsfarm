import { useMemo } from 'react'

const MOCK_VALUATION = [
  { id:1,  product:'Basmati Rice (5kg)',  sku:'GRN-RIC-001', category:'Grains & Carbs', unit:'bag',    qty:120, cost:4800,  price:6500  },
  { id:2,  product:'Fresh Tomatoes',      sku:'VEG-TOM-001', category:'Vegetables',     unit:'kg',     qty:8,   cost:800,   price:1200  },
  { id:3,  product:'Palm Oil (25L)',       sku:'OIL-PLM-001', category:'Grains & Carbs', unit:'crate',  qty:0,   cost:18000, price:24000 },
  { id:4,  product:'Catfish (Smoked)',    sku:'SEA-CAT-001', category:'Seafood',         unit:'kg',     qty:35,  cost:3200,  price:4500  },
  { id:5,  product:'Fresh Pepper',        sku:'VEG-PEP-001', category:'Vegetables',     unit:'kg',     qty:6,   cost:700,   price:1100  },
  { id:6,  product:'Chicken (Whole)',     sku:'MEA-CHK-001', category:'Meat',            unit:'kg',     qty:52,  cost:2800,  price:3800  },
  { id:7,  product:'Fresh Yam (Tuber)',   sku:'GRN-YAM-001', category:'Grains & Carbs', unit:'tuber',  qty:90,  cost:1200,  price:1800  },
  { id:8,  product:'Cassava Flour (2kg)', sku:'GRN-CAS-001', category:'Grains & Carbs', unit:'pack',   qty:14,  cost:1100,  price:1600  },
  { id:9,  product:'Fresh Milk (1L)',     sku:'DAI-MLK-001', category:'Dairy & Eggs',   unit:'bottle', qty:40,  cost:900,   price:1400  },
  { id:10, product:'Plantain (Bunch)',    sku:'FRM-PLT-001', category:'Fresh Farm',     unit:'bunch',  qty:25,  cost:1500,  price:2200  },
]

export default function StockValuation() {
  const enriched = useMemo(() => MOCK_VALUATION.map(p => ({
    ...p,
    costValue:   p.qty * p.cost,
    retailValue: p.qty * p.price,
    profit:      p.qty * (p.price - p.cost),
    margin:      p.cost > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0,
  })), [])

  const totals = useMemo(() => ({
    costValue:   enriched.reduce((s,p) => s + p.costValue, 0),
    retailValue: enriched.reduce((s,p) => s + p.retailValue, 0),
    profit:      enriched.reduce((s,p) => s + p.profit, 0),
    products:    enriched.length,
  }), [enriched])

  // Category breakdown
  const byCategory = useMemo(() => {
    const map = {}
    enriched.forEach(p => {
      if (!map[p.category]) map[p.category] = { category: p.category, costValue:0, retailValue:0, products:0, qty:0 }
      map[p.category].costValue   += p.costValue
      map[p.category].retailValue += p.retailValue
      map[p.category].products    += 1
      map[p.category].qty         += p.qty
    })
    return Object.values(map).sort((a,b) => b.retailValue - a.retailValue)
  }, [enriched])

  const CAT_COLORS = ['#405189','#0ab39c','#f7b84b','#f06548','#299cdb','#6559cc','#e83e8c']

  return (
    <div className="container-fluid">
      <div className="gap-2 page-heading mb-3">
        <h6 className="flex-grow-1 mb-0">Stock Valuation</h6>
        <ul className="breadcrumb flex-shrink-0 mb-0">
          <li className="breadcrumb-item"><a href="#">Inventory</a></li>
          <li className="breadcrumb-item active">Valuation</li>
        </ul>
      </div>

      {/* Summary cards */}
      <div className="row g-3 mb-4">
        {[
          { label:'Cost Value (Stock)',   value:`₦${totals.costValue.toLocaleString()}`,   icon:'ri-price-tag-3-line',          color:'#405189', sub:'At purchase price' },
          { label:'Retail Value (Stock)', value:`₦${totals.retailValue.toLocaleString()}`, icon:'ri-store-2-line',              color:'#0ab39c', sub:'At selling price'  },
          { label:'Potential Profit',     value:`₦${totals.profit.toLocaleString()}`,      icon:'ri-line-chart-line',           color:'#299cdb', sub:'If all stock sold'  },
          { label:'Avg Gross Margin',     value:`${Math.round((totals.profit / totals.retailValue) * 100)}%`, icon:'ri-percent-line', color:'#f7b84b', sub:'Across all products' },
        ].map(c => (
          <div className="col-6 col-xl-3" key={c.label}>
            <div className="card mb-0" style={{ borderLeft:`3px solid ${c.color}` }}>
              <div className="card-body py-3">
                <div className="d-flex align-items-center gap-3 mb-1">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ width:40, height:40, background:`${c.color}1a` }}>
                    <i className={`${c.icon} fs-18`} style={{ color:c.color }}></i>
                  </div>
                  <div>
                    <div className="fw-bold" style={{ fontSize:18, color:c.color }}>{c.value}</div>
                    <div className="text-muted" style={{ fontSize:12 }}>{c.label}</div>
                  </div>
                </div>
                <div className="text-muted" style={{ fontSize:11, paddingLeft:52 }}>{c.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0 fw-semibold">Valuation by Category</h6>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Category</th>
                  <th className="fw-medium text-muted">Products</th>
                  <th className="fw-medium text-muted">Total Qty</th>
                  <th className="fw-medium text-muted">Cost Value</th>
                  <th className="fw-medium text-muted">Retail Value</th>
                  <th className="fw-medium text-muted">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((c, i) => {
                  const pct = Math.round((c.retailValue / totals.retailValue) * 100)
                  return (
                    <tr key={c.category}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{ width:10, height:10, borderRadius:'50%', background: CAT_COLORS[i % CAT_COLORS.length] }}></div>
                          <span className="fw-medium">{c.category}</span>
                        </div>
                      </td>
                      <td>{c.products}</td>
                      <td>{c.qty}</td>
                      <td>₦{c.costValue.toLocaleString()}</td>
                      <td className="fw-medium">₦{c.retailValue.toLocaleString()}</td>
                      <td style={{ minWidth:140 }}>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress flex-grow-1" style={{ height:6 }}>
                            <div className="progress-bar" style={{ width:`${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }}></div>
                          </div>
                          <span style={{ fontSize:12, minWidth:32 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Full product valuation table */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-semibold">Product-Level Valuation</h6>
          <span className="badge bg-light text-dark border">{enriched.length} products</span>
        </div>
        <div className="card-body pt-0">
          <div className="table-responsive">
            <table className="table align-middle text-nowrap mb-0">
              <thead>
                <tr className="bg-light border-bottom">
                  <th className="fw-medium text-muted">Product</th>
                  <th className="fw-medium text-muted">SKU</th>
                  <th className="fw-medium text-muted">Category</th>
                  <th className="fw-medium text-muted">Qty</th>
                  <th className="fw-medium text-muted">Unit Cost</th>
                  <th className="fw-medium text-muted">Sell Price</th>
                  <th className="fw-medium text-muted">Cost Value</th>
                  <th className="fw-medium text-muted">Retail Value</th>
                  <th className="fw-medium text-muted">Potential Profit</th>
                  <th className="fw-medium text-muted">Margin</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map(p => (
                  <tr key={p.id} style={{ opacity: p.qty === 0 ? 0.5 : 1 }}>
                    <td className="fw-medium">{p.product}</td>
                    <td><code style={{ fontSize:12 }}>{p.sku}</code></td>
                    <td><span className="badge bg-light text-dark border">{p.category}</span></td>
                    <td className={p.qty === 0 ? 'text-danger fw-bold' : 'fw-medium'}>{p.qty}</td>
                    <td>₦{p.cost.toLocaleString()}</td>
                    <td>₦{p.price.toLocaleString()}</td>
                    <td>₦{p.costValue.toLocaleString()}</td>
                    <td className="fw-medium">₦{p.retailValue.toLocaleString()}</td>
                    <td className="text-success fw-medium">₦{p.profit.toLocaleString()}</td>
                    <td>
                      <span className="badge" style={{ background: p.margin >= 30 ? '#d1fae5' : p.margin >= 15 ? '#fef3c7' : '#fee2e2', color: p.margin >= 30 ? '#065f46' : p.margin >= 15 ? '#92400e' : '#991b1b' }}>
                        {p.margin}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-top">
                <tr style={{ background:'#f8f9fa' }}>
                  <td colSpan={6} className="fw-bold">Total</td>
                  <td className="fw-bold">₦{totals.costValue.toLocaleString()}</td>
                  <td className="fw-bold">₦{totals.retailValue.toLocaleString()}</td>
                  <td className="fw-bold text-success">₦{totals.profit.toLocaleString()}</td>
                  <td className="fw-bold">{Math.round((totals.profit / totals.retailValue) * 100)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
