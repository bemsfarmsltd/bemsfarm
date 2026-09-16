/**
 * Bems Farms Direct Hardware ESC/POS Printing Engine
 * Communicates directly with USB/Serial thermal receipt printers (Xprinter, POS-58, POS-80, Epson, etc.)
 * via Web Serial / WebUSB API for 100% silent, instantaneous receipt printing without browser print dialogs.
 */

class ESCPOSBuilder {
  constructor(paperWidth = 80) {
    this.buffer = []
    this.cols = paperWidth === 58 ? 32 : 48 // Characters per line
    this.init()
  }

  init() {
    // ESC @ (Initialize printer)
    this.buffer.push(0x1B, 0x40)
    return this
  }

  align(alignment = 'left') {
    // ESC a n (0: Left, 1: Center, 2: Right)
    const n = alignment === 'center' ? 0x01 : (alignment === 'right' ? 0x02 : 0x00)
    this.buffer.push(0x1B, 0x61, n)
    return this
  }

  bold(enable = true) {
    // ESC E n
    this.buffer.push(0x1B, 0x45, enable ? 0x01 : 0x00)
    return this
  }

  size(mode = 'normal') {
    // GS ! n (0x00: Normal, 0x11: Double Height & Width, 0x01: Double Height, 0x10: Double Width)
    let n = 0x00
    if (mode === 'large' || mode === 'double') n = 0x11
    else if (mode === 'tall') n = 0x01
    else if (mode === 'wide') n = 0x10
    this.buffer.push(0x1D, 0x21, n)
    return this
  }

  text(str = '') {
    // Sanitize string to clean ASCII / CP437 compatibility
    const cleanStr = String(str)
      .replace(/₦/g, 'N') // Replace Naira symbol with standard N if code page doesn't map it
      .replace(/[^\x20-\x7E\n\r]/g, '')
    
    const encoder = new TextEncoder()
    const bytes = encoder.encode(cleanStr)
    for (let i = 0; i < bytes.length; i++) {
      this.buffer.push(bytes[i])
    }
    return this
  }

  textLn(str = '') {
    this.text(str)
    this.buffer.push(0x0A) // LF
    return this
  }

  emptyLine(count = 1) {
    for (let i = 0; i < count; i++) {
      this.buffer.push(0x0A)
    }
    return this
  }

  dashedLine() {
    this.textLn('-'.repeat(this.cols))
    return this
  }

  doubleLine() {
    this.textLn('='.repeat(this.cols))
    return this
  }

  twoColumnRow(leftStr = '', rightStr = '', bold = false) {
    const left = String(leftStr)
    const right = String(rightStr)
    const totalSpace = this.cols - left.length - right.length
    if (totalSpace < 1) {
      this.textLn(left)
      this.align('right').textLn(right).align('left')
    } else {
      if (bold) this.bold(true)
      this.textLn(left + ' '.repeat(totalSpace) + right)
      if (bold) this.bold(false)
    }
    return this
  }

  threeColumnRow(col1 = '', col2 = '', col3 = '') {
    // E.g. Item (col1), Qty x Price (col2), LineTotal (col3)
    const c1 = String(col1)
    const c2 = String(col2)
    const c3 = String(col3)
    
    // For 80mm (48 cols): 24 cols for item, 12 cols for qty, 12 cols for total
    const w1 = Math.floor(this.cols * 0.5)
    const w2 = Math.floor(this.cols * 0.25)
    const w3 = this.cols - w1 - w2

    const part1 = c1.slice(0, w1).padEnd(w1, ' ')
    const part2 = c2.slice(0, w2).padStart(w2, ' ')
    const part3 = c3.slice(0, w3).padStart(w3, ' ')

    this.textLn(part1 + part2 + part3)
    return this
  }

  barcode(data = '', height = 48) {
    const cleanData = String(data).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 18)
    if (!cleanData) return this

