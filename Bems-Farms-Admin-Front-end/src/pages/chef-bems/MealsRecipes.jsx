import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'

const EMPTY_MEAL = {
  meal_name: '',
  meal_category: 'Soups & Stews',
  cuisine_origin: 'Nigerian',
  regional_context: 'National',
  description: '',
  default_serving_size: 4,
  complexity: 'Medium',
  supports_budget_mode: true,
  best_for: '',
  meal_time: 'Lunch & Dinner',
  ingredients: []
}

const EMPTY_ING = {
  ingredient_name: '',
  requirement_type: 'Essential',
  qty_per_person: 1,
  recipe_unit: 'unit',
  role_in_meal: 'Main Ingredient',
  importance_score: 5
}

function Modal({ show, onClose, title, children, size = '' }) {
  if (!show) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: size === 'lg' ? 800 : size === 'sm' ? 400 : 600, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
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

export default function MealsRecipes() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [deleteModal, setDeleteModal] = useState(null)
  const [form, setForm] = useState(EMPTY_MEAL)

  const load = useCallback(() => {
    setLoading(true)
    api.get('/admin/chef-bems/meals', { params: { search: search || undefined, category: category || undefined } })
      .then(res => setMeals(res.data.meals || []))
      .catch(() => toast.error('Failed to load meals'))
      .finally(() => setLoading(false))
  }, [search, category])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const openEdit = (meal) => {
    setForm({
      meal_name: meal.meal_name,
      meal_category: meal.meal_category || 'Soups & Stews',
      cuisine_origin: meal.cuisine_origin || 'Nigerian',
      regional_context: meal.regional_context || 'National',
      description: meal.description || '',
      default_serving_size: meal.default_serving_size || 4,
      complexity: meal.complexity || 'Medium',
      supports_budget_mode: meal.supports_budget_mode !== false,
      best_for: meal.best_for || '',
      meal_time: meal.meal_time || 'Lunch & Dinner',
      ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : []
    })
    setEditModal(meal.meal_id)
  }

  const addIngredientRow = () => {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { ...EMPTY_ING }] }))
  }

  const removeIngredientRow = (idx) => {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }))
  }

  const updateIngredientField = (idx, field, value) => {
    setForm(f => {
      const updated = [...f.ingredients]
      updated[idx] = { ...updated[idx], [field]: value }
      return { ...f, ingredients: updated }
    })
  }

  async function saveMeal() {
    if (!form.meal_name.trim()) return toast.error('Meal name is required')
    setSaving(true)
    try {
      await api.post('/admin/chef-bems/meals', form)
      toast.success('Meal and recipe created')
      setAddModal(false)
      setForm(EMPTY_MEAL)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save meal')
    } finally {
      setSaving(false)
    }
  }

  async function updateMeal() {
    setSaving(true)
    try {
      await api.put(`/admin/chef-bems/meals/${editModal}`, form)
      toast.success('Meal updated')
      setEditModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update meal')
    } finally {
      setSaving(false)
    }
  }

  async function deleteMeal() {
    try {
      await api.delete(`/admin/chef-bems/meals/${deleteModal}`)
      toast.success('Meal deleted')
      setDeleteModal(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete meal')
    }
  }

  const MealForm = () => (
    <div className="row g-3">
      <div className="col-md-8">
        <label className="form-label fw-medium">Meal / Recipe Name <span className="text-danger">*</span></label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Authentic Nigerian Party Jollof Rice"
          value={form.meal_name}
          onChange={e => setForm(f => ({ ...f, meal_name: e.target.value }))}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">Category</label>
        <select
          className="form-select"
          value={form.meal_category}
          onChange={e => setForm(f => ({ ...f, meal_category: e.target.value }))}
        >
          <option value="Rice & Grains">Rice & Grains</option>
          <option value="Soups & Stews">Soups & Stews</option>
          <option value="Beans & Plantain">Beans & Plantain</option>
          <option value="Breakfast & Snacks">Breakfast & Snacks</option>
          <option value="Swallow Accompaniments">Swallow Accompaniments</option>
          <option value="Meat & Poultry">Meat & Poultry</option>
        </select>
      </div>

      <div className="col-md-4">
        <label className="form-label fw-medium">Default Serving Size</label>
        <input
          type="number"
          className="form-control"
          min="1"
          max="50"
          value={form.default_serving_size}
          onChange={e => setForm(f => ({ ...f, default_serving_size: e.target.value }))}
        />
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">Complexity</label>
        <select
          className="form-select"
          value={form.complexity}
          onChange={e => setForm(f => ({ ...f, complexity: e.target.value }))}
        >
          <option value="Easy">Easy (Under 30 mins)</option>
          <option value="Medium">Medium (30-60 mins)</option>
          <option value="Advanced">Advanced (Over 1 hour)</option>
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label fw-medium">Meal Time</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Lunch & Dinner"
          value={form.meal_time}
          onChange={e => setForm(f => ({ ...f, meal_time: e.target.value }))}
        />
      </div>

      <div className="col-12">
        <label className="form-label fw-medium">Description</label>
        <textarea
          className="form-control"
          rows={2}
          placeholder="Brief culinary summary and cooking description..."
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div className="col-md-6">
        <label className="form-label fw-medium">Regional / Cultural Context</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. South-West / Niger Delta / National"
          value={form.regional_context}
          onChange={e => setForm(f => ({ ...f, regional_context: e.target.value }))}
        />
      </div>
      <div className="col-md-6">
        <label className="form-label fw-medium">Best For / Occasion Tags</label>
        <input
          type="text"
          className="form-control"
          placeholder="e.g. Family Dinner, Sunday Lunch, Party"
          value={form.best_for}
          onChange={e => setForm(f => ({ ...f, best_for: e.target.value }))}
        />
      </div>

      {/* Dynamic Ingredients Builder */}
      <div className="col-12 mt-4 pt-3 border-top">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h6 className="fw-bold mb-0">🍲 Recipe Ingredients ({form.ingredients.length})</h6>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={addIngredientRow}>
            <i className="ri-add-line me-1"></i>Add Ingredient
          </button>
        </div>

        {form.ingredients.length === 0 && (
          <div className="p-3 bg-light rounded text-center text-muted small">
            No ingredients added yet. Click "+ Add Ingredient" to map products from the store.
          </div>
        )}

        <div className="space-y-2">
          {form.ingredients.map((ing, idx) => (
            <div key={idx} className="p-2 border rounded bg-light mb-2">
              <div className="row g-2 align-items-center">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Product / Ingredient Name"
                    value={ing.ingredient_name}
                    onChange={e => updateIngredientField(idx, 'ingredient_name', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="number"
                    step="0.01"
                    className="form-control form-control-sm"
                    placeholder="Qty/person"
                    value={ing.qty_per_person}
                    onChange={e => updateIngredientField(idx, 'qty_per_person', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Unit (kg/bunch)"
                    value={ing.recipe_unit}
                    onChange={e => updateIngredientField(idx, 'recipe_unit', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <select
                    className="form-select form-select-sm"
                    value={ing.requirement_type}
                    onChange={e => updateIngredientField(idx, 'requirement_type', e.target.value)}
                  >
                    <option value="Essential">Essential</option>
                    <option value="Optional">Optional</option>
                    <option value="Garnish">Garnish / Side</option>
                  </select>
                </div>
                <div className="col-md-1 text-end">
                  <button type="button" className="btn btn-sm btn-outline-danger p-1" onClick={() => removeIngredientRow(idx)}>
                    <i className="ri-close-line"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="container-fluid">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="fs-xl mb-1">
            <i className="ri-restaurant-2-line me-2 text-warning"></i>Meals &amp; Recipe Bundles
          </h4>
          <p className="text-muted mb-0">Manage authentic Nigerian recipes and ingredient mappings for Chef Bems AI.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(EMPTY_MEAL); setAddModal(true) }}>
          <i className="ri-add-line me-1"></i>Create Meal Recipe
        </button>
      </div>

      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="d-flex flex-wrap gap-2 align-items-center">
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ maxWidth: 260 }}
              placeholder="Search dishes or recipes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="form-select form-select-sm"
              style={{ maxWidth: 200 }}
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Rice & Grains">Rice & Grains</option>
              <option value="Soups & Stews">Soups & Stews</option>
              <option value="Beans & Plantain">Beans & Plantain</option>
            </select>
            <span className="text-muted ms-auto" style={{ fontSize: 12 }}>{meals.length} recipes</span>
          </div>
        </div>
      </div>

      {loading && <div className="text-center text-muted py-5">Loading recipes…</div>}
      {!loading && meals.length === 0 && (
        <div className="text-center text-muted py-5">
          <i className="ri-restaurant-2-line fs-1 d-block mb-2"></i>No meals found. Click "Create Meal Recipe" to add one.
        </div>
      )}

      <div className="row g-4">
        {!loading && meals.map(meal => (
          <div className="col-md-6 col-xl-4" key={meal.meal_id}>
            <div className="card mb-0 h-100 shadow-sm border">
              <div className="card-body d-flex flex-column">
                <div className="d-flex align-items-start justify-content-between mb-2">
                  <div>
                    <span className="badge bg-amber-100 text-amber-800 me-2" style={{ fontSize: 10, background: '#fef3c7', color: '#92400e' }}>
                      {meal.meal_category}
                    </span>
                    <span className="badge bg-emerald-100 text-emerald-800" style={{ fontSize: 10, background: '#d1fae5', color: '#065f46' }}>
                      Serves {meal.default_serving_size || 4}
                    </span>
                  </div>
                  <span className="badge bg-light text-secondary border" style={{ fontSize: 10 }}>{meal.complexity}</span>
                </div>

                <h6 className="fw-bold mb-1" style={{ fontSize: 15, color: '#0f172a' }}>{meal.meal_name}</h6>
                <p className="text-muted mb-3" style={{ fontSize: 12, minHeight: 36 }}>{meal.description || 'No description provided.'}</p>

                {/* Ingredients Count Pill */}
                <div className="p-2 rounded mb-3" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div className="d-flex align-items-center justify-content-between mb-1">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#334155' }}>
                      Ingredients ({meal.ingredients?.length || 0})
                    </span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>{meal.meal_time}</span>
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    {(meal.ingredients || []).slice(0, 4).map((ing, i) => (
                      <span key={i} className="badge bg-white text-dark border" style={{ fontSize: 10 }}>
                        {ing.ingredient_name}
                      </span>
                    ))}
                    {(meal.ingredients || []).length > 4 && (
                      <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>
                        +{meal.ingredients.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="d-flex gap-2 mt-auto pt-2">
                  <button className="btn btn-sm btn-outline-secondary flex-grow-1" onClick={() => openEdit(meal)}>
                    <i className="ri-pencil-line me-1"></i>Edit Recipe
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => setDeleteModal(meal.meal_id)}>
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <Modal show={addModal} onClose={() => setAddModal(false)} title="Create Meal Recipe Bundle" size="lg">
        <MealForm />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveMeal} disabled={saving}>
            {saving ? 'Saving…' : 'Save Meal'}
          </button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal show={!!editModal} onClose={() => setEditModal(null)} title="Edit Meal Recipe Bundle" size="lg">
        <MealForm />
        <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
          <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={updateMeal} disabled={saving}>
            {saving ? 'Saving…' : 'Update Meal'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Meal Recipe" size="sm">
        <p className="text-muted mb-4">Are you sure you want to delete this meal and its associated ingredient mappings? This cannot be undone.</p>
        <div className="d-flex justify-content-end gap-2">
          <button className="btn btn-secondary" onClick={() => setDeleteModal(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={deleteMeal}>Delete</button>
        </div>
      </Modal>
    </div>
  )
}
