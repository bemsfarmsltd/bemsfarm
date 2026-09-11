import { useState } from 'react'

/* ── Data ── */
const DIET_FLAGS = ['Halal','Vegan','Vegetarian','Gluten-Free','Dairy-Free','Low-Carb','High-Protein','Nut-Free','Diabetic-Friendly','Low-Sodium']

const INITIAL_MEALS = [
  {
    id: 'MEAL-001', name: 'Jollof Rice', category: 'Rice Dishes',
    dietary: ['Halal', 'Dairy-Free'],
    ingredients: ['Long Grain Rice', 'Tomato Paste', 'Bell Peppers', 'Onions', 'Seasoning Cubes', 'Palm Oil', 'Chicken Stock'],
    pairings: ['Fried Chicken', 'Moin Moin', 'Fried Plantain', 'Coleslaw'],
    allergens: ['None'],
    trainStatus: 'trained', lastTrained: '2026-06-20', aiConfidence: 97,
    protein: 12, carbs: 58, calories: 410,
  },
  {
    id: 'MEAL-002', name: 'Egusi Soup', category: 'Soups',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free'],
    ingredients: ['Melon Seeds', 'Palm Oil', 'Assorted Meat', 'Spinach', 'Crayfish', 'Onions', 'Pepper'],
    pairings: ['Eba', 'Pounded Yam', 'Semo', 'Fufu'],
    allergens: ['Shellfish (Crayfish)'],
    trainStatus: 'trained', lastTrained: '2026-06-18', aiConfidence: 94,
    protein: 28, carbs: 10, calories: 350,
  },
  {
    id: 'MEAL-003', name: 'Vegetable Stir-fry', category: 'Healthy',
    dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'Diabetic-Friendly'],
    ingredients: ['Broccoli', 'Carrots', 'Bell Peppers', 'Olive Oil', 'Garlic', 'Ginger', 'Snow Peas'],
    pairings: ['Brown Rice', 'Ofada Rice', 'Grilled Tilapia', 'Quinoa'],
    allergens: ['None'],
    trainStatus: 'trained', lastTrained: '2026-06-22', aiConfidence: 99,
    protein: 8, carbs: 14, calories: 180,
  },
  {
    id: 'MEAL-004', name: 'Grilled Tilapia', category: 'Seafood',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'High-Protein', 'Diabetic-Friendly'],
    ingredients: ['Fresh Tilapia', 'Lemon', 'Garlic', 'Mixed Herbs', 'Olive Oil', 'Pepper', 'Salt'],
    pairings: ['Garden Salad', 'Fried Plantain', 'Jollof Rice', 'Vegetable Stir-fry'],
    allergens: ['Fish'],
    trainStatus: 'trained', lastTrained: '2026-06-15', aiConfidence: 98,
    protein: 34, carbs: 2, calories: 210,
  },
  {
    id: 'MEAL-005', name: 'Moin Moin', category: 'Snacks & Sides',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free', 'Vegetarian', 'Diabetic-Friendly'],
    ingredients: ['Black-Eyed Peas', 'Bell Peppers', 'Onions', 'Crayfish', 'Egg', 'Fish', 'Palm Oil'],
    pairings: ['Jollof Rice', 'Akara', 'Pap', 'Custard'],
    allergens: ['Eggs', 'Fish', 'Shellfish'],
    trainStatus: 'trained', lastTrained: '2026-06-21', aiConfidence: 96,
    protein: 14, carbs: 22, calories: 240,
  },
  {
    id: 'MEAL-006', name: 'Pepper Soup (Catfish)', category: 'Soups',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'High-Protein', 'Diabetic-Friendly', 'Low-Sodium'],
    ingredients: ['Fresh Catfish', 'Pepper Soup Spice', 'Utazi Leaves', 'Ehuru', 'Uziza Leaves', 'Onions'],
    pairings: ['Agidi', 'White Rice', 'Boiled Yam', 'Unripe Plantain'],
    allergens: ['Fish'],
    trainStatus: 'trained', lastTrained: '2026-06-19', aiConfidence: 95,
    protein: 30, carbs: 4, calories: 190,
  },
  {
    id: 'MEAL-007', name: 'Beans Porridge', category: 'Legumes',
    dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'High-Protein', 'Diabetic-Friendly'],
    ingredients: ['Brown Beans', 'Palm Oil', 'Onions', 'Crayfish', 'Pepper', 'Smoked Fish'],
    pairings: ['Fried Plantain', 'Garri', 'Boiled Yam', 'Pap'],
    allergens: ['Shellfish', 'Fish'],
    trainStatus: 'trained', lastTrained: '2026-06-17', aiConfidence: 93,
    protein: 18, carbs: 38, calories: 290,
  },
  {
    id: 'MEAL-008', name: 'Pounded Yam', category: 'Swallows',
    dietary: ['Halal', 'Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free'],
    ingredients: ['Yam', 'Water'],
    pairings: ['Egusi Soup', 'Bitterleaf Soup', 'Okra Soup', 'Vegetable Soup'],
    allergens: ['None'],
    trainStatus: 'trained', lastTrained: '2026-06-10', aiConfidence: 99,
    protein: 4, carbs: 52, calories: 230,
  },
  {
    id: 'MEAL-009', name: 'Ofada Rice & Stew', category: 'Rice Dishes',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free', 'Diabetic-Friendly'],
    ingredients: ['Ofada Rice', 'Tatashe', 'Scotch Bonnet', 'Assorted Meat', 'Palm Oil', 'Locust Beans', 'Onions'],
    pairings: ['Boiled Egg', 'Ponmo', 'Fried Fish', 'Garden Egg Sauce'],
    allergens: ['None'],
    trainStatus: 'needs-update', lastTrained: '2026-05-30', aiConfidence: 81,
    protein: 16, carbs: 45, calories: 380,
  },
  {
    id: 'MEAL-010', name: 'Suya (Beef)', category: 'Grills & BBQ',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free', 'High-Protein', 'Low-Carb'],
    ingredients: ['Beef', 'Suya Spice (Yaji)', 'Groundnut Powder', 'Onions', 'Tomatoes', 'Cabbage'],
    pairings: ['Fried Yam', 'Boiled Corn', 'Chapman Drink', 'Zobo'],
    allergens: ['Peanuts (Groundnut)'],
    trainStatus: 'trained', lastTrained: '2026-06-14', aiConfidence: 91,
    protein: 38, carbs: 6, calories: 280,
  },
  {
    id: 'MEAL-011', name: 'Akara (Bean Cakes)', category: 'Snacks & Sides',
    dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'High-Protein'],
    ingredients: ['Black-Eyed Peas', 'Onions', 'Bell Peppers', 'Scotch Bonnet', 'Palm Oil'],
    pairings: ['Pap', 'Custard', 'Bread', 'Moin Moin'],
    allergens: ['None'],
    trainStatus: 'trained', lastTrained: '2026-06-16', aiConfidence: 97,
    protein: 12, carbs: 20, calories: 210,
  },
  {
    id: 'MEAL-012', name: 'Bitterleaf Soup', category: 'Soups',
    dietary: ['Halal', 'Gluten-Free', 'Dairy-Free'],
    ingredients: ['Bitterleaf', 'Cocoyam (Ede)', 'Assorted Meat', 'Stockfish', 'Palm Oil', 'Crayfish', 'Ogiri'],
    pairings: ['Pounded Yam', 'Eba', 'Semo', 'Fufu'],
    allergens: ['Shellfish', 'Fish'],
    trainStatus: 'needs-update', lastTrained: '2026-05-25', aiConfidence: 76,
    protein: 24, carbs: 14, calories: 310,
  },
  {
    id: 'MEAL-013', name: 'Garden Salad', category: 'Healthy',
    dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Low-Carb', 'High-Protein', 'Diabetic-Friendly', 'Low-Sodium'],
    ingredients: ['Lettuce', 'Tomatoes', 'Cucumber', 'Carrots', 'Corn', 'Olives', 'Lemon Dressing'],
    pairings: ['Grilled Tilapia', 'Grilled Chicken', 'Boiled Eggs', 'Ofada Rice'],
    allergens: ['None'],
    trainStatus: 'trained', lastTrained: '2026-06-23', aiConfidence: 100,
    protein: 6, carbs: 10, calories: 120,
  },
  {
    id: 'MEAL-014', name: 'Fried Plantain (Dodo)', category: 'Snacks & Sides',
    dietary: ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free', 'Halal'],
    ingredients: ['Ripe Plantain', 'Vegetable Oil', 'Salt'],
    pairings: ['Jollof Rice', 'Beans Porridge', 'Fried Egg', 'Stew'],
    allergens: ['None'],
    trainStatus: 'trained', lastTrained: '2026-06-11', aiConfidence: 99,
    protein: 2, carbs: 40, calories: 220,
  },
]

