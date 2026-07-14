import { useState, useMemo } from 'react'

const EXPORT_TYPES = [
  { key:'products',       label:'Products',        icon:'ri-box-3-line',       color:'#0ab39c', fields:['Name','SKU','Barcode','Category','Sub-Category','Unit Price','Cost Price','Stock','Unit','Low Stock Alert','Tax %','Status','Description','Created'] },
  { key:'categories',     label:'Categories',      icon:'ri-folder-line',      color:'#405189', fields:['Name','Code','Products','Status','Created'] },
  { key:'sub_categories', label:'Sub-Categories',  icon:'ri-folder-open-line', color:'#299cdb', fields:['Name','Parent Category','Code','POS Visible','Status','Created'] },
  { key:'units',          label:'Units',           icon:'ri-ruler-2-line',     color:'#a78bfa', fields:['Name','Short Name','Type','Step','Products','Status','Created'] },
  { key:'inventory',      label:'Inventory Report',icon:'ri-stock-line',       color:'#f06548', fields:['Product','SKU','Stock','Unit','Low Stock Threshold','Last Restocked','Status'] },
]

const FORMATS = ['CSV','XLSX','PDF']

const HISTORY = [
  { type:'products',   file:'products_export_2026-03-01.csv',  by:'Admin',         rows:42, format:'CSV',  date:'01 Mar 2026',size:'84 KB' },
  { type:'inventory',  file:'inventory_2026-02-20.xlsx',        by:'Store Manager', rows:38, format:'XLSX', date:'20 Feb 2026',size:'62 KB' },
  { type:'categories', file:'categories_2026-01-15.csv',        by:'Admin',         rows:8,  format:'CSV',  date:'15 Jan 2026',size:'4 KB'  },
]

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

