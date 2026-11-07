import { useEffect, useRef } from 'react'
import { renderBarcodeToElement } from '../../lib/barcodeGenerator'

/**
 * BarcodeSvg — Vector Barcode Component
 * Renders crisp, scalable SVG barcodes for screen display and high-res thermal printing.
 */
export default function BarcodeSvg({
  value,
  format = 'CODE128',
  width = 1.8,
  height = 46,
  displayValue = true,
  fontSize = 12,
  className = '',
  style = {},
}) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (svgRef.current && value) {
      renderBarcodeToElement(svgRef.current, value, {
        format,
        width,
        height,
        displayValue,
        fontSize,
      })
    }
  }, [value, format, width, height, displayValue, fontSize])

  if (!value) {
    return (
      <div className={`text-muted small d-inline-flex align-items-center gap-1 ${className}`} style={style}>
        <i className="ri-barcode-line opacity-50"></i> No Barcode
      </div>
    )
  }

  return (
    <svg
      ref={svgRef}
      className={`barcode-svg-element ${className}`}
      style={{ display: 'inline-block', maxWidth: '100%', ...style }}
    />
  )
}
