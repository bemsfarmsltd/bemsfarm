import { useState, useRef } from 'react'

const IMPORT_TYPES = {
  products: {
    label: 'Products',
    icon: 'ri-box-3-line',
    color: '#0ab39c',
    fields: [
      { key:'name',            label:'Product Name',     required:true  },
      { key:'sku',             label:'SKU',              required:true  },
      { key:'barcode',         label:'Barcode',          required:false },
      { key:'category_id',     label:'Category ID',      required:true  },
      { key:'sub_category_id', label:'Sub-Category ID',  required:false },
      { key:'unit_price',      label:'Unit Price (₦)',   required:true  },
      { key:'cost_price',      label:'Cost Price (₦)',   required:false },
      { key:'stock_qty',       label:'Stock Quantity',   required:true  },
      { key:'unit',            label:'Unit (kg/pack/…)', required:false },
      { key:'low_stock_alert', label:'Low Stock Alert',  required:false },
      { key:'tax_percent',     label:'Tax (%)',          required:false },
      { key:'description',     label:'Description',      required:false },
      { key:'status',          label:'Status',           required:false },
    ],
    templateHeaders:['name','sku','barcode','category_id','sub_category_id','unit_price','cost_price','stock_qty','unit','low_stock_alert','tax_percent','description','status'],
  },
  categories: {
    label: 'Categories',
    icon: 'ri-folder-line',
    color: '#405189',
    fields: [
      { key:'name',        label:'Category Name', required:true  },
      { key:'code',        label:'Code',          required:false },
      { key:'description', label:'Description',   required:false },
      { key:'status',      label:'Status',        required:false },
    ],
    templateHeaders:['name','code','description','status'],
  },
  sub_categories: {
    label: 'Sub-Categories',
    icon: 'ri-folder-open-line',
    color: '#299cdb',
    fields: [
      { key:'name',        label:'Sub-Category Name',  required:true  },
      { key:'category_id', label:'Parent Category ID', required:true  },
      { key:'code',        label:'Code',               required:false },
      { key:'description', label:'Description',        required:false },
      { key:'status',      label:'Status',             required:false },
    ],
    templateHeaders:['name','category_id','code','description','status'],
  },

}

const HISTORY = [
  { file:'products_jan.xlsx',   type:'products',       by:'Admin',           status:'success',    date:'12 Jan 2026' },
  { file:'variants_feb.csv',    type:'products',       by:'Store Manager',   status:'success',    date:'08 Feb 2026' },
  { file:'price_update.xls',    type:'products',       by:'Admin',           status:'failed',     date:'22 Feb 2026' },
  { file:'category_import.csv', type:'categories',     by:'Inventory Team',  status:'processing', date:'01 Mar 2026' },
  { file:'supplier_products.xlsx',type:'products',     by:'Warehouse Admin', status:'success',    date:'10 Mar 2026' },
]

const STATUS_STYLE = {
  success:    { background:'#dcfce7',color:'#166534' },
  failed:     { background:'#fee2e2',color:'#991b1b' },
  processing: { background:'#e0f2fe',color:'#0369a1' },
}

