import React, { useState, useEffect, useRef, useMemo } from 'react'

/**
 * Universal ProductSelect / Combobox Component
 * 
 * Supports:
 * 1. Live Type-to-Search (Product Name, Category, Brand, Unit)
 * 2. SKU Search (e.g., PEAK-20-8960, EGGS-25)
 * 3. Physical Barcode Scanner & live barcode entry
 * 4. Dropdown Browse with stock status, price, category, and thumbnails
 * 5. Keyboard Navigation (↑ / ↓ / Enter / Escape)
 * 6. Dual-format onChange (works with `(id, product)` or synthetic `(e)`)
 */
export default function ProductSelect({
  products = [],
  value = '',
  onChange,
  placeholder = 'Type name, SKU, scan barcode, or select from list...',
  required = false,
  disabled = false,
  autoFocus = false,
  className = '',
  id,
  allowCustom = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Find currently selected product object
  const selectedProduct = useMemo(() => {
    if (!value) return null
    return products.find((p) => String(p.id) === String(value)) || null
  }, [products, value])

  // Sync display text with selected product
  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(`${selectedProduct.name} (${selectedProduct.sku || 'No SKU'})`)
    } else if (!isOpen && !allowCustom) {
      setSearchTerm('')
    }
  }, [selectedProduct, isOpen, allowCustom])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (selectedProduct) {
          setSearchTerm(`${selectedProduct.name} (${selectedProduct.sku || 'No SKU'})`)
        } else if (!allowCustom) {
          setSearchTerm('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedProduct, allowCustom])

  // Filter products by search term (Name, Barcode, SKU, Category, Brand)
  const filteredProducts = useMemo(() => {
    if (!isOpen && selectedProduct) return products
    const term = searchTerm.trim().toLowerCase()
    if (!term) return products

    return products.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const sku = (p.sku || '').toLowerCase()
      const barcode = (p.barcode || '').toLowerCase()
      const cat = (p.category_name || p.category || '').toLowerCase()
      const brand = (p.brand || '').toLowerCase()

      return (
        name.includes(term) ||
        sku.includes(term) ||
        barcode.includes(term) ||
        cat.includes(term) ||
        brand.includes(term)
      )
    })
  }, [products, searchTerm, isOpen, selectedProduct])

  // Select a product
  const handleSelect = (product) => {
    const selectedId = product ? String(product.id) : ''
    if (!product) {
      setSearchTerm('')
    } else {
      setSearchTerm(`${product.name} (${product.sku || 'No SKU'})`)
    }

    if (onChange) {
      // Create synthetic event compatibility
      const syntheticEvent = {
        target: { name: id || 'product_id', value: selectedId },
        currentTarget: { name: id || 'product_id', value: selectedId },
        value: selectedId,
        product: product || null,
      }
      onChange(selectedId, product, syntheticEvent)
    }
    setIsOpen(false)
  }

  // Handle barcode scanner input / keyboard events
  const handleKeyDown = (e) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        return
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev + 1 < filteredProducts.length ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const term = searchTerm.trim().toLowerCase()

      // 1. Direct barcode scan match or SKU exact match
      const exactMatch = products.find(
        (p) =>
          (p.barcode && p.barcode.toLowerCase() === term) ||
          (p.sku && p.sku.toLowerCase() === term)
      )
      if (exactMatch) {
        handleSelect(exactMatch)
        return
      }

      // 2. Select highlighted item from dropdown
      if (filteredProducts.length > 0 && filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex])
        return
      }

      // 3. If allowCustom is enabled and no match, keep custom text
      if (allowCustom && term) {
        if (onChange) {
          onChange('', null, { target: { name: id || 'product_name', value: term } })
        }
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div
      className={`position-relative product-select-combobox ${className}`}
      ref={containerRef}
      style={{ zIndex: isOpen ? 1060 : 'auto' }}
    >
      <div className="input-group shadow-xs rounded-3 overflow-hidden">
        {/* Left Scan / Search Icon */}
        <span
          className="input-group-text bg-light text-muted border-end-0 px-2.5"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen)
              inputRef.current?.focus()
            }
          }}
          title="Scan barcode or type to search"
        >
          <i className={isOpen ? 'ri-search-line text-primary' : 'ri-barcode-line text-muted fs-5'}></i>
        </span>

        {/* Search & Scan Input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="form-control border-start-0 border-end-0 py-2"
          placeholder={placeholder}
          value={searchTerm}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required && !value && !searchTerm}
          autoComplete="off"
          onClick={() => {
            if (!disabled) {
              setIsOpen(true)
              if (selectedProduct) {
                setSearchTerm('')
              }
            }
          }}
          onChange={(e) => {
            const val = e.target.value
            setSearchTerm(val)
            setIsOpen(true)
            setHighlightedIndex(0)

            // Instant Barcode Scan Auto-Detect (fast 6+ digit barcode scanner input)
            const clean = val.trim().toLowerCase()
            if (clean.length >= 6) {
              const exact = products.find(
                (p) =>
                  (p.barcode && p.barcode.toLowerCase() === clean) ||
                  (p.sku && p.sku.toLowerCase() === clean)
              )
              if (exact) {
                handleSelect(exact)
              }
            }
          }}
          onKeyDown={handleKeyDown}
          style={{ fontSize: 13, fontWeight: selectedProduct ? 600 : 400 }}
        />

        {/* Clear Button */}
        {(value || searchTerm) && !disabled && (
          <button
            type="button"
            className="btn btn-light border-top border-bottom border-start-0 border-end-0 px-2 text-muted hover-text-dark"
            onClick={(e) => {
              e.stopPropagation()
              handleSelect(null)
              inputRef.current?.focus()
            }}
            title="Clear selection"
          >
            <i className="ri-close-line fs-5"></i>
          </button>
        )}

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          className="btn btn-light border border-start-0 px-2.5 text-muted"
          disabled={disabled}
          onClick={() => {
            setIsOpen(!isOpen)
            inputRef.current?.focus()
          }}
          title="Toggle product dropdown"
        >
          <i
            className="ri-arrow-down-s-line fs-5 transition-transform"
            style={{
              display: 'inline-block',
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s ease',
            }}
          ></i>
        </button>
      </div>

      {/* Hidden input for native HTML5 form validation */}
      {required && (
        <input
          type="text"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, bottom: 0 }}
          value={value || (allowCustom ? searchTerm : '') || ''}
          onChange={() => {}}
          required
        />
      )}

      {/* Rich Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="dropdown-menu show w-100 p-0 shadow-lg border mt-1"
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            borderRadius: 10,
            zIndex: 1070,
            fontSize: 13,
            backgroundColor: '#ffffff',
          }}
        >
          {/* Header count info */}
          <div className="d-flex align-items-center justify-content-between px-3 py-2 bg-light border-bottom text-muted fs-xs">
            <span>
              <i className="ri-box-3-line me-1"></i>
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} available
            </span>
            <span>
              <kbd className="bg-white border text-dark px-1.5 py-0.5 rounded shadow-xs" style={{ fontSize: 10 }}>↑</kbd>{' '}
              <kbd className="bg-white border text-dark px-1.5 py-0.5 rounded shadow-xs" style={{ fontSize: 10 }}>↓</kbd> navigate{' '}
              <kbd className="bg-white border text-dark px-1.5 py-0.5 rounded shadow-xs" style={{ fontSize: 10 }}>↵</kbd> select
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="ri-inbox-line fs-1 d-block mb-2 text-muted opacity-50"></i>
              <div className="fw-semibold">No product found for "{searchTerm}"</div>
              <small className="text-muted d-block mt-1">
                Try scanning a physical barcode or searching by product name / SKU.
              </small>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredProducts.map((p, idx) => {
                const isSelected = String(p.id) === String(value)
                const isHighlighted = idx === highlightedIndex
                const stockCount = p.stock ?? p.stock_quantity ?? 0
                const isOutOfStock = stockCount <= 0
                const isLowStock = stockCount > 0 && stockCount <= (p.min_stock_threshold || p.reorder_level || 5)
                const img = p.image_url || p.main_image_url

                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2.5 px-3 border-bottom text-start ${
                      isSelected
                        ? 'bg-success-subtle text-success-emphasis border-success-subtle'
                        : isHighlighted
                        ? 'bg-light'
                        : ''
                    }`}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Left: Thumbnail + Title + SKU + Barcode */}
                    <div className="d-flex align-items-center gap-2.5 overflow-hidden me-2">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name}
                          style={{
                            width: 38,
                            height: 38,
                            objectFit: 'cover',
                            borderRadius: 8,
                            border: '1px solid #e2e8f0',
                            flexShrink: 0,
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                          }}
                        />
                      ) : (
                        <div
                          className="rounded-3 bg-light text-muted d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 38, height: 38, fontSize: 16 }}
                        >
                          <i className="ri-shopping-basket-2-line"></i>
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <div className="text-truncate fw-semibold" style={{ color: isSelected ? '#14532d' : '#0f172a' }}>
                          {p.name}
                        </div>
                        <div className="text-muted d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 11 }}>
                          <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: 10 }}>
                            SKU: {p.sku || '—'}
                          </span>
                          {p.barcode && (
                            <span className="text-muted">
                              <i className="ri-barcode-line me-0.5"></i>
                              {p.barcode}
                            </span>
                          )}
                          {(p.category_name || p.category) && (
                            <span className="text-muted">• {p.category_name || p.category}</span>
                          )}
                          {p.unit && <span className="text-muted">• {p.unit}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right: Price & Stock Status */}
                    <div className="text-end flex-shrink-0">
                      <div className="fw-bold text-dark fs-13">
                        ₦{Number(p.unit_price || p.price || p.selling_price || 0).toLocaleString()}
                      </div>
                      <span
                        className={`badge ${
                          isOutOfStock
                            ? 'bg-danger-subtle text-danger border border-danger-subtle'
                            : isLowStock
                            ? 'bg-warning-subtle text-warning-emphasis border border-warning-subtle'
                            : 'bg-success-subtle text-success border border-success-subtle'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {isOutOfStock ? 'Out of stock' : `${stockCount} ${p.unit || 'in stock'}`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
