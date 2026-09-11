import { useState } from 'react'

const CATEGORIES = ['Allergy', 'Dietary Preference', 'Medical Condition', 'Religious', 'Lifestyle']

const INITIAL_RULES = [
  {
    id: 1, name: 'Lactose Intolerance', category: 'Medical Condition', priority: 'high',
    description: 'Excludes all dairy products and derivatives. Affects customers with lactase deficiency.',
    tags: ['dairy', 'milk', 'cheese', 'butter', 'cream', 'yoghurt', 'whey'],
    excludeCategories: ['Dairy Products', 'Cream-based Sauces'],
    affectedMeals: 8, active: true, customersTagged: 24,
  },
  {
    id: 2, name: 'Gluten-Free', category: 'Medical Condition', priority: 'high',
    description: 'Excludes wheat, barley, rye and all gluten-containing grains. Critical for celiac patients.',
    tags: ['wheat', 'barley', 'rye', 'bread', 'pasta', 'flour', 'starch'],
    excludeCategories: ['Bread & Pastries', 'Breaded Items', 'Wheat-Based Snacks'],
    affectedMeals: 6, active: true, customersTagged: 11,
  },
  {
    id: 3, name: 'Vegan', category: 'Dietary Preference', priority: 'medium',
    description: 'Excludes all animal products including meat, dairy, eggs, and honey.',
    tags: ['meat', 'dairy', 'eggs', 'honey', 'fish', 'chicken', 'beef', 'cream', 'butter'],
    excludeCategories: ['Meat & Poultry', 'Seafood', 'Dairy Products', 'Egg-Based Dishes'],
    affectedMeals: 15, active: true, customersTagged: 9,
  },
  {
    id: 4, name: 'Vegetarian', category: 'Dietary Preference', priority: 'medium',
    description: 'Excludes all meat, poultry, and fish. Dairy and eggs are permitted.',
    tags: ['meat', 'poultry', 'fish', 'seafood', 'chicken', 'beef', 'goat', 'turkey'],
    excludeCategories: ['Meat & Poultry', 'Seafood'],
    affectedMeals: 12, active: true, customersTagged: 17,
  },
  {
    id: 5, name: 'Low Carb / Keto', category: 'Medical Condition', priority: 'medium',
    description: 'Restricts high-carbohydrate foods. Suitable for diabetics, weight loss, and keto diet followers.',
    tags: ['rice', 'bread', 'potato', 'sugar', 'pasta', 'yam', 'plantain', 'starch'],
    excludeCategories: ['High-Carb Sides', 'Sweets & Desserts', 'Beverages (Sugary)'],
    affectedMeals: 18, active: true, customersTagged: 31,
  },
  {
    id: 6, name: 'Peanut / Nut Allergy', category: 'Allergy', priority: 'critical',
    description: 'Strict exclusion of all nuts and nut derivatives. Life-threatening reaction possible.',
    tags: ['peanut', 'groundnut', 'almond', 'cashew', 'walnut', 'nut oil', 'groundnut oil'],
    excludeCategories: ['Nut-Based Snacks', 'Groundnut Dishes'],
    affectedMeals: 5, active: true, customersTagged: 8,
  },
  {
    id: 7, name: 'Halal', category: 'Religious', priority: 'high',
    description: 'Only halal-certified meat allowed. Pork and alcohol strictly excluded.',
    tags: ['pork', 'alcohol', 'lard', 'gelatin', 'non-halal', 'wine'],
    excludeCategories: ['Pork Products', 'Alcohol-Infused Dishes'],
    affectedMeals: 3, active: true, customersTagged: 42,
  },
  {
    id: 8, name: 'Diabetic-Friendly', category: 'Medical Condition', priority: 'high',
    description: 'Low glycemic index diet. Controls blood sugar spikes for Type 1 and Type 2 diabetics.',
    tags: ['sugar', 'white rice', 'white bread', 'honey', 'syrup', 'sweets', 'fizzy drinks'],
    excludeCategories: ['Sweets & Desserts', 'Beverages (Sugary)', 'Refined Grains'],
    affectedMeals: 20, active: true, customersTagged: 19,
  },
  {
    id: 9, name: 'Pescatarian', category: 'Dietary Preference', priority: 'low',
    description: 'Avoids all meat and poultry but consumes fish and seafood.',
    tags: ['chicken', 'beef', 'goat', 'lamb', 'pork', 'turkey', 'meat'],
    excludeCategories: ['Meat & Poultry'],
    affectedMeals: 9, active: false, customersTagged: 4,
  },
  {
    id: 10, name: 'High-Protein', category: 'Lifestyle', priority: 'low',
    description: 'Prioritises high-protein options. Suitable for athletes, bodybuilders, and gym-goers.',
    tags: ['low-protein', 'processed', 'refined'],
    excludeCategories: ['Low-Protein Snacks'],
    affectedMeals: 10, active: true, customersTagged: 14,
  },
  {
    id: 11, name: 'Low Sodium', category: 'Medical Condition', priority: 'high',
    description: 'Limits salt and sodium intake. Essential for hypertension and kidney disease patients.',
    tags: ['salt', 'soy sauce', 'stock cubes', 'brine', 'processed meat', 'MSG'],
    excludeCategories: ['Processed & Cured Meats', 'Heavily Seasoned Dishes'],
    affectedMeals: 14, active: true, customersTagged: 7,
  },
]

