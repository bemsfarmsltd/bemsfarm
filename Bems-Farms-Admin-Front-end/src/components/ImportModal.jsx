import { useState, useRef } from 'react'

// ── CSV parser (handles basic quoting) ────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const split = line => {
    const out = []; let cur = ''; let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') { inQ = !inQ }
      else if (c === ',' && !inQ) { out.push(cur.trim()); cur = '' }
      else { cur += c }
    }
    out.push(cur.trim())
    return out
  }
  const headers = split(lines[0])
  const rows = lines.slice(1).map(l => {
    const vals = split(l)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
    return obj
  })
  return { headers, rows }
}

// ── Mock URL fetch responses ──────────────────────────────────────────────────
function mockURLData(entityName) {
  const map = {
    Categories:      'Name,Status\nDairy Products,active\nFresh Produce,active\nBaked Goods,active\nSnacks & Confectionery,active',
    'Sub-Categories':'Name,Parent Category,Status\nWhole Milk,Dairy & Eggs,active\nFree-range Eggs,Dairy & Eggs,active\nLeafy Greens,Vegetables,active\nRoot Vegetables,Vegetables,active',
    Brands:          'Name,Status\nBems Farms,active\nGreen Valley,active\nFresh Direct,active\nAgro Kings,active',
    Products:        'Name,SKU,Category,Price,Cost,Unit,Stock,Status\nRice (5kg),GRN-RIC-002,Grains & Carbs,6500,4800,bag,50,active\nTomatoes,VEG-TOM-002,Vegetables,1200,800,kg,20,active',
  }
  return map[entityName] || `Name,Status\nSample Item,active`
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ImportModal({ entityName, fields, onImport, onClose }) {
  const [step, setStep]         = useState('source')   // source | mapping | review | done
  const [tab, setTab]           = useState('file')      // file | url | paste
  const [rawCSV, setRawCSV]     = useState('')
  const [fileName, setFileName] = useState('')
  const [urlVal, setUrlVal]     = useState('')
  const [pasteVal, setPasteVal] = useState('')
  const [isDrag, setIsDrag]     = useState(false)
  const [urlLoading, setUrlLoading] = useState(false)
  const [headers, setHeaders]   = useState([])
  const [mapping, setMapping]   = useState({})          // fieldKey → csvHeader
  const [results, setResults]   = useState(null)        // { valid, invalid }
  const [importMode, setImportMode] = useState('valid') // valid | all
  const fileRef = useRef()

  const UNMAP = '— skip —'

  // ── Step 1 helpers ───────────────────────────────────────────────────────
  function readFile(file) {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => setRawCSV(e.target.result)
    reader.readAsText(file)
  }

  async function fetchURL() {
    setUrlLoading(true)
    await new Promise(r => setTimeout(r, 900))   // simulate network
    const csv = mockURLData(entityName)
    setRawCSV(csv)
    setUrlLoading(false)
  }

  function continueFromSource() {
    const csv = tab === 'paste' ? pasteVal : rawCSV
    if (!csv.trim()) return
    const { headers: h } = parseCSV(csv)
    setHeaders(h)
    // Auto-map headers that match field keys / labels (case-insensitive)
    const auto = {}
    fields.forEach(f => {
      const hit = h.find(hdr =>
        hdr.toLowerCase() === f.key.toLowerCase() ||
        hdr.toLowerCase() === f.label.toLowerCase()
      )
      auto[f.key] = hit || UNMAP
    })
    setMapping(auto)
    setStep('mapping')
  }

  // ── Step 2 helpers ───────────────────────────────────────────────────────
  function validate() {
    const csv = tab === 'paste' ? pasteVal : rawCSV
    const { rows } = parseCSV(csv)
    const valid = [], invalid = []
    rows.forEach((row, i) => {
      const mapped = {}
      fields.forEach(f => {
        mapped[f.key] = mapping[f.key] && mapping[f.key] !== UNMAP ? row[mapping[f.key]] ?? '' : ''
      })
      const errors = []
      fields.forEach(f => {
        if (f.required && !mapped[f.key]?.trim()) errors.push(`${f.label} is required`)
        if (f.validate) { const e = f.validate(mapped[f.key]); if (e) errors.push(e) }
      })
      const target = errors.length > 0 ? invalid : valid
      target.push({ rowNum: i + 2, data: mapped, errors })
    })
    setResults({ valid, invalid })
    setStep('review')
  }

  function confirmImport() {
    const rows = importMode === 'all'
      ? [...results.valid, ...results.invalid].map(r => r.data)
      : results.valid.map(r => r.data)
    onImport(rows)
    setStep('done')
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const sourceReady = tab === 'paste' ? pasteVal.trim().length > 0
                    : tab === 'url'   ? rawCSV.trim().length > 0
                    : rawCSV.trim().length > 0

  const requiredMapped = fields.filter(f => f.required).every(f => mapping[f.key] && mapping[f.key] !== UNMAP)

  // ── Sample template rows for preview ─────────────────────────────────────
  const previewRows = rawCSV.trim() ? parseCSV(tab === 'paste' ? pasteVal : rawCSV).rows.slice(0, 3) : []

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" style={{ zIndex:1055 }}>
        <div className="modal-dialog modal-dialog-centered modal-xl">
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header" style={{ background:'#f8f9fa' }}>
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <i className="ri-upload-cloud-2-line fs-18 text-primary"></i>
                  <h6 className="modal-title mb-0 fw-bold">Import {entityName}</h6>
                </div>
                <div className="text-muted" style={{ fontSize:12 }}>
                  Upload a CSV, paste data, or pull from a URL — then map and review before importing.
                </div>
              </div>
              <button className="btn-close" onClick={onClose}></button>
            </div>

            {/* Step indicator */}
            <div className="px-4 pt-3 pb-0">
              <div className="d-flex align-items-center gap-0">
                {[
                  { key:'source',  label:'1. Source',      icon:'ri-upload-2-line'        },
                  { key:'mapping', label:'2. Map Columns', icon:'ri-git-branch-line'      },
                  { key:'review',  label:'3. Review',      icon:'ri-shield-check-line'    },
                  { key:'done',    label:'4. Done',        icon:'ri-checkbox-circle-line' },
                ].map((s, i) => {
                  const steps = ['source','mapping','review','done']
                  const idx   = steps.indexOf(step)
                  const sIdx  = steps.indexOf(s.key)
                  const done  = sIdx < idx
                  const active= sIdx === idx
                  return (
                    <div key={s.key} className="d-flex align-items-center" style={{ flex: i < 3 ? 1 : 'none' }}>
                      <div className="d-flex align-items-center gap-2 py-2 px-2" style={{
                        borderBottom: active ? '2px solid #405189' : done ? '2px solid #0ab39c' : '2px solid transparent',
                        flex: 1, whiteSpace:'nowrap'
                      }}>
                        <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width:28, height:28, fontSize:12, fontWeight:600,
                            background: active ? '#405189' : done ? '#0ab39c' : '#e9ecef',
                            color: active || done ? '#fff' : '#adb5bd' }}>
                          {done ? <i className="ri-check-line"></i> : <i className={s.icon}></i>}
                        </div>
                        <span style={{ fontSize:12, fontWeight: active ? 600 : 400,
                          color: active ? '#405189' : done ? '#0ab39c' : '#adb5bd' }}>
                          {s.label}
                        </span>
                      </div>
                      {i < 3 && <div style={{ width:24, height:1, background:'#dee2e6', flexShrink:0 }}></div>}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="modal-body" style={{ minHeight:340 }}>

              {/* ── STEP 1: SOURCE ─────────────────────────────────────────── */}
              {step === 'source' && (
                <div>
                  {/* Tabs */}
                  <div className="d-flex gap-2 mb-4">
                    {[
                      { id:'file', icon:'ri-file-upload-line',  label:'Upload File'   },
                      { id:'url',  icon:'ri-links-line',         label:'From URL'      },
                      { id:'paste',icon:'ri-clipboard-line',     label:'Paste CSV'     },
                    ].map(t => (
                      <button key={t.id}
                        className={`btn btn-sm d-flex align-items-center gap-1 ${tab === t.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => setTab(t.id)}>
                        <i className={t.icon}></i> {t.label}
                      </button>
                    ))}
                  </div>

                  {/* File upload */}
                  {tab === 'file' && (
                    <div>
                      <div
                        className="rounded-3 text-center py-5 px-4 cursor-pointer"
                        style={{
                          border: `2px dashed ${isDrag ? '#405189' : '#dee2e6'}`,
                          background: isDrag ? '#f0f3ff' : '#fafbfc',
                          transition: 'all .2s'
                        }}
                        onClick={() => fileRef.current.click()}
                        onDragOver={e => { e.preventDefault(); setIsDrag(true) }}
                        onDragLeave={() => setIsDrag(false)}
                        onDrop={e => { e.preventDefault(); setIsDrag(false); const f = e.dataTransfer.files[0]; if (f) readFile(f) }}>
                        <i className="ri-upload-cloud-2-line fs-1 text-muted d-block mb-2"></i>
                        {fileName
                          ? <><div className="fw-bold">{fileName}</div><div className="text-success mt-1"><i className="ri-checkbox-circle-line me-1"></i>File loaded</div></>
                          : <><div className="fw-medium mb-1">Drag & drop your CSV file here</div><div className="text-muted" style={{ fontSize:13 }}>or click to browse — CSV and Excel (.xlsx) supported</div></>
                        }
                      </div>
                      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="d-none"
                        onChange={e => { const f = e.target.files[0]; if (f) readFile(f) }} />
                      <div className="mt-3 p-3 rounded" style={{ background:'#f0f3ff', fontSize:13 }}>
                        <i className="ri-download-line text-primary me-1"></i>
                        <strong>Download template:</strong>
                        <span className="ms-1 text-muted">
                          Expected columns: {fields.map(f => f.label + (f.required ? '*' : '')).join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* URL */}
                  {tab === 'url' && (
                    <div>
                      <label className="form-label fw-medium">Data Source URL</label>
                      <div className="input-group mb-3">
                        <input className="form-control" placeholder="https://example.com/data.csv"
                          value={urlVal} onChange={e => setUrlVal(e.target.value)} />
                        <button className="btn btn-primary d-flex align-items-center gap-1" onClick={fetchURL} disabled={urlLoading || !urlVal.trim()}>
                          {urlLoading ? <><span className="spinner-border spinner-border-sm"></span> Fetching…</> : <><i className="ri-cloud-download-line"></i> Fetch</>}
                        </button>
                      </div>
                      {rawCSV && !urlLoading && (
                        <div className="p-3 rounded bg-success-subtle">
                          <i className="ri-checkbox-circle-line text-success me-1"></i>
                          <strong>{parseCSV(rawCSV).rows.length} rows</strong> fetched successfully.
                        </div>
                      )}
                      <div className="mt-3 text-muted" style={{ fontSize:12 }}>
                        <i className="ri-information-line me-1"></i>
                        The URL must return a plain CSV with headers. Authentication not supported.
                      </div>
                    </div>
                  )}

                  {/* Paste */}
                  {tab === 'paste' && (
                    <div>
                      <label className="form-label fw-medium">Paste CSV Data</label>
                      <textarea className="form-control font-monospace" rows="8"
                        placeholder={`Paste your CSV here. First row must be headers.\n\nExample:\n${fields.map(f=>f.label).join(',')}\nValue 1,active\nValue 2,active`}
                        value={pasteVal} onChange={e => setPasteVal(e.target.value)}
                        style={{ fontSize:12 }} />
                      {pasteVal.trim() && (() => {
                        const { rows } = parseCSV(pasteVal)
                        return <div className="mt-2 text-muted" style={{ fontSize:12 }}>
                          <i className="ri-table-line me-1"></i>{rows.length} data rows detected
                        </div>
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 2: MAP COLUMNS ───────────────────────────────────── */}
              {step === 'mapping' && (
                <div>
                  <div className="row g-4">
                    <div className="col-lg-6">
                      <h6 className="fw-semibold mb-3">Map CSV Columns → System Fields</h6>
                      <div className="p-3 rounded" style={{ background:'#f8f9fa', border:'1px solid #dee2e6' }}>
                        {fields.map(f => (
                          <div key={f.key} className="mb-3">
                            <label className="form-label fw-medium d-flex align-items-center gap-1" style={{ fontSize:13 }}>
                              {f.label}
                              {f.required && <span className="text-danger">*</span>}
                            </label>
                            <select className={`form-select form-select-sm ${f.required && (!mapping[f.key] || mapping[f.key] === UNMAP) ? 'border-warning' : ''}`}
                              value={mapping[f.key] || UNMAP}
                              onChange={e => setMapping(m => ({ ...m, [f.key]: e.target.value }))}>
                              <option value={UNMAP}>{UNMAP}</option>
                              {headers.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                            {f.required && (!mapping[f.key] || mapping[f.key] === UNMAP) && (
                              <div className="text-warning mt-1" style={{ fontSize:11 }}>
                                <i className="ri-alert-line me-1"></i>Required field — must be mapped
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="col-lg-6">
                      <h6 className="fw-semibold mb-3">Data Preview (first 3 rows)</h6>
                      {previewRows.length > 0 ? (
                        <div className="table-responsive" style={{ fontSize:12 }}>
                          <table className="table table-sm table-bordered mb-0">
                            <thead className="table-light">
                              <tr>{headers.map(h => <th key={h} className="fw-medium">{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {previewRows.map((row, i) => (
                                <tr key={i}>{headers.map(h => <td key={h}>{row[h]}</td>)}</tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-muted text-center py-4" style={{ fontSize:13 }}>No preview available</div>
                      )}
                      <div className="mt-3 p-3 rounded" style={{ background:'#fff8ec', border:'1px solid #f7b84b33', fontSize:12 }}>
                        <i className="ri-information-line text-warning me-1"></i>
                        <strong>Auto-generated fields</strong> (like Code) will be created from the imported name — you don't need to map them.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── STEP 3: REVIEW ───────────────────────────────────────── */}
              {step === 'review' && results && (
                <div>
                  {/* Summary cards */}
                  <div className="row g-3 mb-4">
                    {[
                      { label:'Total Rows',    value: results.valid.length + results.invalid.length, color:'#405189', icon:'ri-table-line'             },
                      { label:'Valid',         value: results.valid.length,    color:'#0ab39c', icon:'ri-checkbox-circle-line'   },
                      { label:'Invalid',       value: results.invalid.length,  color:'#f06548', icon:'ri-error-warning-line'     },
                      { label:'Will Import',   value: importMode === 'valid' ? results.valid.length : results.valid.length + results.invalid.length, color:'#299cdb', icon:'ri-upload-cloud-line' },
                    ].map(c => (
                      <div className="col-6 col-md-3" key={c.label}>
                        <div className="card mb-0" style={{ borderLeft:`3px solid ${c.color}` }}>
                          <div className="card-body d-flex align-items-center gap-3 py-3">
                            <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                              style={{ width:38, height:38, background:`${c.color}1a` }}>
                              <i className={`${c.icon} fs-18`} style={{ color:c.color }}></i>
                            </div>
                            <div>
                              <div className="fw-bold fs-18" style={{ color:c.color }}>{c.value}</div>
                              <div className="text-muted" style={{ fontSize:11 }}>{c.label}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Import mode toggle */}
                  {results.invalid.length > 0 && (
                    <div className="p-3 rounded mb-4 d-flex align-items-center gap-3 flex-wrap"
                      style={{ background:'#fff8ec', border:'1px solid #f7b84b55' }}>
                      <i className="ri-alert-line text-warning fs-18"></i>
                      <div className="flex-grow-1">
                        <div className="fw-medium" style={{ fontSize:13 }}>{results.invalid.length} row{results.invalid.length > 1 ? 's have' : ' has'} validation errors</div>
                        <div className="text-muted" style={{ fontSize:12 }}>Choose how to handle them:</div>
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <button className={`btn btn-sm ${importMode === 'valid' ? 'btn-success' : 'btn-outline-success'}`}
                          onClick={() => setImportMode('valid')}>
                          <i className="ri-checkbox-circle-line me-1"></i>Import valid only ({results.valid.length})
                        </button>
                        <button className={`btn btn-sm ${importMode === 'all' ? 'btn-warning' : 'btn-outline-warning'}`}
                          onClick={() => setImportMode('all')}>
                          <i className="ri-upload-cloud-line me-1"></i>Import all anyway
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Row table */}
                  <div className="table-responsive" style={{ maxHeight:280 }}>
                    <table className="table table-sm align-middle mb-0" style={{ fontSize:13 }}>
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ width:50 }}>#</th>
                          {fields.map(f => <th key={f.key}>{f.label}</th>)}
                          <th style={{ width:100 }}>Status</th>
                          <th>Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...results.valid, ...results.invalid].sort((a,b) => a.rowNum - b.rowNum).map(r => (
                          <tr key={r.rowNum} style={{ borderLeft: r.errors?.length > 0 ? '3px solid #f06548' : '3px solid #0ab39c' }}>
                            <td className="text-muted">{r.rowNum}</td>
                            {fields.map(f => (
                              <td key={f.key} className={!r.data[f.key] && f.required ? 'text-danger fw-medium' : ''}>
                                {r.data[f.key] || <span className="text-muted">—</span>}
                              </td>
                            ))}
                            <td>
                              {r.errors?.length > 0
                                ? <span className="badge bg-danger-subtle text-danger"><i className="ri-close-circle-line me-1"></i>Invalid</span>
                                : <span className="badge bg-success-subtle text-success"><i className="ri-checkbox-circle-line me-1"></i>Valid</span>
                              }
                            </td>
                            <td className="text-danger" style={{ fontSize:11 }}>
                              {r.errors?.join(' · ') || ''}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── STEP 4: DONE ─────────────────────────────────────────── */}
              {step === 'done' && (
                <div className="text-center py-5">
                  <div className="d-flex justify-content-center mb-4">
                    <div className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ width:72, height:72, background:'#0ab39c22', border:'3px solid #0ab39c' }}>
                      <i className="ri-checkbox-circle-fill text-success fs-1"></i>
                    </div>
                  </div>
                  <h5 className="fw-bold mb-2">Import Complete!</h5>
                  <p className="text-muted mb-4">
                    {importMode === 'valid' ? results?.valid.length : (results?.valid.length + results?.invalid.length)} {entityName.toLowerCase()} have been imported successfully.
                  </p>
                  <div className="d-flex justify-content-center gap-2">
                    <button className="btn btn-light" onClick={onClose}>Close</button>
                    <button className="btn btn-primary" onClick={() => {
                      setStep('source'); setRawCSV(''); setFileName(''); setUrlVal(''); setPasteVal(''); setResults(null)
                    }}>
                      <i className="ri-upload-cloud-2-line me-1"></i>Import More
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer nav */}
            {step !== 'done' && (
              <div className="modal-footer">
                {step !== 'source' && (
                  <button className="btn btn-light me-auto" onClick={() => setStep(step === 'review' ? 'mapping' : 'source')}>
                    <i className="ri-arrow-left-line me-1"></i>Back
                  </button>
                )}
                <button className="btn btn-light" onClick={onClose}>Cancel</button>
                {step === 'source' && (
                  <button className="btn btn-primary d-flex align-items-center gap-1" onClick={continueFromSource} disabled={!sourceReady}>
                    Map Columns <i className="ri-arrow-right-line"></i>
                  </button>
                )}
                {step === 'mapping' && (
                  <button className="btn btn-primary d-flex align-items-center gap-1" onClick={validate} disabled={!requiredMapped}>
                    Validate Data <i className="ri-arrow-right-line"></i>
                  </button>
                )}
                {step === 'review' && (
                  <button className="btn btn-success d-flex align-items-center gap-1"
                    onClick={confirmImport}
                    disabled={importMode === 'valid' && results?.valid.length === 0}>
                    <i className="ri-upload-cloud-line"></i>
                    Confirm Import ({importMode === 'valid' ? results?.valid.length : (results?.valid.length + results?.invalid.length)} rows)
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" style={{ zIndex:1054 }} onClick={onClose}></div>
    </>
  )
}
