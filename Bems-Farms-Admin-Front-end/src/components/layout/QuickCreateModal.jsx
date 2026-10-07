import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'

export const CREATE_ACTIONS = [
  // ── 1. INVENTORY & RESTOCK ──
  {
    id: 'restock',
    title: 'Restock Inventory (Stock In)',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Inward PO',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'ri-download-cloud-2-line',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    path: '/inventory/stock-in',
    isPopular: true,
    keywords: ['restock', 'stock in', 'inward', 'purchase order', 'supplier', 'batches', 'farm harvest', 'inventory in', 'produce intake'],
    description: 'Record incoming supplier shipments, farm produce deliveries, unit purchase cost, batch lot numbers and storehouse receipt.',
  },
  {
    id: 'stock-out',
    title: 'Stock Out / Goods Issue',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Dispatch',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'ri-upload-cloud-2-line',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    path: '/inventory/stock-out',
    keywords: ['stock out', 'goods issue', 'requisition', 'kitchen', 'consumption', 'damages', 'spoilage', 'farm loss'],
    description: 'Issue stock for kitchen meal preparation, internal staff requisitions, sampling, or write-off expired farm perishables.',
  },
  {
    id: 'stock-adjustment',
    title: 'Stock Adjustment & Variance Recount',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Audit',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'ri-scales-3-line',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    path: '/inventory/adjustment',
    keywords: ['adjustment', 'variance', 'recount', 'audit', 'cycle count', 'stock discrepancy', 'inventory reconcile'],
    description: 'Perform physical cycle count corrections, resolve stock discrepancies, and record shrinkage or surplus adjustments.',
  },
  {
    id: 'stock-transfer',
    title: 'Inter-Warehouse Stock Transfer',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Logistics',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: 'ri-arrow-left-right-line',
    iconBg: '#E0F2FE',
    iconColor: '#0284C7',
    path: '/inventory/transfer',
    keywords: ['transfer', 'warehouse transfer', 'branch reload', 'relocate', 'farm to store', 'vehicle stock'],
    description: 'Transfer stock between farm central storage, cold rooms, retail outlet shelves, or mobile dispatch delivery vans.',
  },

  {
    id: 'purchase-schedule',
    title: 'Procurement & Restock Calendar Plan',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Planning',
    badgeCls: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: 'ri-calendar-event-line',
    iconBg: '#ECFEFF',
    iconColor: '#0891B2',
    path: '/inventory/schedule',
    keywords: ['schedule', 'procurement calendar', 'restock schedule', 'harvest plan', 'vendor booking', 'purchase plan'],
    description: 'Schedule upcoming harvest procurement dates, vendor restock shipments, and recurring agricultural orders.',
  },
  {
    id: 'new-warehouse',
    title: 'New Warehouse or Storage Location',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Facility',
    badgeCls: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'ri-building-line',
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    path: '/inventory/warehouses?action=new',
    keywords: ['warehouse', 'storage location', 'cold room', 'depot', 'storehouse', 'silo', 'bay', 'bin'],
    description: 'Add a new farm cold storage room, grain depot, dry storehouse, staging bay, or retail branch shelf location.',
  },
  {
    id: 'batch-expiry',
    title: 'Register Batch Lot & Freshness Expiry',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Freshness',
    badgeCls: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'ri-qr-code-line',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    path: '/inventory/batches',
    keywords: ['batch', 'lot', 'expiry', 'freshness', 'shelf life', 'production date', 'harvest date'],
    description: 'Log harvest batch codes, set automatic shelf-life expiry alerts, and monitor batch-specific inventory velocity.',
  },

  // ── 2. PRODUCTS & CATALOG ──
  {
    id: 'add-product',
    title: 'Add New Product SKU',
    category: 'Products & Catalog',
    categoryKey: 'products',
    badge: 'Catalog',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'ri-shopping-basket-2-line',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    path: '/products/add',
    isPopular: true,
    keywords: ['add product', 'new product', 'item', 'produce', 'vegetable', 'meat', 'sku', 'pricing', 'catalog'],
    description: 'Create a new farm or grocery product with images, retail price, wholesale tiers, barcode, and nutrition tags.',
  },
  {
    id: 'bulk-import-products',
    title: 'Bulk Import Products (CSV / Excel)',
    category: 'Products & Catalog',
    categoryKey: 'products',
    badge: 'Spreadsheet',
    badgeCls: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'ri-file-excel-2-line',
    iconBg: '#CCFBF1',
    iconColor: '#0F766E',
    path: '/products/add?mode=import',
    keywords: ['bulk import', 'csv import', 'excel upload', 'import products', 'mass upload', 'spreadsheet'],
    description: 'Upload hundreds of produce items, categories, and initial stock quantities at once using CSV or Excel templates.',
  },
  {
    id: 'new-category',
    title: 'New Product Category',
    category: 'Products & Catalog',
    categoryKey: 'products',
    badge: 'Hierarchy',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'ri-folder-add-line',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    path: '/products/categories?action=new',
    keywords: ['category', 'sub category', 'department', 'produce group', 'food category', 'grains', 'vegetables', 'tubers'],
    description: 'Create new store departments and produce groups (e.g., Fresh Tubers, Leafy Greens, Poultry, Cereals, Spices).',
  },
  {
    id: 'new-unit',
    title: 'New Unit of Measure (UOM)',
    category: 'Products & Catalog',
    categoryKey: 'products',
    badge: 'Metrics',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'ri-ruler-line',
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
    path: '/products/units?action=new',
    keywords: ['unit', 'uom', 'kg', 'crate', 'basket', 'bunch', 'tuber', 'measurement', 'bag', 'liter'],
    description: 'Configure standard and agricultural measurement units: Kilogram (KG), Crate, Basket, Tuber, Bunch, Bag, Liter.',
  },
  {
    id: 'generate-barcodes',
    title: 'Generate & Print Product Barcodes',
    category: 'Products & Catalog',
    categoryKey: 'products',
    badge: 'Thermal Labels',
    badgeCls: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'ri-barcode-box-line',
    iconBg: '#F1F5F9',
    iconColor: '#1E293B',
    path: '/products/barcode',
    keywords: ['barcode', 'sku stickers', 'price tags', 'print labels', 'thermal printer', 'scanner code'],
    description: 'Generate standard Code128 / EAN barcodes, print adhesive shelf price tags and scannable packaging stickers.',
  },

  // ── 3. SALES, BILLING & ORDERS ──
  {
    id: 'pos-sale',
    title: 'Point of Sale (Walk-in Counter Checkout)',
    category: 'Sales & Billing',
    categoryKey: 'sales',
    badge: 'Live Counter',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'ri-computer-line',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    path: '/pos',
    isPopular: true,
    keywords: ['pos', 'point of sale', 'walk-in', 'counter sale', 'cashier checkout', 'scanner', 'register sale', 'receipt'],
    description: 'Launch the cashier touch POS terminal for quick walk-in counter checkout, barcode scanning, POS receipt printing & split payments.',
  },
  {
    id: 'create-invoice',
    title: 'Create Commercial / Proforma Invoice',
    category: 'Sales & Billing',
    categoryKey: 'sales',
    badge: 'B2B & Retail',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'ri-file-list-3-line',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    path: '/orders/invoices?action=new',
    isPopular: true,
    keywords: ['invoice', 'proforma', 'bill', 'quotation', 'commercial invoice', 'payment request', 'b2b billing', 'corporate invoice'],
    description: 'Issue official Bems Farms branded proforma or commercial invoices with bank transfer account details, items list, and PDF download.',
  },
  {
    id: 'process-refund',
    title: 'Issue Customer Refund / Return',
    category: 'Sales & Billing',
    categoryKey: 'sales',
    badge: 'Returns',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'ri-refund-2-line',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    path: '/orders/refunds',
    keywords: ['refund', 'return', 'credit', 'defective produce', 'exchange', 'claim', 'money back'],
    description: 'Process customer returns for quality issues, credit customer store wallets or disburse bank transfer refunds.',
  },
  {
    id: 'new-direct-order',
    title: 'Manual Phone Order / Orders Pipeline',
    category: 'Sales & Billing',
    categoryKey: 'sales',
    badge: 'Orders Hub',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: 'ri-shopping-bag-3-line',
    iconBg: '#E0F2FE',
    iconColor: '#0369A1',
    path: '/orders',
    keywords: ['order', 'phone order', 'manual order', 'orders list', 'fulfill', 'dispatch queue'],
    description: 'Take manual phone / WhatsApp wholesale orders, review incoming customer carts, and advance fulfillment stages.',
  },

  // ── 4. TEAM, STAFF & ONBOARDING ──
  {
    id: 'invite-staff',
    title: 'Invite Staff / Digital Onboarding Link',
    category: 'Team & Onboarding',
    categoryKey: 'team',
    badge: 'Self-Serve',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'ri-mail-send-line',
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    path: '/onboarding?tab=onboarding',
    isPopular: true,
    keywords: ['onboarding', 'invite staff', 'send invite', 'new employee', 'team invite', 'invitation link', 'onboard'],
    description: 'Send an email or magic invitation link to new team members with pre-assigned roles to complete self-service password setup.',
  },
  {
    id: 'add-staff-direct',
    title: 'Direct Add Staff Profile & Credentials',
    category: 'Team & Onboarding',
    categoryKey: 'team',
    badge: 'Admin Desk',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'ri-user-add-line',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    path: '/onboarding?tab=staff',
    keywords: ['add staff', 'create employee', 'new staff', 'worker account', 'credentials', 'cashier account', 'manager account'],
    description: 'Manually create an employee profile, assign default branch, enter contact info, and set up system access credentials immediately.',
  },
  {
    id: 'create-role',
    title: 'New Role & Permission Matrix',
    category: 'Team & Onboarding',
    categoryKey: 'team',
    badge: 'Security',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'ri-shield-user-line',
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
    path: '/onboarding?tab=roles',
    keywords: ['role', 'permission', 'access control', 'custom role', 'cashier role', 'rider role', 'privileges'],
    description: 'Create custom job roles (e.g., Farm Manager, Senior Cashier, Dispatch Lead) with granular module access permissions.',
  },

  // ── 5. DELIVERIES & FLEET ──
  {
    id: 'add-driver',
    title: 'Register Delivery Driver / Rider',
    category: 'Deliveries & Fleet',
    categoryKey: 'deliveries',
    badge: 'Fleet',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'ri-e-bike-2-line',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    path: '/deliveries/drivers?action=new',
    keywords: ['driver', 'rider', 'courier', 'dispatch rider', 'onboard driver', 'delivery fleet', 'motorcycle'],
    description: 'Onboard a delivery rider, log vehicle plate, driver license number, assigned phone number, and emergency contacts.',
  },
  {
    id: 'add-zone',
    title: 'New Delivery Zone & Shipping Tariff',
    category: 'Deliveries & Fleet',
    categoryKey: 'deliveries',
    badge: 'Coverage',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'ri-map-pin-add-line',
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    path: '/deliveries/zones?action=new',
    keywords: ['zone', 'delivery zone', 'shipping rate', 'coverage', 'delivery fee', 'eta', 'neighborhood', 'tariff'],
    description: 'Set up neighborhood delivery polygons, base delivery fees, estimated transit durations, and driver delivery commission rates.',
  },
  {
    id: 'active-dispatch',
    title: 'Live Fleet Dispatch & Assignment',
    category: 'Deliveries & Fleet',
    categoryKey: 'deliveries',
    badge: 'Live Map',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
    icon: 'ri-route-line',
    iconBg: '#E0F2FE',
    iconColor: '#0284C7',
    path: '/deliveries/active',
    keywords: ['dispatch', 'assign driver', 'live delivery', 'tracking', 'rider assignment', 'fleet telemetry'],
    description: 'Pair packed grocery bags with online delivery drivers, manage batch dispatches, and trace live delivery coordinates.',
  },

  // ── 6. FINANCE & ACCOUNTS ──
  {
    id: 'record-income',
    title: 'Record External Revenue / Farm Income',
    category: 'Finance & Accounts',
    categoryKey: 'finance',
    badge: 'Revenue',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'ri-money-dollar-circle-line',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    path: '/accounts/income',
    keywords: ['income', 'revenue', 'deposit', 'farm grant', 'wholesale receipt', 'subsidy', 'external funds'],
    description: 'Record external revenue inflows, commercial farm contract payments, agricultural grants, and miscellaneous income.',
  },
  {
    id: 'internal-transfer',
    title: 'Internal Bank & Operating Fund Transfer',
    category: 'Finance & Accounts',
    categoryKey: 'finance',
    badge: 'Treasury',
    badgeCls: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    icon: 'ri-swap-box-line',
    iconBg: '#ECFEFF',
    iconColor: '#0891B2',
    path: '/accounts/transfer',
    keywords: ['transfer', 'bank transfer', 'internal transfer', 'move funds', 'treasury', 'petty cash'],
    description: 'Execute and record fund movements between company bank accounts (e.g. Moniepoint POS collection to Zenith operating account).',
  },
  {
    id: 'add-bank',
    title: 'Add Official Settlement Bank Account',
    category: 'Finance & Accounts',
    categoryKey: 'finance',
    badge: 'Settlement',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'ri-bank-line',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    path: '/accounts/bank?action=new',
    keywords: ['bank account', 'settlement', 'zenith', 'moniepoint', 'gtbank', 'account number', 'add bank'],
    description: 'Add and configure corporate commercial bank accounts for invoice payment receipts, POS payouts, and payroll.',
  },
  {
    id: 'wallet-adjustment',
    title: 'Customer & Driver Wallet Credit / Top-Up',
    category: 'Finance & Accounts',
    categoryKey: 'finance',
    badge: 'Ledger',
    badgeCls: 'bg-purple-50 text-purple-700 border-purple-200',
    icon: 'ri-wallet-3-line',
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
    path: '/accounts/wallets',
    keywords: ['wallet', 'credit wallet', 'fund wallet', 'top up', 'driver balance', 'customer balance', 'store credit'],
    description: 'Credit customer wallets, top up prepaid accounts, or review driver payout escrow balances and transactions.',
  },
  {
    id: 'driver-commissions',
    title: 'Process Driver Commission Payout Run',
    category: 'Finance & Accounts',
    categoryKey: 'finance',
    badge: 'Disbursement',
    badgeCls: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'ri-hand-coin-line',
    iconBg: '#ECFDF5',
    iconColor: '#059669',
    path: '/accounts/commissions',
    keywords: ['commission', 'driver payout', 'rider wage', 'payout run', 'disburse earnings', 'weekly payout'],
    description: 'Audit completed deliveries, calculate delivery fee commissions, approve payout batches, and mark disbursements.',
  },

  // ── 7. CUSTOMERS & CRM ──
  {
    id: 'add-customer',
    title: 'Register New Customer Account',
    category: 'Customers & CRM',
    categoryKey: 'customers',
    badge: 'CRM Profile',
    badgeCls: 'bg-pink-50 text-pink-700 border-pink-200',
    icon: 'ri-user-smile-line',
    iconBg: '#FCE7F3',
    iconColor: '#DB2777',
    path: '/customers/add',
    isPopular: true,
    keywords: ['add customer', 'register customer', 'new client', 'shopper', 'crm', 'delivery address', 'contact'],
    description: 'Manually register a corporate or individual client profile, default delivery address, phone number, and tier.',
  },
  {
    id: 'customer-broadcast',
    title: 'New Customer Broadcast Campaign',
    category: 'Customers & CRM',
    categoryKey: 'customers',
    badge: 'Outreach',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'ri-broadcast-line',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    path: '/customers/broadcasts',
    keywords: ['broadcast', 'marketing campaign', 'sms blast', 'whatsapp message', 'push alert', 'customer announcement'],
    description: 'Broadcast promotional alerts, fresh harvest arrival announcements, or seasonal discounts to targeted customer groups via SMS & app.',
  },
  {
    id: 'customer-message',
    title: 'Direct Customer Support Chat',
    category: 'Customers & CRM',
    categoryKey: 'customers',
    badge: 'Live Chat',
    badgeCls: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: 'ri-message-3-line',
    iconBg: '#EEF2FF',
    iconColor: '#4F46E5',
    path: '/customers/messages',
    keywords: ['message', 'chat', 'support', 'inquiry', 'customer conversation', 'ticket', 'complaint'],
    description: 'Communicate directly with registered buyers about specific order questions, custom basket requests, or delivery queries.',
  },
  {
    id: 'credit-loyalty',
    title: 'Award Customer Loyalty Reward Points',
    category: 'Customers & CRM',
    categoryKey: 'customers',
    badge: 'Rewards',
    badgeCls: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: 'ri-medal-line',
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    path: '/customers/loyalty',
    keywords: ['loyalty', 'points', 'rewards', 'vip customer', 'reward points', 'bonus pts', 'loyalty points'],
    description: 'Reward VIP clients or offer service recovery loyalty points that can be redeemed for discounts on fresh food orders.',
  },

  // ── 8. CHEF BEMS AI CULINARY ENGINE ──
  {
    id: 'chef-meal',
    title: 'Add Recipe / Meal to Chef Bems AI',
    category: 'Chef Bems AI',
    categoryKey: 'chef-bems',
    badge: 'Culinary AI',
    badgeCls: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: 'ri-restaurant-line',
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    path: '/chef-bems/meals?action=new',
    keywords: ['recipe', 'meal', 'chef bems', 'nigerian soup', 'ingredients', 'jollof', 'afang', 'cooking plan'],
    description: 'Teach Chef Bems a traditional or modern recipe (e.g. Afang Soup, Ofe Nsala, Jollof Rice) and link essential ingredients.',
  },
  {
    id: 'chef-substitution',
    title: 'Add Ingredient Substitution Rule',
    category: 'Chef Bems AI',
    categoryKey: 'chef-bems',
    badge: 'Smart Sub',
    badgeCls: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: 'ri-repeat-line',
    iconBg: '#CCFBF1',
    iconColor: '#0F766E',
    path: '/chef-bems/substitutions?action=new',
    keywords: ['substitution', 'ingredient replacement', 'out of stock rule', 'cooking substitute', 'chef ai'],
    description: 'Define automated culinary replacements when fresh items are seasonal or temporarily out-of-stock.',
  },
  {
    id: 'chef-dietary',
    title: 'Add Dietary & Nutritional Health Rule',
    category: 'Chef Bems AI',
    categoryKey: 'chef-bems',
    badge: 'Diet Health',
    badgeCls: 'bg-rose-50 text-rose-700 border-rose-200',
    icon: 'ri-heart-pulse-line',
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    path: '/chef-bems/dietary-rules?action=new',
    keywords: ['dietary rule', 'nutrition', 'diabetic', 'keto', 'low sodium', 'high fiber', 'weight loss'],
    description: 'Set dietary logic for medical or lifestyle eating habits (Diabetic-safe, Low-GI, Low-Sodium, Keto, High-Protein).',
  },
  {
    id: 'chef-allergy',
    title: 'Add Allergy Warning & Exclusion Rule',
    category: 'Chef Bems AI',
    categoryKey: 'chef-bems',
    badge: 'Safety Filter',
    badgeCls: 'bg-red-50 text-red-700 border-red-200',
    icon: 'ri-shield-cross-line',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    path: '/chef-bems/allergy-rules?action=new',
    keywords: ['allergy', 'allergen', 'safety filter', 'peanuts', 'shellfish', 'dairy', 'gluten', 'crayfish allergy'],
    description: 'Enforce hard allergen exclusion rules (e.g. Shellfish, Peanuts, Crayfish) to safeguard customer wellness across meal plans.',
  },

  // ── 9. SETTINGS & MARKETING ──
  {
    id: 'new-coupon',
    title: 'Create Promo Code / Discount Coupon',
    category: 'Marketing & Settings',
    categoryKey: 'settings',
    badge: 'Promotion',
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: 'ri-coupon-3-line',
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    path: '/settings/coupons?action=new',
    keywords: ['coupon', 'discount', 'promo code', 'voucher', 'percentage off', 'sale promotion'],
    description: 'Create promotional discount codes (% or fixed ₦ amount off), minimum cart spending thresholds, and usage limits.',
  },
  {
    id: 'tax-rule',
    title: 'Configure Tax / VAT Rule',
    category: 'Marketing & Settings',
    categoryKey: 'settings',
    badge: 'Compliance',
    badgeCls: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: 'ri-percent-line',
    iconBg: '#F1F5F9',
    iconColor: '#475569',
    path: '/settings/tax',
    keywords: ['tax', 'vat', 'tax rate', 'levy', 'agricultural tax', 'billing tax'],
    description: 'Configure official VAT (7.5%), agricultural produce exemptions, and automated line-item tax calculations on orders.',
  },
  {
    id: 'invoice-settings',
    title: 'Invoice Layout, Stamp & Payment Rules',
    category: 'Marketing & Settings',
    categoryKey: 'settings',
    badge: 'Branding',
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: 'ri-file-settings-line',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    path: '/settings/invoices',
    keywords: ['invoice settings', 'company stamp', 'seal', 'payment terms', 'bank branding', 'header logo'],
    description: 'Upload official company authorization signature, seal, default bank payout note, and payment grace period rules.',
  },
]