const PRIORITY_CFG = {
  critical: { bg: '#fee2e2', color: '#991b1b', label: 'Critical' },
  high:     { bg: '#fef3c7', color: '#92400e', label: 'High' },
  medium:   { bg: '#dbeafe', color: '#1e40af', label: 'Medium' },
  low:      { bg: '#f0fdf4', color: '#166534', label: 'Low' },
}

const EMPTY_RULE = { name: '', category: 'Allergy', priority: 'medium', description: '', tagInput: '', catInput: '', tags: [], excludeCategories: [] }

/* ── Small modal backdrop ── */
function Modal({ show, onClose, title, children, size = '' }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: size === 'sm' ? 400 : 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background: '#1e293b', color: '#fff', padding: '16px 20px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="fw-semibold">{title}</span>
          <button className="btn-close btn-close-white btn-sm" onClick={onClose}></button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  )
}

export default function DietaryRules() {
  const [rules, setRules]           = useState(INITIAL_RULES)
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState('all')
  const [addModal, setAddModal]     = useState(false)
  const [editModal, setEditModal]   = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm]             = useState(EMPTY_RULE)
  const [tagInput, setTagInput]     = useState('')
  const [catInput, setCatInput]     = useState('')

  const toggle = id => setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))

  const filtered = rules.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'all' || r.category === catFilter
    return matchSearch && matchCat
  })

  const openEdit = rule => {
    setForm({ ...rule, tagInput: '', catInput: '' })
    setTagInput('')
    setCatInput('')
    setEditModal(rule.id)
  }

  const saveRule = () => {
    const newRule = {
      ...form,
      id: Date.now(),
      affectedMeals: 0,
      customersTagged: 0,
      active: true,
      tags: form.tags,
      excludeCategories: form.excludeCategories,
    }
    setRules(prev => [...prev, newRule])
    setAddModal(false)
    setForm(EMPTY_RULE)
    setTagInput('')
    setCatInput('')
  }

  const updateRule = () => {
    setRules(prev => prev.map(r => r.id === editModal ? { ...form } : r))
    setEditModal(null)
  }

  const deleteRule = () => {
    setRules(prev => prev.filter(r => r.id !== deleteModal))
    setDeleteModal(null)
  }

  const addTag = (target) => {
    const val = tagInput.trim().toLowerCase()
    if (!val) return
    if (target === 'form') setForm(f => ({ ...f, tags: [...new Set([...f.tags, val])] }))
    setTagInput('')
  }

  const addCat = () => {
    const val = catInput.trim()
    if (!val) return
    setForm(f => ({ ...f, excludeCategories: [...new Set([...f.excludeCategories, val])] }))
    setCatInput('')
  }

  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  const removeCat = (cat) => setForm(f => ({ ...f, excludeCategories: f.excludeCategories.filter(c => c !== cat) }))

  const totalActive = rules.filter(r => r.active).length
  const totalTagged = rules.reduce((s, r) => s + r.customersTagged, 0)
  const totalMeals  = Math.max(...rules.map(r => r.affectedMeals))

  /* ── Rule Form (shared by Add and Edit) ── */
  const RuleForm = () => (
    <div className="row g-3">
      <div className="col-12">
        <label className="form-label fw-medium">Rule Name <span className="text-danger">*</span></label>
        <input type="text" className="form-control" placeholder="e.g. Pregnancy-Safe" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-medium">Category</label>
        <select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="col-md-6">
        <label className="form-label fw-medium">Priority Level</label>
        <select className="form-select" value={form.priority} onChange={e => setForm(f => ({...f, priority: e.target.value}))}>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Description</label>
        <textarea className="form-control" rows={2} placeholder="Describe what this rule covers..." value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Ingredient Tags to Exclude</label>
        <div className="input-group mb-2">
          <input type="text" className="form-control" placeholder="Type ingredient and press Add" value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('form'))} />
          <button className="btn btn-outline-secondary" type="button" onClick={() => addTag('form')}>Add</button>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {form.tags.map(t => (
            <span key={t} className="badge d-inline-flex align-items-center gap-1" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 11 }}>
              {t}
              <button className="btn-close" style={{ fontSize: 8 }} onClick={() => removeTag(t)}></button>
            </span>
          ))}
        </div>
      </div>
      <div className="col-12">
        <label className="form-label fw-medium">Product Categories to Exclude</label>
        <div className="input-group mb-2">
          <input type="text" className="form-control" placeholder="Type category and press Add" value={catInput}
            onChange={e => setCatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCat())} />
          <button className="btn btn-outline-secondary" type="button" onClick={addCat}>Add</button>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {form.excludeCategories.map(c => (
            <span key={c} className="badge d-inline-flex align-items-center gap-1" style={{ background: '#fef3c7', color: '#92400e', fontSize: 11 }}>
              {c}
              <button className="btn-close" style={{ fontSize: 8 }} onClick={() => removeCat(c)}></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-shield-check-line me-2 text-success"></i>Dietary Rules
          </h4>
          <p className="text-muted mb-0">Configure ingredient exclusion rules for Chef Bems AI recommendations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_RULE); setTagInput(''); setCatInput(''); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Add Rule
        </button>
      </div>

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Rules',       value: rules.length,   icon: 'ri-list-check-2',        bg: '#e0f2fe', color: '#0369a1' },
          { label: 'Active Rules',      value: totalActive,    icon: 'ri-checkbox-circle-line', bg: '#dcfce7', color: '#15803d' },
          { label: 'Customers Tagged',  value: totalTagged,    icon: 'ri-user-heart-line',      bg: '#ede9fe', color: '#7c3aed' },
          { label: 'Critical Alerts',   value: rules.filter(r=>r.priority==='critical').length, icon: 'ri-alarm-warning-line', bg: '#fee2e2', color: '#dc2626' },
          { label: 'Meals Covered',     value: `${totalMeals}+`, icon: 'ri-restaurant-line',   bg: '#fef3c7', color: '#b45309' },
        ].map(k => (
          <div className="col" key={k.label}>
            <div className="card mb-0 border-0" style={{ background: k.bg }}>
              <div className="card-body py-3 px-3">
                <div className="d-flex align-items-center gap-2">
                  <i className={`${k.icon} fs-4`} style={{ color: k.color }}></i>
                  <div>
                    <div className="fw-bold fs-5 lh-1" style={{ color: k.color }}>{k.value}</div>
                    <div style={{ fontSize: 11, color: k.color, opacity: 0.85 }}>{k.label}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input type="text" className="form-control form-control-sm" style={{ maxWidth: 240 }} placeholder="Search rules..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="d-flex gap-1 flex-wrap">
              {['all', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => setCatFilter(c)}
                  className="btn btn-sm"
                  style={{ fontSize: 12, background: catFilter === c ? '#0ea5e9' : '#f1f5f9', color: catFilter === c ? '#fff' : '#475569', border: 'none' }}>
                  {c === 'all' ? 'All Categories' : c}
                </button>
              ))}
            </div>
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{filtered.length} rules</span>
          </div>
        </div>
      </div>

      {/* Rule Cards */}
      <div className="row g-4">
        {filtered.map(rule => {
          const pCfg = PRIORITY_CFG[rule.priority]
          return (
            <div className="col-md-6 col-xl-4" key={rule.id}>
              <div className="card mb-0 h-100" style={{ opacity: rule.active ? 1 : 0.65 }}>
                <div className="card-body d-flex flex-column">
                  {/* Title row */}
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h6 className="fw-semibold mb-0" style={{ fontSize: 14 }}>{rule.name}</h6>
                        <span className="badge rounded-pill" style={{ background: pCfg.bg, color: pCfg.color, fontSize: 10 }}>{pCfg.label}</span>
                      </div>
                      <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>{rule.category}</span>
                    </div>
                    <div className="form-check form-switch mb-0 ms-2">
                      <input className="form-check-input" type="checkbox" checked={rule.active} onChange={() => toggle(rule.id)} />
                    </div>
                  </div>

                  <p className="text-muted mb-3" style={{ fontSize: 12 }}>{rule.description}</p>

                  {/* Stats row */}
                  <div className="d-flex gap-3 mb-3" style={{ fontSize: 12 }}>
                    <span><i className="ri-restaurant-line me-1 text-muted"></i><strong>{rule.affectedMeals}</strong> meals</span>
                    <span><i className="ri-user-heart-line me-1 text-muted"></i><strong>{rule.customersTagged}</strong> customers</span>
                  </div>

                  {/* Tags */}
                  <div className="mb-2">
                    <p className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Excluded Ingredients
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {rule.tags.slice(0, 5).map(tag => (
                        <span key={tag} className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10 }}>{tag}</span>
                      ))}
                      {rule.tags.length > 5 && <span className="badge bg-light text-secondary" style={{ fontSize: 10 }}>+{rule.tags.length - 5} more</span>}
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Excluded Categories
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {rule.excludeCategories.map(cat => (
                        <span key={cat} className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: 10 }}>{cat}</span>
                      ))}
                    </div>
                  </div>

                  <div className="d-flex gap-2 mt-auto">
                    <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openEdit(rule)}>
                      <i className="ri-pencil-line me-1"></i>Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteModal(rule.id)}>
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add Rule Modal ── */}
      <Modal show={addModal} onClose={() => setAddModal(false)} title="Add Dietary Rule">
        <RuleForm />
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveRule} disabled={!form.name.trim()}>Save Rule</button>
        </div>
      </Modal>

      {/* ── Edit Rule Modal ── */}
      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Dietary Rule">
        <RuleForm />
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateRule}>Save Changes</button>
        </div>
      </Modal>

      {/* ── Delete Confirm Modal ── */}
      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Rule" size="sm">
        <div className="text-center py-2">
          <i className="ri-delete-bin-line fs-1 text-danger d-block mb-3"></i>
          <p className="fw-medium mb-1">Delete this dietary rule?</p>
          <p className="text-muted fs-sm mb-4">
            This will remove it from Chef Bems AI. Customers tagged with this rule will lose the filter.
          </p>
          <div className="d-flex gap-2 justify-content-center">
            <button className="btn btn-light px-4" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger px-4" onClick={deleteRule}>Delete</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