const TRAIN_CFG = {
  trained:      { bg: '#dcfce7', color: '#15803d', label: 'Trained', icon: 'ri-brain-line' },
  'needs-update': { bg: '#fef3c7', color: '#b45309', label: 'Needs Update', icon: 'ri-refresh-line' },
  untrained:    { bg: '#fee2e2', color: '#dc2626', label: 'Untrained', icon: 'ri-close-circle-line' },
}

const DIET_COLORS = {
  'Halal': ['#dbeafe','#1e40af'], 'Vegan': ['#dcfce7','#14532d'], 'Vegetarian': ['#d1fae5','#065f46'],
  'Gluten-Free': ['#fef9c3','#713f12'], 'Dairy-Free': ['#ede9fe','#5b21b6'], 'Low-Carb': ['#fce7f3','#9d174d'],
  'High-Protein': ['#ffedd5','#9a3412'], 'Nut-Free': ['#f0fdf4','#166534'], 'Diabetic-Friendly': ['#e0f2fe','#0c4a6e'],
  'Low-Sodium': ['#f1f5f9','#1e293b'],
}

/* ── Modal ── */
function Modal({ show, onClose, title, children, size = '' }) {
  if (!show) return null
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={onClose}>
      <div style={{ background:'#fff', borderRadius:12, width:'100%', maxWidth: size==='lg' ? 720 : 600, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ background:'#1e293b', color:'#fff', padding:'16px 20px', borderRadius:'12px 12px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span className="fw-semibold">{title}</span>
          <button className="btn-close btn-close-white btn-sm" onClick={onClose}></button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  )
}

const EMPTY_MEAL = { name:'', category:'Rice Dishes', dietary:[], ingredients:[], pairings:[], allergens:[], protein:'', carbs:'', calories:'', trainStatus:'untrained', aiConfidence:0, lastTrained:'' }

export default function MealAssociations() {
  const [meals, setMeals]           = useState(INITIAL_MEALS)
  const [search, setSearch]         = useState('')
  const [catFilter, setCatFilter]   = useState('all')
  const [dietFilter, setDietFilter] = useState('all')
  const [viewMeal, setViewMeal]     = useState(null)
  const [addModal, setAddModal]     = useState(false)
  const [editModal, setEditModal]   = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm]             = useState(EMPTY_MEAL)
  const [ingInput, setIngInput]     = useState('')
  const [pairInput, setPairInput]   = useState('')
  const [trainingId, setTrainingId] = useState(null)

  const categories = [...new Set(meals.map(m => m.category))]

  const filtered = meals.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase())
    const matchCat  = catFilter === 'all' || m.category === catFilter
    const matchDiet = dietFilter === 'all' || m.dietary.includes(dietFilter)
    return matchSearch && matchCat && matchDiet
  })

  const kpi = {
    total:   meals.length,
    trained: meals.filter(m => m.trainStatus === 'trained').length,
    needs:   meals.filter(m => m.trainStatus === 'needs-update').length,
    ingredients: [...new Set(meals.flatMap(m => m.ingredients))].length,
    pairings:    [...new Set(meals.flatMap(m => m.pairings))].length,
  }

  const retrain = (id) => {
    setTrainingId(id)
    setTimeout(() => {
      setMeals(prev => prev.map(m => m.id === id ? { ...m, trainStatus: 'trained', aiConfidence: Math.floor(Math.random()*6)+94, lastTrained: new Date().toISOString().slice(0,10) } : m))
      setTrainingId(null)
    }, 1800)
  }

  const addIng   = () => { const v=ingInput.trim(); if(!v) return; setForm(f=>({...f, ingredients:[...new Set([...f.ingredients,v])]})); setIngInput('') }
  const addPair  = () => { const v=pairInput.trim(); if(!v) return; setForm(f=>({...f, pairings:[...new Set([...f.pairings,v])]})); setPairInput('') }
  const removeIng  = i => setForm(f=>({...f, ingredients: f.ingredients.filter((_,ix)=>ix!==i)}))
  const removePair = i => setForm(f=>({...f, pairings: f.pairings.filter((_,ix)=>ix!==i)}))
  const toggleDiet = d => setForm(f=>({ ...f, dietary: f.dietary.includes(d) ? f.dietary.filter(x=>x!==d) : [...f.dietary, d] }))

  const saveMeal = () => {
    const newMeal = { ...form, id: `MEAL-${String(meals.length+1).padStart(3,'0')}`, trainStatus: 'untrained', aiConfidence: 0, lastTrained: '' }
    setMeals(prev => [...prev, newMeal])
    setAddModal(false)
    setForm(EMPTY_MEAL); setIngInput(''); setPairInput('')
  }

  const updateMeal = () => {
    setMeals(prev => prev.map(m => m.id === editModal ? { ...form } : m))
    setEditModal(null)
  }

  const deleteMeal = () => {
    setMeals(prev => prev.filter(m => m.id !== deleteModal))
    setDeleteModal(null)
  }

  const openEdit = m => { setForm({...m}); setIngInput(''); setPairInput(''); setEditModal(m.id) }

  /* ── Meal Form ── */
  const MealForm = () => (
    <div className="row g-3">
      <div className="col-md-8">
        <label className="form-label fw-medium">Meal Name <span className="text-danger">*</span></label>
        <input type="text" className="form-control" placeholder="e.g. Okra Soup" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">Category</label>
        <select className="form-select" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
          {[...categories, 'Other'].map(c=><option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Dietary Flags */}
      <div className="col-12">
        <label className="form-label fw-medium">Dietary Flags</label>
        <div className="d-flex flex-wrap gap-2">
          {DIET_FLAGS.map(d => {
            const active = form.dietary.includes(d)
            const [bg, col] = DIET_COLORS[d] || ['#f1f5f9','#475569']
            return (
              <button key={d} type="button" onClick={()=>toggleDiet(d)}
                className="btn btn-sm"
                style={{ fontSize:11, border: `1.5px solid ${active ? col : '#e2e8f0'}`, background: active ? bg : '#fff', color: active ? col : '#64748b' }}>
                {d}
              </button>
            )
          })}
        </div>
      </div>

      {/* Ingredients */}
      <div className="col-12">
        <label className="form-label fw-medium">Ingredients</label>
        <div className="input-group mb-2">
          <input type="text" className="form-control" placeholder="Type ingredient and press Add" value={ingInput}
            onChange={e=>setIngInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addIng())} />
          <button className="btn btn-outline-secondary" type="button" onClick={addIng}>Add</button>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {form.ingredients.map((ing,i)=>(
            <span key={i} className="badge d-inline-flex align-items-center gap-1" style={{background:'#dcfce7',color:'#15803d',fontSize:11}}>
              {ing}<button className="btn-close" style={{fontSize:8}} onClick={()=>removeIng(i)}></button>
            </span>
          ))}
        </div>
      </div>

      {/* AI Pairings */}
      <div className="col-12">
        <label className="form-label fw-medium">AI Pairing Suggestions</label>
        <div className="input-group mb-2">
          <input type="text" className="form-control" placeholder="Add a pairing suggestion" value={pairInput}
            onChange={e=>setPairInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addPair())} />
          <button className="btn btn-outline-secondary" type="button" onClick={addPair}>Add</button>
        </div>
        <div className="d-flex flex-wrap gap-1">
          {form.pairings.map((p,i)=>(
            <span key={i} className="badge d-inline-flex align-items-center gap-1" style={{background:'#dbeafe',color:'#1e40af',fontSize:11}}>
              {p}<button className="btn-close" style={{fontSize:8}} onClick={()=>removePair(i)}></button>
            </span>
          ))}
        </div>
      </div>

      {/* Nutrition */}
      <div className="col-4">
        <label className="form-label fw-medium">Protein (g)</label>
        <input type="number" className="form-control" value={form.protein} onChange={e=>setForm(f=>({...f,protein:e.target.value}))} />
      </div>
      <div className="col-4">
        <label className="form-label fw-medium">Carbs (g)</label>
        <input type="number" className="form-control" value={form.carbs} onChange={e=>setForm(f=>({...f,carbs:e.target.value}))} />
      </div>
      <div className="col-4">
        <label className="form-label fw-medium">Calories (kcal)</label>
        <input type="number" className="form-control" value={form.calories} onChange={e=>setForm(f=>({...f,calories:e.target.value}))} />
      </div>
    </div>
  )

  /* ── View Detail Modal Body ── */
  const DetailView = ({ meal }) => {
    if (!meal) return null
    const tCfg = TRAIN_CFG[meal.trainStatus]
    return (
      <div>
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div>
            <h5 className="fw-bold mb-1">{meal.name}</h5>
            <span className="text-muted" style={{fontSize:13}}>{meal.id} • {meal.category}</span>
          </div>
          <div className="text-end">
            <span className="badge rounded-pill px-3 py-2" style={{background:tCfg.bg,color:tCfg.color,fontSize:12}}>
              <i className={`${tCfg.icon} me-1`}></i>{tCfg.label}
            </span>
            {meal.trainStatus==='trained' && (
              <div className="mt-1" style={{fontSize:11,color:'#64748b'}}>
                AI Confidence: <strong style={{color:meal.aiConfidence>=90?'#15803d':'#b45309'}}>{meal.aiConfidence}%</strong>
              </div>
            )}
          </div>
        </div>

        {/* Nutrition row */}
        <div className="row g-3 mb-4">
          {[
            {label:'Protein',value:`${meal.protein}g`,color:'#7c3aed'},
            {label:'Carbs',value:`${meal.carbs}g`,color:'#b45309'},
            {label:'Calories',value:`${meal.calories} kcal`,color:'#dc2626'},
          ].map(n=>(
            <div className="col-4" key={n.label}>
              <div className="rounded p-2 text-center" style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>
                <div className="fw-bold" style={{color:n.color,fontSize:16}}>{n.value}</div>
                <div style={{fontSize:11,color:'#64748b'}}>{n.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Dietary Flags */}
        <div className="mb-4">
          <p className="fw-semibold mb-2" style={{fontSize:12,textTransform:'uppercase',letterSpacing:'0.05em',color:'#94a3b8'}}>Dietary Flags</p>
          <div className="d-flex flex-wrap gap-1">
            {meal.dietary.map(d=>{
              const [bg,col]=DIET_COLORS[d]||['#f1f5f9','#475569']
              return <span key={d} className="badge rounded-pill" style={{background:bg,color:col,fontSize:11}}>{d}</span>
            })}
          </div>
        </div>

        <div className="row g-4">
          {/* Ingredients */}
          <div className="col-md-6">
            <p className="fw-semibold mb-2" style={{fontSize:12,textTransform:'uppercase',letterSpacing:'0.05em',color:'#94a3b8'}}>
              <i className="ri-leaf-line me-1"></i>Ingredients ({meal.ingredients.length})
            </p>
            <div className="d-flex flex-wrap gap-1">
              {meal.ingredients.map(ing=>(
                <span key={ing} className="badge" style={{background:'#dcfce7',color:'#15803d',fontSize:11}}>{ing}</span>
              ))}
            </div>
          </div>

          {/* AI Pairings */}
          <div className="col-md-6">
            <p className="fw-semibold mb-2" style={{fontSize:12,textTransform:'uppercase',letterSpacing:'0.05em',color:'#94a3b8'}}>
              <i className="ri-robot-line me-1"></i>AI Pairings ({meal.pairings.length})
            </p>
            <div className="d-flex flex-wrap gap-1">
              {meal.pairings.map(p=>(
                <span key={p} className="badge" style={{background:'#dbeafe',color:'#1e40af',fontSize:11}}>{p}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Allergens */}
        <div className="mt-4 p-3 rounded" style={{background:'#fff7ed',border:'1px solid #fed7aa'}}>
          <p className="fw-semibold mb-1" style={{fontSize:12,color:'#9a3412'}}>
            <i className="ri-alert-line me-1"></i>Allergen Information
          </p>
          <div className="d-flex gap-1 flex-wrap">
            {meal.allergens.map(a=>(
              <span key={a} className="badge" style={{background:'#ffedd5',color:'#9a3412',fontSize:11}}>{a}</span>
            ))}
          </div>
        </div>

        {meal.lastTrained && (
          <p className="text-muted mt-3 mb-0" style={{fontSize:11}}>
            <i className="ri-brain-line me-1"></i>Last trained: {meal.lastTrained}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-links-line me-2 text-success"></i>Meal Associations
          </h4>
          <p className="text-muted mb-0">Map meals to ingredients, dietary flags, and AI pairing recommendations.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_MEAL); setIngInput(''); setPairInput(''); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Add Meal
        </button>
      </div>

      {/* KPI Strip */}
      <div className="row g-3 mb-4">
        {[
          { label: 'Total Meals',   value: kpi.total,        icon: 'ri-restaurant-line',        bg: '#e0f2fe', color: '#0369a1' },
          { label: 'AI Trained',    value: kpi.trained,      icon: 'ri-brain-line',             bg: '#dcfce7', color: '#15803d' },
          { label: 'Needs Update',  value: kpi.needs,        icon: 'ri-refresh-line',           bg: '#fef3c7', color: '#b45309' },
          { label: 'Ingredients',   value: kpi.ingredients,  icon: 'ri-leaf-line',              bg: '#ede9fe', color: '#7c3aed' },
          { label: 'AI Pairings',   value: kpi.pairings,     icon: 'ri-links-line',             bg: '#fce7f3', color: '#9d174d' },
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
            <input type="text" className="form-control form-control-sm" style={{ maxWidth: 220 }}
              placeholder="Search meals..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-select form-select-sm" style={{ maxWidth: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c}>{c}</option>)}
            </select>
            <select className="form-select form-select-sm" style={{ maxWidth: 180 }} value={dietFilter} onChange={e => setDietFilter(e.target.value)}>
              <option value="all">All Dietary Flags</option>
              {DIET_FLAGS.map(d => <option key={d}>{d}</option>)}
            </select>
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{filtered.length} meals</span>
          </div>
        </div>
      </div>

      {/* Needs-update banner */}
      {kpi.needs > 0 && (
        <div className="alert d-flex align-items-center gap-2 mb-4" style={{ background:'#fef3c7', border:'1px solid #fde68a', color:'#92400e' }}>
          <i className="ri-refresh-line fs-5"></i>
          <div>
            <strong>{kpi.needs} meal{kpi.needs>1?'s':''}</strong> need AI re-training due to recipe or ingredient changes.
          </div>
        </div>
      )}

      {/* Meal Cards */}
      <div className="row g-4">
        {filtered.map(meal => {
          const tCfg = TRAIN_CFG[meal.trainStatus]
          const isTraining = trainingId === meal.id
          return (
            <div className="col-md-6 col-xl-4" key={meal.id}>
              <div className="card mb-0 h-100">
                <div className="card-body d-flex flex-column">
                  {/* Header */}
                  <div className="d-flex align-items-start justify-content-between mb-2">
                    <div>
                      <h6 className="fw-semibold mb-0" style={{ fontSize: 14 }}>{meal.name}</h6>
                      <span className="text-muted" style={{ fontSize: 11 }}>{meal.id} • {meal.category}</span>
                    </div>
                    <span className="badge rounded-pill flex-shrink-0" style={{ background: tCfg.bg, color: tCfg.color, fontSize: 10 }}>
                      <i className={`${tCfg.icon} me-1`}></i>{tCfg.label}
                    </span>
                  </div>

                  {/* AI confidence bar */}
                  {meal.trainStatus === 'trained' && (
                    <div className="mb-2">
                      <div className="d-flex justify-content-between mb-1" style={{ fontSize: 10, color: '#64748b' }}>
                        <span>AI Confidence</span>
                        <span className="fw-semibold">{meal.aiConfidence}%</span>
                      </div>
                      <div className="progress" style={{ height: 4 }}>
                        <div className="progress-bar bg-success" style={{ width: `${meal.aiConfidence}%` }}></div>
                      </div>
                    </div>
                  )}

                  {/* Nutrition pills */}
                  <div className="d-flex gap-2 mb-3">
                    <span className="badge" style={{ background: '#ede9fe', color: '#5b21b6', fontSize: 10 }}>{meal.protein}g protein</span>
                    <span className="badge" style={{ background: '#fef3c7', color: '#92400e', fontSize: 10 }}>{meal.carbs}g carbs</span>
                    <span className="badge" style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10 }}>{meal.calories} kcal</span>
                  </div>

                  {/* Dietary flags */}
                  <div className="mb-2">
                    <p className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dietary Flags</p>
                    <div className="d-flex flex-wrap gap-1">
                      {meal.dietary.slice(0,4).map(d => {
                        const [bg,col] = DIET_COLORS[d] || ['#f1f5f9','#475569']
                        return <span key={d} className="badge rounded-pill" style={{ background:bg, color:col, fontSize:10 }}>{d}</span>
                      })}
                      {meal.dietary.length > 4 && <span className="badge bg-light text-secondary rounded-pill" style={{ fontSize: 10 }}>+{meal.dietary.length-4}</span>}
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="mb-2">
                    <p className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <i className="ri-leaf-line me-1"></i>Ingredients ({meal.ingredients.length})
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {meal.ingredients.slice(0,4).map(ing => (
                        <span key={ing} className="badge" style={{ background:'#dcfce7', color:'#15803d', fontSize:10 }}>{ing}</span>
                      ))}
                      {meal.ingredients.length > 4 && <span className="badge bg-light text-secondary" style={{ fontSize: 10 }}>+{meal.ingredients.length-4} more</span>}
                    </div>
                  </div>

                  {/* AI Pairings */}
                  <div className="mb-3">
                    <p className="mb-1" style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      <i className="ri-robot-line me-1"></i>AI Pairings
                    </p>
                    <div className="d-flex flex-wrap gap-1">
                      {meal.pairings.slice(0,3).map(p => (
                        <span key={p} className="badge" style={{ background:'#dbeafe', color:'#1e40af', fontSize:10 }}>{p}</span>
                      ))}
                      {meal.pairings.length > 3 && <span className="badge bg-light text-secondary" style={{ fontSize: 10 }}>+{meal.pairings.length-3}</span>}
                    </div>
                  </div>

                  {/* Allergens */}
                  {meal.allergens[0] !== 'None' && (
                    <div className="mb-3 px-2 py-1 rounded" style={{ background: '#fff7ed', border: '1px solid #fed7aa', fontSize: 11, color: '#9a3412' }}>
                      <i className="ri-alert-line me-1"></i>Allergens: {meal.allergens.join(', ')}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="d-flex gap-2 mt-auto">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setViewMeal(meal)}>
                      <i className="ri-eye-line me-1"></i>View
                    </button>
                    <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openEdit(meal)}>
                      <i className="ri-pencil-line me-1"></i>Edit
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={() => retrain(meal.id)} disabled={isTraining}>
                      {isTraining
                        ? <><span className="spinner-border spinner-border-sm me-1" style={{ width:10, height:10 }}></span>Training…</>
                        : <><i className="ri-brain-line me-1"></i>Re-train AI</>
                      }
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteModal(meal.id)}>
                      <i className="ri-delete-bin-line"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── View Detail Modal ── */}
      <Modal show={!!viewMeal} onClose={() => setViewMeal(null)} title={`Meal Details — ${viewMeal?.name ?? ''}`} size="lg">
        <DetailView meal={viewMeal} />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-light" onClick={() => setViewMeal(null)}>Close</button>
          <button className="btn btn-outline-success" onClick={() => { retrain(viewMeal.id); setViewMeal(null) }}>
            <i className="ri-brain-line me-1"></i>Re-train AI
          </button>
          <button className="btn btn-primary" onClick={() => { openEdit(viewMeal); setViewMeal(null) }}>
            <i className="ri-pencil-line me-1"></i>Edit
          </button>
        </div>
      </Modal>

      {/* ── Add Modal ── */}
      <Modal show={addModal} onClose={() => setAddModal(false)} title="Add Meal Association" size="lg">
        <MealForm />
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveMeal} disabled={!form.name.trim()}>Save Meal</button>
        </div>
      </Modal>

      {/* ── Edit Modal ── */}
      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Meal Association" size="lg">
        <MealForm />
        <div className="d-flex justify-content-end gap-2 mt-4">
          <button className="btn btn-light" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateMeal}>Save Changes</button>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remove Meal" size="sm">
        <div className="text-center py-2">
          <i className="ri-delete-bin-line fs-1 text-danger d-block mb-3"></i>
          <p className="fw-medium mb-1">Remove this meal association?</p>
          <p className="text-muted fs-sm mb-4">The meal will be removed from Chef Bems AI pairing recommendations.</p>
          <div className="d-flex gap-2 justify-content-center">
            <button className="btn btn-light px-4" onClick={() => setDeleteModal(null)}>Cancel</button>
            <button className="btn btn-danger px-4" onClick={deleteMeal}>Remove</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
