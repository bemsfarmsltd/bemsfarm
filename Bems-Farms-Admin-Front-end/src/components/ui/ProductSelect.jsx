import React, { useState, useEffect, useRef } from 'react'

/**
 * ProductSelect / ProductCombobox
 * 
 * Allows users to:
 * 1. Type product name, SKU, or category to filter in real-time
 * 2. Scan or enter a Barcode (auto-selects immediately upon scan/Enter)
 * 3. Click the dropdown arrow to browse and select from the full list
 */
export default function ProductSelect({
  products = [],
  value = '',
  onChange,
  placeholder = 'Type name, scan barcode, or select from list...',
  required = false,
  disabled = false,
  autoFocus = false,
  className = '',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Find currently selected product object
  const selectedProduct = products.find((p) => String(p.id) === String(value))

  // Sync display text with selected product
  useEffect(() => {
    if (selectedProduct) {
      setSearchTerm(`${selectedProduct.name} (${selectedProduct.sku || 'No SKU'})`)
    } else if (!isOpen) {
      setSearchTerm('')
    }
  }, [selectedProduct, isOpen])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        if (selectedProduct) {
          setSearchTerm(`${selectedProduct.name} (${selectedProduct.sku || 'No SKU'})`)
        } else {
          setSearchTerm('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedProduct])

  // Filter products by search term (Name, Barcode, SKU, Category, Brand)
  const filteredProducts = React.useMemo(() => {
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
    if (!product) {
      onChange && onChange('', null)
      setSearchTerm('')
    } else {
      onChange && onChange(product.id, product)
      setSearchTerm(`${product.name} (${product.sku || 'No SKU'})`)
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
      // 1. Direct barcode scan match
      const term = searchTerm.trim()
      const exactBarcode = products.find(
        (p) => (p.barcode && p.barcode === term) || (p.sku && p.sku.toLowerCase() === term.toLowerCase())
      )
      if (exactBarcode) {
        handleSelect(exactBarcode)
        return
      }

      // 2. Select highlighted item from dropdown
      if (filteredProducts.length > 0 && filteredProducts[highlightedIndex]) {
        handleSelect(filteredProducts[highlightedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`position-relative product-select-combobox ${className}`} ref={containerRef} style={{ zIndex: isOpen ? 1060 : 'auto' }}>
      <div className="input-group">
        <span className="input-group-text bg-light text-muted border-end-0" style={{ cursor: 'pointer' }} onClick={() => { if (!disabled) { setIsOpen(!isOpen); inputRef.current?.focus() } }}>
          <i className={isOpen ? 'ri-search-line text-primary' : 'ri-barcode-line text-muted'}></i>
        </span>

        <input
          ref={inputRef}
          id={id}
          type="text"
          className="form-control border-start-0 border-end-0"
          placeholder={placeholder}
          value={searchTerm}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required && !value}
          autoComplete="off"
          onClick={() => {
            if (!disabled) {
              setIsOpen(true)
              if (selectedProduct) {
                // Clear on click to let user type new search easily
                setSearchTerm('')
              }
            }
          }}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(0)

            // Instant Barcode Scan detection
            const val = e.target.value.trim()
            if (val.length >= 6) {
              const exact = products.find((p) => p.barcode === val)
              if (exact) {
                handleSelect(exact)
              }
            }
          }}
          onKeyDown={handleKeyDown}
          style={{ fontSize: 13, fontWeight: selectedProduct ? 500 : 400 }}
        />

        {value && !disabled && (
          <button
            type="button"
            className="btn btn-outline-secondary border-start-0 border-end-0 px-2 text-muted"
            onClick={(e) => {
              e.stopPropagation()
              handleSelect(null)
              inputRef.current?.focus()
            }}
            title="Clear selection"
          >
            <i className="ri-close-line"></i>
          </button>
        )}

        <button
          type="button"
          className="btn btn-light border border-start-0 px-2 text-muted"
          disabled={disabled}
          onClick={() => {
            setIsOpen(!isOpen)
            inputRef.current?.focus()
          }}
          title="Toggle product dropdown"
        >
          <i className={`ri-arrow-down-s-line transition-all ${isOpen ? 'rotate-180' : ''}`} style={{ display: 'inline-block', transform: isOpen ? 'rotate(180deg)' : 'none' }}></i>
        </button>
      </div>

      {/* Hidden input for native form validation */}
      {required && (
        <input
          type="text"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0, bottom: 0 }}
          value={value || ''}
          onChange={() => {}}
          required
        />
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className="dropdown-menu show w-100 p-0 shadow-lg border mt-1"
          style={{
            maxHeight: 320,
            overflowY: 'auto',
            borderRadius: 8,
            zIndex: 1065,
            fontSize: 13,
          }}
        >
          {filteredProducts.length === 0 ? (
            <div className="p-3 text-center text-muted">
              <i className="ri-inbox-line fs-20 d-block mb-1 text-muted"></i>
              No products match "{searchTerm}"
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredProducts.map((p, idx) => {
                const isSelected = String(p.id) === String(value)
                const isHighlighted = idx === highlightedIndex
                const stockCount = p.stock ?? p.stock_quantity ?? 0
                const isOutOfStock = stockCount <= 0
                const img = p.image_url || p.main_image_url

                return (
                  <button
                    type="button"
                    key={p.id}
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between py-2 px-3 border-bottom ${
                      isSelected ? 'bg-primary-subtle text-primary fw-semibold' : isHighlighted ? 'bg-light' : ''
                    }`}
                    onClick={() => handleSelect(p)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    style={{ cursor: 'pointer', textAlign: 'left' }}
                  >
                    <div className="d-flex align-items-center gap-2 overflow-hidden me-2">
                      {img ? (
                        <img
                          src={img}
                          alt={p.name}
                          style={{
                            width: 32,
                            height: 32,
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
                          className="rounded bg-light text-muted d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 32, height: 32, fontSize: 14 }}
                        >
                          <i className="ri-shopping-basket-line"></i>
                        </div>
                      )}

                      <div className="overflow-hidden">
                        <div className="text-truncate fw-medium" style={{ color: isSelected ? '#1e40af' : '#1e293b' }}>
                          {p.name}
                        </div>
                        <div className="text-muted d-flex align-items-center gap-2" style={{ fontSize: 11 }}>
                          <span>SKU: {p.sku || '—'}</span>
                          {p.barcode && <span>• Barcode: {p.barcode}</span>}
                          {p.category_name || p.category ? <span>• {p.category_name || p.category}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="text-end flex-shrink-0">
                      <div className="fw-semibold text-dark">
                        ₦{Number(p.unit_price || p.price || 0).toLocaleString()}
                      </div>
                      <span
                        className={`badge ${
                          isOutOfStock ? 'bg-danger-subtle text-danger' : stockCount <= 5 ? 'bg-warning-subtle text-warning' : 'bg-success-subtle text-success'
                        }`}
                        style={{ fontSize: 10 }}
                      >
                        {isOutOfStock ? 'Out of stock' : `${stockCount} in stock`}
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