    this.align('center')
    // GS H 0 (Disable HRI human-readable text print below barcode — we print it manually)
    this.buffer.push(0x1D, 0x48, 0x00)
    // GS w 2 (Barcode module width 2)
    this.buffer.push(0x1D, 0x77, 0x02)
    // GS h height (Barcode height)
    this.buffer.push(0x1D, 0x68, Math.min(100, Math.max(20, height)))
    // GS k 73 len data (Code 128)
    const encoder = new TextEncoder()
    const encoded = encoder.encode(cleanData)
    // Code 128 prefix '{B' for code set B
    const codeSetB = [0x7B, 0x42, ...encoded]
    this.buffer.push(0x1D, 0x6B, 0x49, codeSetB.length, ...codeSetB)
    this.buffer.push(0x0A)
    return this
  }

  cut(full = true) {
    // Feed 3 lines then GS V 0 / 1 (Cut paper)
    this.emptyLine(3)
    this.buffer.push(0x1D, 0x56, full ? 0x00 : 0x01)
    return this
  }

  kickDrawer() {
    // ESC p 0 25 250 (Kick standard RJ11 cash drawer)
    this.buffer.push(0x1B, 0x70, 0x00, 0x19, 0xFA)
    return this
  }

  getBytes() {
    return new Uint8Array(this.buffer)
  }
}

// ── State for Active Hardware Connection ──────────────────────────────────────
let activeSerialPort = null
let activeSerialWriter = null
let isConnecting = false

export function isDirectPrinterSupported() {
  return typeof navigator !== 'undefined' && ('serial' in navigator || 'usb' in navigator)
}

export function isPrinterConnected() {
  return activeSerialPort !== null && activeSerialWriter !== null
}

export async function connectDirectPrinter() {
  if (!isDirectPrinterSupported()) {
    throw new Error('Web Serial / WebUSB is not supported in this browser. Please use Google Chrome or Microsoft Edge.')
  }

  if (isConnecting) return false
  isConnecting = true

  try {
    // Request serial port from user
    const port = await navigator.serial.requestPort()
    await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
    
    activeSerialPort = port
    activeSerialWriter = port.writable.getWriter()
    
    // Save paired preference
    localStorage.setItem('bems_direct_printer_paired', 'true')
    
    return {
      connected: true,
      portInfo: port.getInfo?.() || {}
    }
  } catch (err) {
    console.error('Failed to pair direct printer:', err)
    throw err
  } finally {
    isConnecting = false
  }
}

