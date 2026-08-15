import { useState, useMemo } from 'react'
import api from '../../lib/api'
import toast from 'react-hot-toast'

const EXPORT_TYPES = [
  { key:'products',       label:'Products',        icon:'ri-box-3-line',       color:'#0ab39c', fields:['Name','SKU','Barcode','Category','Sub-Category','Unit Price','Cost Price','Stock','Unit','Low Stock Alert','Tax %','Status','Description','Created'] },
  { key:'categories',     label:'Categories',      icon:'ri-folder-line',      color:'#405189', fields:['Name','Code','Products','Status','Created'] },
  { key:'sub_categories', label:'Sub-Categories',  icon:'ri-folder-open-line', color:'#299cdb', fields:['Name','Parent Category','Code','POS Visible','Status','Created'] },
  { key:'units',          label:'Units',           icon:'ri-ruler-2-line',     color:'#a78bfa', fields:['Name','Short Name','Type','Step','Products','Status','Created'] },
  { key:'inventory',      label:'Inventory Report',icon:'ri-stock-line',       color:'#f06548', fields:['Product','SKU','Stock','Unit','Low Stock Threshold','Last Restocked','Status'] },
]

const FORMATS = ['CSV','XLSX','PDF']

const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid var(--border)',background:'var(--bg-card)',color:'var(--text-secondary)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'var(--bg-card)',boxSizing:'border-box',color:'var(--text-primary)' }
const LBL  = { display:'block',fontSize:12,fontWeight:700,color:'var(--text-secondary)',marginBottom:5 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'var(--bg-subtle)' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid var(--border)',fontSize:13,color:'var(--text-primary)' }

export default function BulkExport() {
  const [selectedType, setSelectedType]     = useState('products')
  const [selectedFormat, setSelectedFormat] = useState('CSV')
  const [selectedFields, setSelectedFields] = useState(null)
  const [dateFrom, setDateFrom]             = useState('')
  const [dateTo, setDateTo]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState('all')
  const [exporting, setExporting]           = useState(false)
  const [downloadingType, setDownloadingType] = useState(null)
  // Real export history — there's no backend storage for past export
  // files, so this only ever reflects exports made this session, rather
  // than a fabricated multi-month audit trail.
  const [history, setHistory]               = useState([])

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

  // Shared by the main "Export" button and each history row's re-download —
  // both trigger a real CSV fetch + browser download for the given type.
  async function downloadExport(type) {
    const res = await api.get(`/admin/config/export`, {
      params: { type },
      responseType: 'blob'
    })
    const blob = new Blob([res.data], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const filename = `${type}_export_${new Date().toISOString().slice(0,10)}.csv`
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    link.parentNode.removeChild(link)
    window.URL.revokeObjectURL(url)
    return { filename, blob }
  }

  async function handleExport() {
    if (selectedFormat !== 'CSV') {
      toast.error('Only CSV format is currently supported for direct exports.')
      return
    }
    setExporting(true)
    try {
      const { filename, blob } = await downloadExport(selectedType)
      setHistory(p => [{
        type: selectedType,
        file: filename,
        by: 'Admin',
        rows: 'All',
        format: 'CSV',
        date: new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
        size: `${Math.round(blob.size / 1024)} KB`
      }, ...p])
      toast.success('Report exported successfully')
    } catch {
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  async function handleHistoryDownload(row) {
    setDownloadingType(row.type)
    try {
      await downloadExport(row.type)
      toast.success('Download started')
    } catch {
      toast.error('Failed to download')
    } finally {
      setDownloadingType(null)
    }
  }

  const B = 'var(--border)', S = '#6b7280'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'var(--text-primary)' }}>Bulk Export</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Bulk Export</div>
      </div>

      <div className="grid-sidebar-split" style={{ display:'grid',gridTemplateColumns:'1fr 340px',gap:20,alignItems:'start' }}>
        {/* Left: config */}
        <div>
          {/* Export Type */}
          <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>What to export?</div>
            <div className="grid-stats-auto" style={{ padding:20,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
              {EXPORT_TYPES.map(t=>(
                <button key={t.key} onClick={()=>handleTypeChange(t.key)}
                  style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',gap:6,padding:14,borderRadius:10,border:`2px solid ${selectedType===t.key?t.color:B}`,background:selectedType===t.key?`${t.color}0d`:'#fff',cursor:'pointer',textAlign:'left',transition:'all .15s' }}>
                  <i className={t.icon} style={{ fontSize:20,color:t.color }}/>
                  <span style={{ fontWeight:700,fontSize:12,color:'var(--text-primary)' }}>{t.label}</span>
                  <span style={{ fontSize:11,color:S }}>{typeConfig?.fields.length} fields</span>
                </button>
              ))}
            </div>
          </div>

          {/* Field selection */}
          <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
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
                  style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,border:`1.5px solid ${fields.includes(f)?typeConfig.color:B}`,background:fields.includes(f)?`${typeConfig.color}12`:'var(--bg-card)',color:fields.includes(f)?typeConfig.color:'var(--text-secondary)',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontSize:12,fontWeight:600 }}>
                  {fields.includes(f)&&<i className="ri-check-line" style={{ fontSize:15 }}/>}
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
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
          <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:16 }}>
            <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Export Format</div>
            <div style={{ padding:16,display:'flex',flexDirection:'column',gap:8 }}>
              {FORMATS.map(fmt=>(
                <label key={fmt} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,border:`2px solid ${selectedFormat===fmt?'#1B4332':B}`,background:selectedFormat===fmt?'#f0fdf4':'#fff',cursor:'pointer' }}>
                  <input type="radio" checked={selectedFormat===fmt} onChange={()=>setSelectedFormat(fmt)} style={{ accentColor:'#1B4332' }}/>
                  <div>
                    <div style={{ fontWeight:700,fontSize:13,color:'var(--text-primary)' }}>{fmt}</div>
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
            <div style={{ fontSize:12,color:'var(--text-secondary)',display:'flex',flexDirection:'column',gap:5 }}>
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
      <div style={{ background:'var(--bg-card)',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginTop:20 }}>
        <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:13 }}>Export History</div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>{['File','Type','Format','Rows','Exported By','Date','Size',''].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {history.length===0&&(
                <tr><td colSpan={8} style={{ ...TD,textAlign:'center',padding:'40px 0',color:S }}>
                  <i className="ri-download-cloud-2-line" style={{ fontSize:43,display:'block',marginBottom:8 }}/>No exports yet this session
                </td></tr>
              )}
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
                    <td style={TD}><span style={{ background:'var(--bg-muted)',color:'var(--text-secondary)',borderRadius:20,padding:'2px 8px',fontSize:11,fontWeight:500 }}>{cfg.label}</span></td>
                    <td style={TD}><code style={{ fontSize:11,background:'var(--bg-muted)',padding:'2px 6px',borderRadius:4,color:'var(--text-secondary)' }}>{row.format}</code></td>
                    <td style={{ ...TD,color:S }}>{row.rows}</td>
                    <td style={{ ...TD,color:S }}>{row.by}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{row.date}</td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{row.size}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button onClick={()=>handleHistoryDownload(row)} disabled={downloadingType===row.type} style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f0f4ff',color:'#405189',cursor:downloadingType===row.type?'wait':'pointer' }}><i className={downloadingType===row.type?'ri-loader-4-line':'ri-download-line'}/></button>
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