export const CATEGORIES = [
  { key: 'all', label: 'All Operations', icon: 'ri-apps-2-line' },
  { key: 'inventory', label: 'Inventory & Restock', icon: 'ri-archive-line' },
  { key: 'products', label: 'Products & Catalog', icon: 'ri-shopping-basket-line' },
  { key: 'sales', label: 'Sales & Billing', icon: 'ri-file-list-3-line' },
  { key: 'team', label: 'Team & Onboarding', icon: 'ri-team-line' },
  { key: 'deliveries', label: 'Deliveries & Fleet', icon: 'ri-truck-line' },
  { key: 'finance', label: 'Finance & Accounts', icon: 'ri-bank-card-line' },
  { key: 'customers', label: 'Customers & CRM', icon: 'ri-user-heart-line' },
  { key: 'chef-bems', label: 'Chef Bems AI', icon: 'ri-restaurant-line' },
  { key: 'settings', label: 'Settings & Rules', icon: 'ri-settings-4-line' },
]

export default function QuickCreateModal({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const searchInputRef = useRef(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 80)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setSearch('')
      setActiveCategory('all')
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: CREATE_ACTIONS.length }
    CATEGORIES.forEach((cat) => {
      if (cat.key !== 'all') {
        counts[cat.key] = CREATE_ACTIONS.filter((a) => a.categoryKey === cat.key).length
      }
    })
    return counts
  }, [])

  // Filter actions
  const filteredActions = useMemo(() => {
    let list = CREATE_ACTIONS

    if (activeCategory !== 'all') {
      list = list.filter((a) => a.categoryKey === activeCategory)
    }

    const q = search.trim().toLowerCase()
    if (!q) return list

    return list.filter((a) => {
      const matchTitle = a.title.toLowerCase().includes(q)
      const matchCategory = a.category.toLowerCase().includes(q)
      const matchDesc = a.description.toLowerCase().includes(q)
      const matchKeywords = a.keywords.some((kw) => kw.toLowerCase().includes(q))
      return matchTitle || matchCategory || matchDesc || matchKeywords
    })
  }, [search, activeCategory])

  const popularActions = useMemo(() => {
    return CREATE_ACTIONS.filter((a) => a.isPopular)
  }, [])

  const handleSelect = (path) => {
    onClose()
    navigate(path)
  }

  if (!isOpen) return null

  const currentCategoryObj = CATEGORIES.find((c) => c.key === activeCategory) || CATEGORIES[0]

  // Render an individual action row (spacious, non-cramped, full width)
  const renderActionRow = (action) => (
    <div
      key={action.id}
      className="quick-action-row p-3 rounded-3 bg-white border d-flex align-items-center justify-content-between gap-3 shadow-xs mb-2.5"
      style={{
        borderColor: '#EAE6DF',
        cursor: 'pointer',
      }}
      onClick={() => handleSelect(action.path)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSelect(action.path)
      }}
    >
      {/* Left Icon + Text Information */}
      <div className="d-flex align-items-center gap-3 min-w-0 flex-grow-1">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            backgroundColor: action.iconBg,
            color: action.iconColor,
          }}
        >
          <i className={`${action.icon} fs-22`}></i>
        </div>

        <div className="min-w-0 flex-grow-1">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span className="fw-bold text-dark font-display action-title" style={{ fontSize: '0.94rem', letterSpacing: '-0.01em' }}>
              {action.title}
            </span>
            <span
              className="badge px-2 py-0.5 rounded-pill flex-shrink-0"
              style={{
                backgroundColor: action.iconBg,
                color: action.iconColor,
                border: '1px solid rgba(0,0,0,0.06)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.02em',
              }}
            >
              {action.badge || action.category.split('&')[0].trim()}
            </span>
          </div>

          <p
            className="text-muted mb-0 action-desc"
            style={{
              fontSize: '0.80rem',
              lineHeight: 1.45,
              color: '#64748B',
              margin: 0,
            }}
          >
            {action.description}
          </p>
        </div>
      </div>

      {/* Right Launch Action */}
      <div className="d-flex align-items-center gap-2.5 flex-shrink-0 ps-2">
        <span
          className="d-none d-xl-inline-block px-2 py-1 rounded bg-light text-muted border"
          style={{ fontSize: '0.72rem', fontWeight: 550 }}
        >
          {action.category}
        </span>
        <div
          className="action-pill-btn d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            backgroundColor: '#F8FAFC',
            color: '#64748B',
            border: '1px solid #E2E8F0',
          }}
        >
          <i className="ri-arrow-right-line fs-16"></i>
        </div>
      </div>
    </div>
  )

  return createPortal(
    <div
      className="position-fixed inset-0 d-flex align-items-center justify-content-center p-2 p-sm-3 p-md-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        backgroundColor: 'rgba(7, 31, 20, 0.68)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'quickModalFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-2xl w-100 d-flex flex-column"
        style={{
          maxWidth: 1120,
          height: 'min(760px, 92vh)',
          borderRadius: '1.25rem',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: '0 35px 90px -20px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.15)',
          animation: 'quickModalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Executive Command Bar ── */}
        <div
          className="px-3 px-md-4 py-3 d-flex align-items-center justify-content-between gap-3 border-bottom position-relative"
          style={{
            backgroundColor: '#FFFFFF',
            borderBottomColor: '#E2E8F0',
          }}
        >
          {/* Logo / Hub Title */}
          <div className="d-flex align-items-center gap-2.5 flex-shrink-0">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, #143C2D 0%, #071F14 100%)',
                color: '#F59E0B',
                boxShadow: '0 2px 8px rgba(20, 60, 45, 0.25)',
              }}
            >
              <i className="ri-flashlight-fill fs-18"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold font-display text-dark" style={{ fontSize: '1.05rem', letterSpacing: '-0.02em' }}>
                  Creation Center
                </span>
                <span
                  className="badge px-2 py-0.5 rounded-pill"
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {CREATE_ACTIONS.length} Actions
                </span>
              </div>
              <span className="text-muted d-none d-sm-inline" style={{ fontSize: '0.73rem' }}>
                Instant shortcuts across all store operations
              </span>
            </div>
          </div>

          {/* Large Command Search Input */}
          <div className="flex-grow-1 position-relative" style={{ maxWidth: 540 }}>
            <i
              className="ri-search-line position-absolute"
              style={{ left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#94A3B8' }}
            ></i>
            <input
              ref={searchInputRef}
              type="text"
              className="form-control ps-5 pe-5 shadow-none border"
              style={{
                height: 42,
                borderRadius: '9999px',
                fontSize: '0.88rem',
                backgroundColor: '#F8FAFC',
                borderColor: '#E2E8F0',
                transition: 'all 0.15s ease',
              }}
              placeholder="Search by action, keyword, or document type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                className="btn btn-sm btn-link position-absolute text-muted text-decoration-none p-0"
                style={{ right: 12, top: '50%', transform: 'translateY(-50%)', width: 22, height: 22 }}
                onClick={() => setSearch('')}
                title="Clear Search"
              >
                <i className="ri-close-circle-fill fs-16"></i>
              </button>
            ) : (
              <span
                className="position-absolute text-muted d-none d-md-inline"
                style={{
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 10,
                  fontWeight: 600,
                  background: '#FFFFFF',
                  padding: '2px 6px',
                  borderRadius: 4,
                  border: '1px solid #CBD5E1',
                }}
              >
                ESC
              </span>
            )}
          </div>

          {/* Close Action */}
          <button
            type="button"
            className="btn btn-sm btn-light border-0 rounded-circle text-muted flex-shrink-0"
            onClick={onClose}
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close (Esc)"
          >
            <i className="ri-close-line fs-20"></i>
          </button>
        </div>

        {/* ── Main Two-Pane Split Studio ── */}
        <div className="flex-grow-1 d-flex overflow-hidden" style={{ minHeight: 0 }}>
          {/* ── Left Category Rail (240px) ── */}
          <div
            className="d-none d-md-flex flex-column border-end flex-shrink-0 py-3 px-2 overflow-y-auto"
            style={{
              width: 245,
              backgroundColor: '#FBFBFA',
              borderColor: '#EFECE6',
            }}
          >
            <div className="px-3 mb-2">
              <span className="text-uppercase text-muted fw-bold" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
                Department Filter
              </span>
            </div>

            <div className="d-flex flex-column gap-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key
                const count = categoryCounts[cat.key]
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`btn text-start d-flex align-items-center justify-content-between px-3 py-2 rounded-3 border-0 transition-all ${
                      isActive ? 'active-cat-btn' : 'inactive-cat-btn'
                    }`}
                    style={{
                      fontSize: '0.82rem',
                      fontWeight: isActive ? 700 : 550,
                      position: 'relative',
                    }}
                    onClick={() => {
                      setActiveCategory(cat.key)
                    }}
                  >
                    <div className="d-flex align-items-center gap-2.5 min-w-0">
                      <i className={`${cat.icon} fs-16 ${isActive ? 'text-warning' : 'text-muted'}`}></i>
                      <span className="text-truncate">{cat.label}</span>
                    </div>

                    <span
                      className={`badge rounded-pill ${
                        isActive ? 'bg-white text-dark' : 'bg-light text-secondary border'
                      }`}
                      style={{ fontSize: 10, padding: '2px 7px' }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Bottom Tip Card with high contrast shortcut badge */}
            <div className="mt-auto px-2 pt-3">
              <div
                className="p-2.5 rounded-3 border text-start"
                style={{
                  backgroundColor: '#F0FDF4',
                  borderColor: '#DCFCE7',
                }}
              >
                <div className="d-flex align-items-center gap-1.5 text-success fw-bold mb-1" style={{ fontSize: 11 }}>
                  <i className="ri-keyboard-line"></i>
                  <span>Global Shortcut</span>
                </div>
                <div className="d-flex align-items-center gap-1.5 mt-1">
                  <span
                    className="d-inline-flex align-items-center justify-content-center fw-bold shadow-xs"
                    style={{
                      padding: '2px 7px',
                      fontSize: 11,
                      background: '#FFFFFF',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    Alt
                  </span>
                  <span className="text-muted fw-bold" style={{ fontSize: 11 }}>+</span>
                  <span
                    className="d-inline-flex align-items-center justify-content-center fw-bold shadow-xs"
                    style={{
                      padding: '2px 7px',
                      fontSize: 11,
                      background: '#FFFFFF',
                      color: '#0F172A',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    }}
                  >
                    N
                  </span>
                  <span className="text-muted ms-1" style={{ fontSize: 10.5 }}>opens hub</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right Content Canvas (Scrollable) ── */}
          <div
            className="flex-grow-1 overflow-y-auto p-3 p-md-4"
            style={{
              backgroundColor: '#FAF8F5',
            }}
          >
            {/* Mobile Category Horizontal Pills (visible only < 768px) */}
            <div className="d-flex d-md-none overflow-x-auto gap-1.5 pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.key
                return (
                  <button
                    key={cat.key}
                    type="button"
                    className={`btn btn-sm text-nowrap rounded-pill px-3 py-1 ${
                      isActive ? 'btn-primary-bf text-white' : 'btn-white text-dark border'
                    }`}
                    style={{ fontSize: '0.76rem' }}
                    onClick={() => setActiveCategory(cat.key)}
                  >
                    {cat.label} ({categoryCounts[cat.key]})
                  </button>
                )
              })}
            </div>

            {/* Quick Launch Chips Bar (only on 'all' view and when not actively searching) */}
            {!search.trim() && activeCategory === 'all' && (
              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div className="d-flex align-items-center gap-1.5">
                    <span className="text-uppercase text-muted fw-bold" style={{ fontSize: 11, letterSpacing: '0.05em' }}>
                      ⚡ High-Frequency Starters
                    </span>
                    <span className="badge bg-warning-subtle text-warning" style={{ fontSize: 10 }}>1-Click</span>
                  </div>
                </div>

                <div className="row g-2">
                  {popularActions.slice(0, 6).map((pop) => (
                    <div key={`hero-${pop.id}`} className="col-6 col-sm-4 col-lg-2">
                      <div
                        className="quick-chip p-2.5 rounded-3 bg-white border d-flex flex-column justify-content-between h-100 shadow-xs cursor-pointer"
                        style={{
                          borderColor: '#E8E5DF',
                          cursor: 'pointer',
                          minHeight: 82,
                        }}
                        onClick={() => handleSelect(pop.path)}
                      >
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div
                            className="rounded-2 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{
                              width: 28,
                              height: 28,
                              backgroundColor: pop.iconBg,
                              color: pop.iconColor,
                            }}
                          >
                            <i className={`${pop.icon} fs-15`}></i>
                          </div>
                          <i className="ri-arrow-right-up-line text-muted fs-14"></i>
                        </div>

                        <div>
                          <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.80rem', letterSpacing: '-0.01em' }}>
                            {pop.title.replace(/\s*\(.*?\)\s*/g, '')}
                          </div>
                          <div className="text-muted text-truncate" style={{ fontSize: '0.68rem' }}>
                            {pop.badge}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Section Title */}
            <div className="d-flex align-items-center justify-content-between mb-3 pb-1 border-bottom">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold text-dark font-display" style={{ fontSize: '0.98rem' }}>
                  {search.trim() ? (
                    <>
                      Search Results for "<strong>{search}</strong>"
                    </>
                  ) : (
                    <>
                      <i className={`${currentCategoryObj.icon} text-primary me-1.5`}></i>
                      {currentCategoryObj.label}
                    </>
                  )}
                </span>
                <span className="badge bg-secondary-subtle text-secondary" style={{ fontSize: 11 }}>
                  {filteredActions.length} available
                </span>
              </div>

              {search && (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-muted text-decoration-none p-0"
                  style={{ fontSize: '0.78rem' }}
                  onClick={() => setSearch('')}
                >
                  Clear search
                </button>
              )}
            </div>

            {/* Empty Search State */}
            {filteredActions.length === 0 ? (
              <div className="text-center py-5">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                  style={{ width: 64, height: 64, backgroundColor: '#F1F5F9', color: '#94A3B8' }}
                >
                  <i className="ri-search-2-line fs-28"></i>
                </div>
                <h6 className="fw-bold text-dark mb-1">No matching action found</h6>
                <p className="text-muted mb-3" style={{ fontSize: '0.84rem' }}>
                  Nothing matched "<strong>{search}</strong>" in {currentCategoryObj.label}.
                </p>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                  onClick={() => {
                    setSearch('')
                    setActiveCategory('all')
                  }}
                >
                  View All Operations
                </button>
              </div>
            ) : (
              /* Content List: Either categorized departments (when on 'all' without search) OR direct rows */
              !search.trim() && activeCategory === 'all' ? (
                // Grouped by Department
                <div>
                  {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => {
                    const groupActions = filteredActions.filter((a) => a.categoryKey === cat.key)
                    if (groupActions.length === 0) return null

                    return (
                      <div key={`group-${cat.key}`} className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-2 pb-1 border-bottom">
                          <div className="d-flex align-items-center gap-2">
                            <i className={`${cat.icon} fs-16 text-success`}></i>
                            <span className="fw-bold text-dark" style={{ fontSize: '0.86rem', letterSpacing: '-0.01em' }}>
                              {cat.label}
                            </span>
                            <span className="badge rounded-pill bg-light text-muted border" style={{ fontSize: 10 }}>
                              {groupActions.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-link text-decoration-none p-0 text-muted"
                            style={{ fontSize: '0.74rem' }}
                            onClick={() => setActiveCategory(cat.key)}
                          >
                            Focus {cat.label} →
                          </button>
                        </div>

                        <div>
                          {groupActions.map((action) => renderActionRow(action))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                // Filtered or Search View
                <div>
                  {filteredActions.map((action) => renderActionRow(action))}
                </div>
              )
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="px-4 py-2.5 bg-white border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ fontSize: '0.78rem', color: '#64748B', borderColor: '#E2E8F0' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="d-inline-flex align-items-center gap-1.5 text-success fw-semibold">
              <span className="rounded-circle bg-success" style={{ width: 6, height: 6 }}></span>
              Bems Farms Creation Center
            </span>
            <span className="text-muted d-none d-sm-inline">•</span>
            <span className="text-muted d-none d-sm-inline">
              Click any item to jump directly into creation mode
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary px-3 py-1 rounded-pill"
              onClick={onClose}
              style={{ fontSize: '0.76rem' }}
            >
              Close Hub (Esc)
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .active-cat-btn {
          background: linear-gradient(135deg, #143C2D 0%, #071F14 100%) !important;
          color: #FFFFFF !important;
          box-shadow: 0 4px 12px rgba(20, 60, 45, 0.22);
        }
        .active-cat-btn::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 3.5px;
          background-color: #F59E0B;
          border-radius: 0 4px 4px 0;
        }
        .inactive-cat-btn {
          background: transparent;
          color: #475569;
        }
        .inactive-cat-btn:hover {
          background: #EDEAE5 !important;
          color: #0F172A !important;
        }
        .quick-action-row {
          transition: all 0.16s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .quick-action-row:hover {
          transform: translateY(-1.5px);
          border-color: #143C2D !important;
          box-shadow: 0 6px 18px -4px rgba(20, 60, 45, 0.15) !important;
          background-color: #FAFCFA !important;
        }
        .quick-action-row:hover .action-pill-btn {
          background-color: #143C2D !important;
          color: #FFFFFF !important;
          border-color: #143C2D !important;
          transform: translateX(3px);
        }
        .action-pill-btn {
          transition: all 0.15s ease;
        }
        .quick-chip {
          transition: all 0.16s ease;
        }
        .quick-chip:hover {
          transform: translateY(-2px);
          border-color: #143C2D !important;
          box-shadow: 0 4px 14px rgba(20, 60, 45, 0.12) !important;
          background-color: #FAFCFA !important;
        }
        @keyframes quickModalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes quickModalScaleIn {
          from { opacity: 0; transform: scale(0.97) translateY(6px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  )
}