export async function autoReconnectDirectPrinter() {
  if (!isDirectPrinterSupported()) return false
  if (isPrinterConnected()) return true
  if (localStorage.getItem('bems_direct_printer_paired') !== 'true') return false

  try {
    const ports = await navigator.serial.getPorts()
    if (ports && ports.length > 0) {
      const port = ports[0]
      await port.open({ baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none' })
      activeSerialPort = port
      activeSerialWriter = port.writable.getWriter()
      return true
    }
  } catch (err) {
    console.warn('Silent auto-reconnect failed (may require manual tap):', err.message)
  }
  return false
}

export async function disconnectDirectPrinter() {
  try {
    if (activeSerialWriter) {
      activeSerialWriter.releaseLock()
      activeSerialWriter = null
    }
    if (activeSerialPort) {
      await activeSerialPort.close()
      activeSerialPort = null
    }
    localStorage.removeItem('bems_direct_printer_paired')
    return true
  } catch (err) {
    console.error('Error disconnecting printer:', err)
    return false
  }
}

export async function sendRawBytes(bytes) {
  if (!activeSerialWriter) {
    const reconnected = await autoReconnectDirectPrinter()
    if (!reconnected || !activeSerialWriter) {
      throw new Error('No direct thermal printer connected. Please connect via POS Settings.')
    }
  }

  try {
    await activeSerialWriter.write(bytes)
    return true
  } catch (err) {
    console.error('Error writing to direct printer:', err)
    // If pipe broke, reset writer
    try {
      activeSerialWriter.releaseLock()
      activeSerialWriter = null
    } catch {}
    throw err
  }
}

/**
 * Builds and sends an ESC/POS receipt directly to hardware
 */
export async function printReceiptESC(receiptData, paperWidth = 80) {
  const {
    storeName = 'BEMS FARMS LTD',
    storeTagline = 'Fresh Food. Trusted Quality.',
    storeAddress = 'Abia State, Nigeria',
    storePhone = '+234 800 236 7326',
    receiptNumber = 'BF-' + Date.now().toString().slice(-6),
    date = new Date().toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' }),
    cashier = 'Cashier',
    customer = 'Walk-in Customer',
    items = [],
    subtotal = 0,
    tax = 0,
    discount = 0,
    total = 0,
    method = 'Cash',
    cashReceived = 0,
    change = 0,
    note = '',
    kickDrawer = false,
  } = receiptData

  const builder = new ESCPOSBuilder(paperWidth)

  if (kickDrawer || method === 'Cash') {
    builder.kickDrawer()
  }

  // 1. Header & Store Branding
  builder.align('center')
    .bold(true).size('double').textLn(storeName).size('normal').bold(false)
    .textLn(storeTagline)
    .textLn(storeAddress)
    .textLn('Tel: ' + storePhone)
    .dashedLine()
    .bold(true).textLn('SALES RECEIPT').bold(false)
    .dashedLine()

  // 2. Metadata
  builder.align('left')
    .twoColumnRow('Receipt #:', receiptNumber, true)
    .twoColumnRow('Date/Time:', date)
    .twoColumnRow('Customer:', customer)
    .twoColumnRow('Cashier:', cashier)
    .dashedLine()

  // 3. Items Table Header
  builder.bold(true).threeColumnRow('ITEM', 'QTY x PRICE', 'TOTAL').bold(false)
  builder.dashedLine()

  // 4. Items List
  items.forEach(it => {
    const name = String(it.name || it.product_name || 'Item')
    const qty = Number(it.qty || it.quantity || 1)
    const price = Number(it.price || it.unit_price || 0)
    const lineTotal = Number(it.total ?? (qty * price))
    
    builder.textLn(name)
    builder.twoColumnRow(`  ${qty} x N${price.toLocaleString()}`, `N${lineTotal.toLocaleString()}`)
  })

  builder.dashedLine()

  // 5. Totals
  builder.twoColumnRow('Subtotal:', `N${Math.round(subtotal).toLocaleString()}`)
  if (discount > 0) {
    builder.twoColumnRow('Discount:', `-N${Math.round(discount).toLocaleString()}`)
  }
  if (tax > 0) {
    builder.twoColumnRow('VAT (7.5%):', `N${Math.round(tax).toLocaleString()}`)
  }
  builder.doubleLine()
  builder.bold(true).size('tall')
    .twoColumnRow('TOTAL:', `N${Math.round(total).toLocaleString()}`, true)
    .size('normal').bold(false)
  builder.doubleLine()

  // 6. Tender Details
  builder.twoColumnRow('Payment Method:', method)
  if (method === 'Cash' && cashReceived > 0) {
    builder.twoColumnRow('Amount Tendered:', `N${Math.round(cashReceived).toLocaleString()}`)
    builder.bold(true).twoColumnRow('Change Due:', `N${Math.round(change).toLocaleString()}`, true).bold(false)
  }

  if (note) {
    builder.dashedLine().textLn('Note: ' + note)
  }

  // 7. Footer & Barcode
  builder.emptyLine(1)
  builder.align('center')
    .bold(true).textLn('THANK YOU FOR SHOPPING WITH US!').bold(false)
    .textLn('Freshness you can trust, every day.')
    .emptyLine(1)
    .barcode(receiptNumber, 36)
    .textLn(receiptNumber)
    .cut(true)

  const bytes = builder.getBytes()
  return await sendRawBytes(bytes)
}

/**
 * Fast Test Print to verify direct hardware link
 */
export async function testPrintDirect() {
  const builder = new ESCPOSBuilder(80)
  builder.align('center')
    .bold(true).size('double').textLn('BEMS FARMS POS').size('normal').bold(false)
    .textLn('Direct Hardware Print Test')
    .dashedLine()
    .align('left')
    .twoColumnRow('Status:', 'ONLINE & READY', true)
    .twoColumnRow('Connection:', 'Direct WebSerial / WebUSB')
    .twoColumnRow('Time:', new Date().toLocaleTimeString())
    .dashedLine()
    .align('center')
    .textLn('ESC/POS Command Engine: OK')
    .barcode('BF-TEST-001', 30)
    .textLn('BF-TEST-001')
    .cut(true)

  return await sendRawBytes(builder.getBytes())
}