const inp  = { display:'block',width:'100%',padding:'8px 12px',border:'1.5px solid #e5e7eb',borderRadius:8,fontFamily:'Nunito,sans-serif',fontSize:13,outline:'none',background:'#fff',boxSizing:'border-box',color:'#111827' }
const btnP = { display:'inline-flex',alignItems:'center',gap:6,padding:'9px 18px',borderRadius:9,border:'none',background:'#1B4332',color:'#fff',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13 }
const btnL = { display:'inline-flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:9,border:'1.5px solid #e5e7eb',background:'#fff',color:'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:600,fontSize:13 }
const TH   = { padding:'10px 16px',fontSize:11,fontWeight:700,color:'#6b7280',textTransform:'uppercase',letterSpacing:'0.06em',textAlign:'left',whiteSpace:'nowrap',background:'#f9fafb' }
const TD   = { padding:'12px 16px',verticalAlign:'middle',borderBottom:'1px solid #f3f4f6',fontSize:13,color:'#111827' }

function downloadTemplate(typeKey) {
  const type = IMPORT_TYPES[typeKey]
  const csv = type.templateHeaders.join(',') + '\n' + type.templateHeaders.map(()=>'').join(',')
  const blob = new Blob([csv],{ type:'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `bems_${typeKey}_template.csv`; a.click()
  URL.revokeObjectURL(url)
}

function parseCSVHeaders(text) {
  return text.split('\n')[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''))
}

export default function BulkImport() {
  const [activeType, setActiveType]     = useState('products')
  const [step, setStep]                 = useState(1)
  const [dragOver, setDragOver]         = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [fileHeaders, setFileHeaders]   = useState([])
  const [mapping, setMapping]           = useState({})
  const [importing, setImporting]       = useState(false)
  const [history, setHistory]           = useState(HISTORY)
  const fileInputRef = useRef(null)

  const typeConfig = IMPORT_TYPES[activeType]

  function handleTypeChange(key) { setActiveType(key); resetUpload() }
  function resetUpload() { setStep(1); setUploadedFile(null); setFileHeaders([]); setMapping({}) }

  function handleFile(file) {
    if (!file) return
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      const headers = parseCSVHeaders(e.target.result)
      setFileHeaders(headers)
      const autoMap = {}
      typeConfig.fields.forEach(f => {
        const match = headers.find(h => h.toLowerCase()===f.key.toLowerCase()||h.toLowerCase()===f.label.toLowerCase())
        if (match) autoMap[f.key] = match
      })
      setMapping(autoMap); setStep(2)
    }
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      setFileHeaders(typeConfig.templateHeaders)
      const autoMap = {}
      typeConfig.fields.forEach(f => { if (typeConfig.templateHeaders.includes(f.key)) autoMap[f.key]=f.key })
      setMapping(autoMap); setUploadedFile(file); setStep(2)
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files[0]; if (file) handleFile(file)
  }

  function handleImport() {
    setImporting(true)
    setTimeout(() => {
      setHistory(prev => [{ file:uploadedFile.name, type:activeType, by:'Admin', status:'success', date:new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) }, ...prev])
      setImporting(false); setStep(3)
    }, 1800)
  }

  const requiredMapped = typeConfig.fields.filter(f=>f.required).every(f=>mapping[f.key])
  const mappedCount    = Object.values(mapping).filter(Boolean).length
  const B = '#e5e7eb', S = '#6b7280'

  return (
    <div style={{ fontFamily:'Nunito,sans-serif' }}>
      <div style={{ marginBottom:24 }}>
        <div style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#111827' }}>Bulk Import</div>
        <div style={{ fontSize:12,color:S,marginTop:2 }}>Products → Bulk Import</div>
      </div>

      {/* Type selector */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,padding:'14px 20px',marginBottom:20,boxShadow:'0 1px 4px rgba(0,0,0,.06)',display:'flex',gap:10,flexWrap:'wrap' }}>
        {Object.entries(IMPORT_TYPES).map(([key,cfg])=>(
          <button key={key} onClick={()=>handleTypeChange(key)}
            style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:9,border:`2px solid ${activeType===key?cfg.color:B}`,background:activeType===key?cfg.color:'#fff',color:activeType===key?'#fff':'#374151',cursor:'pointer',fontFamily:'Nunito,sans-serif',fontWeight:700,fontSize:13,transition:'all .15s' }}>
            <i className={cfg.icon}/>{cfg.label}
          </button>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step===1&&(
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20 }}>
          <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <i className={typeConfig.icon} style={{ color:typeConfig.color,fontSize:20 }}/>
              <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Import {typeConfig.label}</span>
            </div>
            <button style={btnL} onClick={()=>downloadTemplate(activeType)}><i className="ri-download-line"/>Download Template</button>
          </div>
          <div style={{ padding:24 }}>
            {/* Field hints */}
            <div style={{ background:'#f9fafb',border:`1px solid ${B}`,borderRadius:10,padding:'14px 18px',marginBottom:20 }}>
              <div style={{ fontWeight:700,fontSize:13,marginBottom:10 }}>Required columns for {typeConfig.label}</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {typeConfig.fields.map(f=>(
                  <span key={f.key} style={{ background:f.required?'#1B4332':'#f3f4f6',color:f.required?'#fff':'#374151',borderRadius:20,padding:'3px 10px',fontSize:11,fontWeight:600 }}>
                    {f.label}{f.required?' *':''}
                  </span>
                ))}
              </div>
              <div style={{ fontSize:11,color:S,marginTop:10 }}>* Required fields. Download the template above to get started with the correct column names.</div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e=>{ e.preventDefault(); setDragOver(true) }}
              onDragLeave={()=>setDragOver(false)}
              onDrop={handleDrop}
              onClick={()=>fileInputRef.current?.click()}
              style={{ border:`2px dashed ${dragOver?typeConfig.color:B}`,borderRadius:12,padding:'52px 24px',textAlign:'center',cursor:'pointer',background:dragOver?`${typeConfig.color}08`:'#fafafa',transition:'all .15s' }}>
              <div style={{ fontSize:48 }}>📂</div>
              <div style={{ fontWeight:700,fontSize:16,marginTop:10,marginBottom:4 }}>Drag & drop your file here</div>
              <div style={{ fontSize:13,color:S,marginBottom:16 }}>or click to browse — CSV, XLS, XLSX accepted (max 10 MB)</div>
              <button type="button" style={btnL} onClick={e=>{ e.stopPropagation(); fileInputRef.current?.click() }}>Browse File</button>
              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display:'none' }} onChange={e=>handleFile(e.target.files[0])}/>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step===2&&(
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20 }}>
          <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                <i className="ri-git-merge-line" style={{ color:'#405189',fontSize:18 }}/>
                <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Map Your Columns</span>
              </div>
              <div style={{ fontSize:12,color:S }}>File: <strong style={{ color:'#111827' }}>{uploadedFile?.name}</strong> · {fileHeaders.length} column{fileHeaders.length!==1?'s':''} detected · {mappedCount} mapped</div>
            </div>
            <button style={btnL} onClick={resetUpload}><i className="ri-arrow-left-line"/>Change File</button>
          </div>

          <div style={{ padding:24 }}>
            {/* Detected headers */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11,fontWeight:700,color:S,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10 }}>Columns detected in your file</div>
              <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                {fileHeaders.map(h=>(
                  <span key={h} style={{ background:'#f9fafb',border:`1px solid ${B}`,borderRadius:20,padding:'3px 12px',fontSize:12,color:'#374151' }}>{h}</span>
                ))}
              </div>
            </div>

            <div style={{ borderTop:`1px solid ${B}`,paddingTop:20,marginBottom:20 }}>
              <div style={{ fontSize:11,fontWeight:700,color:S,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:14 }}>Match your columns to system fields</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:14 }}>
                {typeConfig.fields.map(f=>(
                  <div key={f.key}>
                    <label style={{ display:'block',fontSize:12,fontWeight:700,color:'#374151',marginBottom:5 }}>
                      {f.label}{f.required&&<span style={{ color:'#f06548',marginLeft:4 }}>*</span>}
                    </label>
                    <select value={mapping[f.key]||''} onChange={e=>setMapping(p=>({...p,[f.key]:e.target.value}))}
                      style={{ ...inp,borderColor:mapping[f.key]?'#0ab39c':f.required&&!mapping[f.key]?'#f7b84b':B }}>
                      <option value="">— not mapped —</option>
                      {fileHeaders.map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                    {mapping[f.key]&&(
                      <div style={{ marginTop:4,fontSize:11,color:'#0ab39c',display:'flex',alignItems:'center',gap:4 }}>
                        <i className="ri-check-line"/>mapped from <strong>"{mapping[f.key]}"</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Summary + import button */}
            <div style={{ borderTop:`1px solid ${B}`,paddingTop:16,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:14 }}>
              <div>
                {!requiredMapped&&<div style={{ fontSize:13,color:'#d97706',display:'flex',alignItems:'center',gap:6 }}><i className="ri-alert-line"/>Map all required (*) fields before importing.</div>}
                {requiredMapped&&<div style={{ fontSize:13,color:'#16a34a',display:'flex',alignItems:'center',gap:6 }}><i className="ri-check-double-line"/>All required fields mapped. Ready to import.</div>}
              </div>
              <button style={{ ...btnP,background:typeConfig.color,opacity:!requiredMapped||importing?.6:1 }}
                disabled={!requiredMapped||importing} onClick={handleImport}>
                {importing
                  ? <><i className="ri-loader-4-line"/>Importing…</>
                  : <><i className="ri-upload-cloud-line"/>Import {typeConfig.label}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step===3&&(
        <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)',marginBottom:20 }}>
          <div style={{ padding:'60px 24px',textAlign:'center' }}>
            <div style={{ fontSize:56 }}>✅</div>
            <div style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:18,marginTop:12,marginBottom:6 }}>Import Successful</div>
            <div style={{ fontSize:13,color:S,marginBottom:20 }}>{uploadedFile?.name} has been imported as {typeConfig.label}.</div>
            <button style={btnP} onClick={resetUpload}><i className="ri-upload-line"/>Import Another File</button>
          </div>
        </div>
      )}

      {/* Import History */}
      <div style={{ background:'#fff',borderRadius:12,border:`1px solid ${B}`,overflow:'hidden',boxShadow:'0 1px 4px rgba(0,0,0,.06)' }}>
        <div style={{ padding:'14px 20px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10 }}>
          <span style={{ fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:14 }}>Import History</span>
          <button style={btnP} onClick={()=>{ resetUpload(); window.scrollTo(0,0) }}><i className="ri-upload-line"/>Upload File</button>
        </div>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%',borderCollapse:'collapse' }}>
            <thead>
              <tr>{['File Name','Import Type','Uploaded By','Status','Date','Action'].map(h=><th key={h} style={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {history.map((row,i)=>{
                const cfg = IMPORT_TYPES[row.type]||IMPORT_TYPES.products
                return (
                  <tr key={i}>
                    <td style={TD}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:28,height:28,borderRadius:6,background:`${cfg.color}20`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                          <i className={cfg.icon} style={{ color:cfg.color,fontSize:14 }}/>
                        </div>
                        <span style={{ fontWeight:600 }}>{row.file}</span>
                      </div>
                    </td>
                    <td style={TD}><span style={{ background:'#f3f4f6',color:'#374151',borderRadius:20,padding:'2px 10px',fontSize:11,fontWeight:500 }}>{cfg.label}</span></td>
                    <td style={{ ...TD,color:S }}>{row.by}</td>
                    <td style={TD}>
                      <span style={{ ...STATUS_STYLE[row.status],borderRadius:50,padding:'3px 10px',fontSize:11,fontWeight:600,textTransform:'capitalize' }}>{row.status}</span>
                    </td>
                    <td style={{ ...TD,color:S,fontSize:12 }}>{row.date}</td>
                    <td style={TD}>
                      <div style={{ display:'flex',gap:4 }}>
                        <button style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#f9fafb',color:'#374151',cursor:'pointer' }}><i className="ri-eye-line"/></button>
                        <button onClick={()=>setHistory(p=>p.filter((_,idx)=>idx!==i))}
                          style={{ display:'flex',alignItems:'center',justifyContent:'center',width:30,height:30,borderRadius:6,border:`1px solid ${B}`,background:'#fff0f0',color:'#f06548',cursor:'pointer' }}><i className="ri-delete-bin-line"/></button>
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
