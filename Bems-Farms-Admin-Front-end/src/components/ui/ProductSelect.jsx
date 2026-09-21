import React, { useState, useEffect, useRef, useMemo } from 'react'

/**
 * Universal Intuitive ProductSelect Component
 * 
 * Features:
 * - Selected State: Displays a clean, elegant product badge with image, title, SKU, live stock, and "Change" action.
 * - Search / Input State: Instant typing filter, physical barcode scanner detection, SKU lookup, and dropdown browse.
 * - Dual-format onChange: works with (selectedId, productObj, syntheticEvent).
 */
export default function ProductSelect({
  products = [],
  value = '',
  onChange,
  placeholder = 'Search by name, SKU, or scan barcode...',
  required = false,
  disabled = false,
  autoFocus = false,
  className = '',
  id,
  allowCustom = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Find currently selected product object
  const selectedProduct = useMemo(() => {
    if (!value) return null
    return products.find((p) => String(p.id) === String(value)) || null
  }, [products, value])

  // Sync state when value changes externally
  useEffect(() => {
    if (!value) {
      setIsSearching(false)
      setSearchTerm('')
    }
  }, [value])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (selectedProduct) {
          setIsSearching(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedProduct])

  // Filter products by search term (Name, Barcode, SKU, Category, Brand)
  const filteredProducts = useMemo(() => {
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
  }, [products, searchTerm])

  // Handle selecting a product
  const handleSelect = (product) => {
    const selectedId = product ? String(product.id) : ''
    setIsSearching(false)
    setIsOpen(false)
    setSearchTerm('')

    if (onChange) {
      const syntheticEvent = {
        target: { name: id || 'product_id', value: selectedId },
        currentTarget: { name: id || 'product_id', value: selectedId },
        value: selectedId,
        product: product || null,
      }
      onChange(selectedId, product, syntheticEvent)
    }
  }

  // Handle keyboard navigation and barcode scanner input
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

      // 1. Direct barcode or SKU match
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

      // 3. Custom product name
      if (allowCustom && term) {
        if (onChange) {
          onChange('', null, { target: { name: id || 'product_name', value: term } })
        }
        setIsSearching(false)
        setIsOpen(false)
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      if (selectedProduct) {
        setIsSearching(false)
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SELECTED STATE: Display clean summary card
  // ──────────────────────────────────────────────────────────────────────────
  if (selectedProduct && !isSearching) {
    const stockCount = selectedProduct.stock ?? selectedProduct.stock_quantity ?? 0
    const isOutOfStock = stockCount <= 0
    const img = selectedProduct.image_url || selectedProduct.main_image_url

    return (
      <div className={`selected-product-card ${className}`} ref={containerRef}>
        <div className="d-flex align-items-center justify-content-between p-2 bg-white border border-2 border-success-subtle rounded-3 shadow-xs">
          {/* Left: Thumbnail & Info */}
          <div className="d-flex align-items-center gap-2.5 overflow-hidden me-2">
            {img ? (
              <img
                src={img}
                alt={selectedProduct.name}
                style={{
                  width: 36,
                  height: 36,
                  objectFit: 'cover',
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  flexShrink: 0,
                }}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            ) : (
              <div
                className="rounded-2 bg-success-subtle text-success d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 36, height: 36, fontSize: 16 }}
              >
                <i className="ri-check-line fw-bold"></i>
              </div>
            )}

            <div className="overflow-hidden">
              <div className="fw-bold text-dark text-truncate" style={{ fontSize: 13 }} title={selectedProduct.name}>
                {selectedProduct.name}
              </div>
              <div className="text-muted d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: 11 }}>
                <span className="badge bg-light text-dark border font-monospace" style={{ fontSize: 10 }}>
                  SKU: {selectedProduct.sku || '—'}
                </span>
                <span>• Stock: <strong>{stockCount} {selectedProduct.unit || 'pcs'}</strong></span>
                {selectedProduct.cost_price ? (
                  <span>• Cost: ₦{Number(selectedProduct.cost_price).toLocaleString()}</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary py-1 px-2.5 d-flex align-items-center gap-1"
              style={{ fontSize: 12 }}
              onClick={() => {
                setIsSearching(true)
                setIsOpen(true)
                setSearchTerm('')
                setTimeout(() => inputRef.current?.focus(), 50)
              }}
              title="Change selected product"
              disabled={disabled}
            >
              <i className="ri-repeat-line"></i>
              <span>Change</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light text-muted border-0 p-1"
              onClick={() => handleSelect(null)}
              title="Remove selection"
              disabled={disabled}
            >
              <i className="ri-close-line fs-5"></i>
            </button>
          </div>
        </div>

        {/* Hidden input for native HTML5 form validation */}
        {required && (
          <input
            type="text"
            style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, bottom: 0 }}
            value={value || ''}
            onChange={() => {}}
            required
          />
        )}
      </div>
    )
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. SEARCH & SELECT STATE: Input with dropdown
  // ──────────────────────────────────────────────────────────────────────────
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
          autoFocus={autoFocus || isSearching}
          required={required && !value && !searchTerm}
          autoComplete="off"
          onClick={() => {
            if (!disabled) {
              setIsOpen(true)
            }
          }}
          onChange={(e) => {
            const val = e.target.value
            setSearchTerm(val)
            setIsOpen(true)
            setHighlightedIndex(0)

            // Instant Barcode Scan Auto-Detect
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
          style={{ fontSize: 13 }}
        />

        {/* Dropdown Toggle Button */}
        <button
          type="button"
          className="btn btn-light border border-start-0 px-2.5 text-muted d-flex align-items-center gap-1"
          disabled={disabled}
          onClick={() => {
            setIsOpen(!isOpen)
            inputRef.current?.focus()
          }}
          title="Browse all products"
        >
          <span className="fs-xs text-muted d-none d-sm-inline">Browse</span>
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
              {filteredProducts.length} product{filteredProducts.length === 1 ? '' : 's'} found
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
              <div className="fw-semibold">No product matches "{searchTerm}"</div>
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
