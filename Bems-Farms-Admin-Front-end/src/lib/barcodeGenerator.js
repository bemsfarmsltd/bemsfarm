import JsBarcode from 'jsbarcode'

/**
 * Calculates GS1 standard EAN-13 Checksum digit
 */
export function calculateEan13Checksum(code12) {
  const digits = String(code12).padStart(12, '0').split('').map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += i % 2 === 0 ? digits[i] : digits[i] * 3
  }
  const mod = sum % 10
  return mod === 0 ? 0 : 10 - mod
}

/**
 * Generates standard Bems Farms Universal Goods Codes (UGC)
 * Types:
 * - 'EAN13': 13-digit GS1 numeric barcode (615 = Nigeria/Bems Internal Prefix)
 * - 'CODE128': Alphanumeric Universal Code (e.g., BF-VEG-84920)
 * - 'NUMERIC': 12-digit internal unique identifier
 */
export function generateUniversalGoodsCode(product = {}, format = 'CODE128') {
  const pId = product.id ? String(product.id).replace(/\D/g, '') : ''
  const catCode = (product.category_name || product.category || 'GEN')
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase() || 'AGR'
  
  if (format === 'EAN13') {
    // 615 prefix (Nigeria country / internal standard) + 4-digit cat/store + 5-digit seed + 1 check digit
    const seed = String(Math.floor(10000 + Math.random() * 90000))
    const pIdPad = pId ? String(pId).padStart(4, '0').slice(-4) : '0100'
    const code12 = `615${pIdPad.slice(0, 3)}${seed.slice(0, 5)}`
    const checkDigit = calculateEan13Checksum(code12)
    return `${code12}${checkDigit}`
  }

  // Default: CODE128 Alphanumeric Universal Code
  const randomSuffix = Math.floor(1000 + Math.random() * 9000)
  const timestamp = Date.now().toString().slice(-4)
  return `BF-${catCode}-${timestamp}${randomSuffix}`
}

/**
 * Safely renders a barcode into an SVG or Canvas element using JsBarcode
 */
export function renderBarcodeToElement(element, value, options = {}) {
  if (!element || !value) return false
  
  const defaultOpts = {
    format: options.format === 'EAN13' && String(value).length === 13 ? 'EAN13' : 'CODE128',
    lineColor: '#111827',
    width: options.width || 1.8,
    height: options.height || 46,
    displayValue: options.displayValue !== undefined ? options.displayValue : true,
    font: 'monospace',
    fontOptions: 'bold',
    fontSize: options.fontSize || 12,
    textMargin: options.textMargin || 2,
    margin: options.margin || 6,
    background: options.background || '#ffffff',
    valid: () => {},
  }

  try {
    JsBarcode(element, String(value), { ...defaultOpts, ...options })
    return true
  } catch (err) {
    // If EAN13 format fails validation, fallback smoothly to CODE128
    try {
      JsBarcode(element, String(value), { ...defaultOpts, format: 'CODE128' })
      return true
    } catch (fallbackErr) {
      console.warn('Barcode render error:', fallbackErr)
      return false
    }
  }
}