export default function BulkExport() {
  const [selectedType, setSelectedType]     = useState('products')
  const [selectedFormat, setSelectedFormat] = useState('CSV')
  const [selectedFields, setSelectedFields] = useState(null)
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [exporting, setExporting]           = useState(false)
  const [history, setHistory]               = useState(HISTORY)

  const typeConfig = EXPORT_TYPES.find(t=>t.key===selectedType)
  const fields     = useMemo(() => selectedFields || typeConfig.fields, [selectedFields, typeConfig])

  function handleTypeChange(key) {
    setSelectedType(key); setSelectedFields(null)
  }

  function toggleField(f) {
    const current = fields
    if (current.includes(f)) {
      if (current.length===1) return
      setSelectedFields(current.filter(x=>x!==f))
    } else {
      setSelectedFields([...current,f])
    }
  }

  function handleExport() {
    setExporting(true)
    setTimeout(() => {
      const fname = `${selectedType}_export_${new Date().toISOString().slice(0,10)}.${selectedFormat.toLowerCase()}`
      setHistory(p=>[{ type:selectedType,file:fname,by:'Admin',rows:Math.floor(Math.random()*50+5),format:selectedFormat,date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}),size:'— KB' },...p])
      setExporting(false)
    }, 1200)
  }

  const B = '#e5e7eb', S = '#6b7280'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Bulk Export</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Bulk Export</div>
      </div>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:20,alignItems:'start' }}>
        {/* Left: config */}
        <div>
          {/* Export Type */}
          <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>What to export?</div>
            <div style={{ padding:20,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
              {EXPORT_TYPES.map(t=>(
                <button key={t.key} onClick={()=>handleTypeChange(t.key)}
                  style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',gap:6,padding:14,borderRadius:10,border:`2px solid ${selectedType===t.key?t.color:B}`,background:selectedType===t.key?`${t.color}0d`:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s' }}>
                  <i className={t.icon} style={{ fontSize:20,color:t.color }}/>
                  <span style={{ fontWeight:700,fontSize:12,color:'#111827' }}>{t.label}</span>
                  <span style={{ fontSize:11,color:S }}>{typeConfig?.fields.length} fields</span>
                </button>
              ))}
            </div>
          </div>

          {/* Field selection */}
          <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Select Fields ({fields.length}/{typeConfig.fields.length})</span>
              <div style={{ display:'flex',gap:8 }}>
                <button style={{ ...btnL,padding:'5px 10px',fontSize:12 }} onClick={()=>setSelectedFields([...typeConfig.fields])}>All</button>
                <button style={{ ...btnL,padding:'5px 10px',fontSize:12 }} onClick={()=>setSelectedFields([typeConfig.fields[0]])}>Reset</button>
              </div>
            </div>
            <div style={{ padding:16,display:'flex',flexWrap:'wrap',gap:8 }}>
              {typeConfig.fields.map(f=>(
                <button key={f} onClick={()=>toggleField(f)}
                  style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,border:`1.5px solid ${fields.includes(f)?typeConfig.color:B}`,background:fields.includes(f)?`${typeConfig.color}12`:'#fff',color:fields.includes(f)?typeConfig.color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:600 }}>
                  {fields.includes(f)&&<i className="ri-check-line" style={{ fontSize:11 }}/>}
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Filter Data</div>
            <div style={{ padding:20,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14 }}>
              <div>
                <label style={LBL}>Status</label>
                <select style={inp} value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>
              <div>
                <label style={LBL}>Date From</label>
                <input type="date" style={inp} value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
              </div>
              <div>
                <label style={LBL}>Date To</label>
                <input type="date" style={inp} value={dateTo} onChange={e=>setDateTo(e.target.value)}/>
              </div>
            </div>
          </div>
        </div>

        {/* Right: format + download */}
        <div style={{ position:'sticky',top:80 }}>
          <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Export Format</div>
            <div style={{ padding:16,display:'flex',flexDirection:'column',gap:8 }}>
              {FORMATS.map(fmt=>(
                <label key={fmt} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,border:`2px solid ${selectedFormat===fmt?'#1B4332':B}`,background:selectedFormat===fmt?'#f0fdf4':'#fff',cursor:'pointer' }}>
                  <input type="radio" checked={selectedFormat===fmt} onChange={()=>setSelectedFormat(fmt)} style={{ accentColor:'#1B4332' }}/>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:'#111827' }}>{fmt}</div>
                    <div style={{ fontSize:11,color:S }}>
                      {fmt==='CSV'?'Comma-separated, universal':fmt==='XLSX'?'Excel format with formatting':'Print-ready document'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:16,marginBottom:14 }}>
            <div style={{ fontWeight:700,fontSize:13,color:'#166534',marginBottom:8 }}>Export Summary</div>
            <div style={{ fontSize:12,color:'#374151',display:'flex',flexDirection:'column',gap:5 }}>
              <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ color:S }}>Type</span><span style={{ fontWeight:600 }}>{typeConfig?.label}</span></div>
              <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ color:S }}>Format</span><span style={{ fontWeight:600 }}>{selectedFormat}</span></div>
              <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ color:S }}>Fields</span><span style={{ fontWeight:600 }}>{fields.length} selected</span></div>
              <div style={{ display:'flex',justifyContent:'space-between' }}><span style={{ color:S }}>Filter</span><span style={{ fontWeight:600,textTransform:'capitalize' }}>{filterStatus==='all'?'None':filterStatus}</span></div>
            </div>
          </div>

          <button style={{ ...btnP,width:'100%',justifyContent:'center',background:typeConfig.color,opacity:exporting?.7:1 }} disabled={exporting} onClick={handleExport}>
            {exporting ? <><i className="ri-loader-4-line"/>Exporting…</> : <><i className="ri-download-cloud-line"/>Export {typeConfig?.label}</>}
          </button>
        </div>
      </div>

      {/* Export History */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginTop:20 }}>
        <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Export History</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>{['File','Type','Format','Rows','Exported By','Date','Size',''].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {history.map((row,i)=>{
                const cfg = EXPORT_TYPES.find(t=>t.key===row.type)||EXPORT_TYPES[0]
                return (
                  <tr key={i}>
                    <td style={TD}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:28,height:28,borderRadius:6,background:`${cfg.color}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                          <i className={cfg.icon} style={{ color:cfg.color,fontSize:14 }}/>
                        </div>
                        <span style={{ fontWeight:600,fontSize:12 }}>{row.file}</span>
                      </div>
                    </td>
                    <td style={TD}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:500 }}>{cfg.label}</span></td>
                    <td style={TD}><code style={{ fontSize:11,background:'#f3f4f6',padding:'2px 6px',borderRadius:4,color:'#374151' }}>{row.format}</code></td>
                    <td style={{ ...TD,color:S }}>{row.rows}</td>
                    <td style={{ ...TD,color:S }}>{row.by}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{row.date}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{row.size}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:'pointer' }}><i className="ri-download-line"/></button>
                        <button onClick={()=>setHistory(p=>p.filter((_,idx)=>idx!==i))} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }}><i className="ri-delete-bin-line"/></button>
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
  )
}
