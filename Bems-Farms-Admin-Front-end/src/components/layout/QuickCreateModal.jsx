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
    badgeCls: 'bg-success-subtle text-success border border-success-subtle',
    icon: 'ri-download-cloud-2-line',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    path: '/inventory/stock-in',
    isPopular: true,
    keywords: ['restock', 'stock in', 'inward', 'purchase order', 'supplier', 'batches', 'farm harvest', 'inventory in', 'produce intake'],
    description: 'Record incoming supplier shipments, farm produce deliveries, unit cost, batch lot numbers and storehouse receipt.',
  },
  {
    id: 'stock-out',
    title: 'Stock Out / Goods Issue',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Dispatch',
    badgeCls: 'bg-warning-subtle text-warning border border-warning-subtle',
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
    badgeCls: 'bg-indigo-subtle text-indigo border border-indigo-subtle',
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
    badgeCls: 'bg-info-subtle text-info border border-info-subtle',
    icon: 'ri-arrow-left-right-line',
    iconBg: '#E0F2FE',
    iconColor: '#0284C7',
    path: '/inventory/transfer',
    keywords: ['transfer', 'warehouse transfer', 'branch reload', 'relocate', 'farm to store', 'vehicle stock'],
    description: 'Transfer stock between farm central storage, cold rooms, retail outlet shelves, or mobile dispatch delivery vans.',
  },
  {
    id: 'debulk',
    title: 'Debulk Bulk Bags into Retail Units',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Processing',
    badgeCls: 'bg-purple-subtle text-purple border border-purple-subtle',
    icon: 'ri-layout-grid-line',
    iconBg: '#F3E8FF',
    iconColor: '#7E22CE',
    path: '/inventory/debulk',
    keywords: ['debulk', 'repack', 'bag breakdown', 'wholesale to retail', 'packaging', 'tuber sack', 'grains sack'],
    description: 'Transform bulk wholesale farm sacks (e.g., 50kg/100kg bag of rice, garri, beans) into retail packaged sizes (1kg, 2kg, 5kg).',
  },
  {
    id: 'purchase-schedule',
    title: 'Procurement & Restock Calendar Plan',
    category: 'Inventory & Restock',
    categoryKey: 'inventory',
    badge: 'Planning',
    badgeCls: 'bg-cyan-subtle text-cyan border border-cyan-subtle',
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
    badgeCls: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
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
    badgeCls: 'bg-emerald-subtle text-emerald border border-emerald-subtle',
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
    badgeCls: 'bg-success-subtle text-success border border-success-subtle',
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
    badgeCls: 'bg-teal-subtle text-teal border border-teal-subtle',
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
    badgeCls: 'bg-warning-subtle text-warning border border-warning-subtle',
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
    badgeCls: 'bg-purple-subtle text-purple border border-purple-subtle',
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
    badgeCls: 'bg-dark-subtle text-dark border border-dark-subtle',
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
    badgeCls: 'bg-success-subtle text-success border border-success-subtle',
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
    badgeCls: 'bg-primary-subtle text-primary border border-primary-subtle',
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
    badgeCls: 'bg-danger-subtle text-danger border border-danger-subtle',
    icon: 'ri-refund-2-line',
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    path: '/orders/refunds',
    keywords: ['refund', 'return', 'credit', 'defective produce', 'exchange', 'claim', 'money back'],
    description: 'Process customer returns for quality issues, credit customer store wallets or disburse bank transfer refunds.',
  },
  {
    id: 'new-direct-order',
    title: 'Manual Phone Order / View Pipeline',
    category: 'Sales & Billing',
    categoryKey: 'sales',
    badge: 'Orders Hub',
    badgeCls: 'bg-sky-subtle text-sky border border-sky-subtle',
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
    badgeCls: 'bg-primary-subtle text-primary border border-primary-subtle',
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
    badgeCls: 'bg-indigo-subtle text-indigo border border-indigo-subtle',
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
    badgeCls: 'bg-purple-subtle text-purple border border-purple-subtle',
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
    category: 'Deliveries & Logistics',
    categoryKey: 'deliveries',
    badge: 'Fleet',
    badgeCls: 'bg-success-subtle text-success border border-success-subtle',
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
    category: 'Deliveries & Logistics',
    categoryKey: 'deliveries',
    badge: 'Coverage',
    badgeCls: 'bg-rose-subtle text-rose border border-rose-subtle',
    icon: 'ri-map-pin-add-line',
    iconBg: '#FFE4E6',
    iconColor: '#E11D48',
    path: '/deliveries/zones?action=new',
    keywords: ['zone', 'delivery zone', 'shipping rate', 'coverage', 'delivery fee', 'eta', 'neighborhood', 'tariff'],
    description: 'Set up neighborhood delivery polygons, base delivery fees, estimated transit durations, and driver delivery commission rates.',
  },
  {
    id: 'active-dispatch',
    title: 'Live Dispatch & Order Assignment',
    category: 'Deliveries & Logistics',
    categoryKey: 'deliveries',
    badge: 'Live Map',
    badgeCls: 'bg-info-subtle text-info border border-info-subtle',
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
    badgeCls: 'bg-success-subtle text-success border border-success-subtle',
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
    badgeCls: 'bg-cyan-subtle text-cyan border border-cyan-subtle',
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
    badgeCls: 'bg-warning-subtle text-warning border border-warning-subtle',
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
    badgeCls: 'bg-purple-subtle text-purple border border-purple-subtle',
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
    badgeCls: 'bg-emerald-subtle text-emerald border border-emerald-subtle',
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
    badgeCls: 'bg-pink-subtle text-pink border border-pink-subtle',
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
    badgeCls: 'bg-blue-subtle text-blue border border-blue-subtle',
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
    badgeCls: 'bg-indigo-subtle text-indigo border border-indigo-subtle',
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
    badgeCls: 'bg-warning-subtle text-warning border border-warning-subtle',
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
    badgeCls: 'bg-orange-subtle text-orange border border-orange-subtle',
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
    badgeCls: 'bg-teal-subtle text-teal border border-teal-subtle',
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
    badgeCls: 'bg-rose-subtle text-rose border border-rose-subtle',
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
    badgeCls: 'bg-danger-subtle text-danger border border-danger-subtle',
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
    badgeCls: 'bg-success-subtle text-success border border-success-subtle',
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
    badgeCls: 'bg-slate-subtle text-slate border border-slate-subtle',
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
    badgeCls: 'bg-primary-subtle text-primary border border-primary-subtle',
    icon: 'ri-file-settings-line',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    path: '/settings/invoices',
    keywords: ['invoice settings', 'company stamp', 'seal', 'payment terms', 'bank branding', 'header logo'],
    description: 'Upload official company authorization signature, seal, default bank payout note, and payment grace period rules.',
  },
]

export const CATEGORIES = [
  { key: 'all', label: 'All Actions' },
  { key: 'inventory', label: 'Inventory & Restock' },
  { key: 'products', label: 'Products & Catalog' },
  { key: 'sales', label: 'Sales & Billing' },
  { key: 'team', label: 'Team & Onboarding' },
  { key: 'deliveries', label: 'Deliveries & Fleet' },
  { key: 'finance', label: 'Finance & Accounts' },
  { key: 'customers', label: 'Customers & CRM' },
  { key: 'chef-bems', label: 'Chef Bems AI' },
  { key: 'settings', label: 'Marketing & Settings' },
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
        backgroundColor: 'rgba(7, 31, 20, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="card border-0 shadow-2xl w-100 d-flex flex-column"
        style={{
          maxWidth: 980,
          maxHeight: '90vh',
          borderRadius: '1.25rem',
          backgroundColor: '#FFFFFF',
          overflow: 'hidden',
          boxShadow: '0 25px 60px -15px rgba(7, 31, 20, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header ── */}
        <div
          className="p-3 p-sm-4 text-white d-flex align-items-center justify-content-between position-relative"
          style={{
            background: 'linear-gradient(135deg, #071F14 0%, #143C2D 50%, #1B5E3F 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-3 text-white flex-shrink-0"
              style={{
                width: 44,
                height: 44,
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <i className="ri-add-circle-fill fs-20 text-warning"></i>
            </div>
            <div>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <h5 className="mb-0 fw-bold font-display text-white tracking-tight" style={{ fontSize: '1.15rem' }}>
                  Bems Farms Quick Creation Hub
                </h5>
                <span
                  className="badge px-2 py-0.5"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    color: '#FDE68A',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {CREATE_ACTIONS.length} Action Shortcuts
                </span>
              </div>
              <p className="mb-0 text-white-50" style={{ fontSize: '0.8rem' }}>
                Add products, restock shipments, create invoices, invite staff, register drivers & manage farm operations.
              </p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <span
              className="d-none d-md-inline-block px-2 py-1 rounded text-white-50"
              style={{ fontSize: 11, background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
            >
              ESC to exit
            </span>
            <button
              type="button"
              className="btn btn-sm btn-link text-white-50 text-decoration-none p-1 rounded-circle"
              onClick={onClose}
              style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <i className="ri-close-line fs-20 text-white"></i>
            </button>
          </div>
        </div>

        {/* ── Search Bar & Filter Strip ── */}
        <div className="p-3 bg-light border-bottom">
          <div className="position-relative mb-2">
            <i
              className="ri-search-line position-absolute"
              style={{ left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#64748B' }}
            ></i>
            <input
              ref={searchInputRef}
              type="text"
              className="form-control form-control-lg border-0 shadow-sm ps-5 pe-5"
              style={{
                borderRadius: '0.75rem',
                fontSize: '0.92rem',
                backgroundColor: '#FFFFFF',
              }}
              placeholder="Search what you want to add... (e.g., restock, invoice, product, driver, staff, coupon, debulk, meal)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="btn btn-sm position-absolute text-muted"
                style={{ right: 10, top: '50%', transform: 'translateY(-50%)', padding: '2px 8px' }}
                onClick={() => setSearch('')}
              >
                <i className="ri-close-circle-fill fs-16"></i>
              </button>
            )}
          </div>

          {/* Category Chips Scrollable */}
          <div
            className="d-flex align-items-center gap-1.5 overflow-x-auto pb-1 pt-1"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.key
              const count = categoryCounts[cat.key]
              return (
                <button
                  key={cat.key}
                  type="button"
                  className={`btn btn-sm text-nowrap rounded-pill px-3 py-1 ${
                    active ? 'btn-primary-bf shadow-sm text-white' : 'btn-white text-secondary border'
                  }`}
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: active ? 700 : 500,
                  }}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  {cat.label}
                  <span
                    className={`ms-1.5 px-1.5 py-0.2 rounded-pill ${
                      active ? 'bg-white text-dark' : 'bg-light text-muted'
                    }`}
                    style={{ fontSize: 10 }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Scrollable Actions Body ── */}
        <div className="flex-grow-1 overflow-y-auto p-3 p-sm-4" style={{ backgroundColor: '#FAF8F5' }}>
          {/* Quick Access Popular Row (when no search and 'all') */}
          {!search.trim() && activeCategory === 'all' && (
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between mb-2 pb-1">
                <span className="fw-bold fs-xs text-uppercase text-muted" style={{ letterSpacing: '0.04em' }}>
                  <i className="ri-flashlight-line text-warning me-1"></i>
                  Frequently Used Quick Actions
                </span>
                <span className="badge bg-warning-subtle text-warning fs-xxs">Instant Access</span>
              </div>
              <div className="row g-2">
                {popularActions.map((pop) => (
                  <div key={`pop-${pop.id}`} className="col-6 col-md-4 col-lg-2">
                    <button
                      type="button"
                      className="btn w-100 p-2.5 rounded-3 border text-start bg-white shadow-xs d-flex flex-column align-items-start gap-2 h-100 transition-all hover-card"
                      style={{
                        borderColor: '#E2DDD5',
                      }}
                      onClick={() => handleSelect(pop.path)}
                    >
                      <div
                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 34, height: 34, backgroundColor: pop.iconBg, color: pop.iconColor }}
                      >
                        <i className={`${pop.icon} fs-16`}></i>
                      </div>
                      <div className="w-100">
                        <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.78rem' }}>
                          {pop.title.split('(')[0].trim()}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {pop.category.split('&')[0].trim()}
                        </div>
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section Heading */}
          <div className="d-flex align-items-center justify-content-between mb-3">
            <span className="fw-bold fs-xs text-uppercase text-muted" style={{ letterSpacing: '0.04em' }}>
              {activeCategory === 'all'
                ? search.trim()
                  ? `Search Results (${filteredActions.length})`
                  : 'All Addable Operations'
                : `${CATEGORIES.find((c) => c.key === activeCategory)?.label} (${filteredActions.length})`}
            </span>
            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
              Click any tile to open creation form
            </span>
          </div>

          {/* Action Cards Grid */}
          {filteredActions.length === 0 ? (
            <div className="text-center py-5">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3"
                style={{ width: 64, height: 64, backgroundColor: '#F1F5F9', color: '#94A3B8' }}
              >
                <i className="ri-search-2-line fs-28"></i>
              </div>
              <h6 className="fw-bold text-dark mb-1">No creation action found</h6>
              <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                We could not find anything matching "<strong>{search}</strong>".
              </p>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-pill px-3"
                onClick={() => {
                  setSearch('')
                  setActiveCategory('all')
                }}
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div className="row g-2.5">
              {filteredActions.map((action) => (
                <div key={action.id} className="col-12 col-md-6">
                  <div
                    className="p-3 rounded-3 bg-white border d-flex align-items-start gap-3 h-100 shadow-xs cursor-pointer transition-all action-tile"
                    style={{
                      borderColor: '#E2DDD5',
                      cursor: 'pointer',
                      position: 'relative',
                    }}
                    onClick={() => handleSelect(action.path)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSelect(action.path)
                    }}
                  >
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 shadow-xs"
                      style={{
                        width: 44,
                        height: 44,
                        backgroundColor: action.iconBg,
                        color: action.iconColor,
                      }}
                    >
                      <i className={`${action.icon} fs-20`}></i>
                    </div>

                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex align-items-center justify-content-between gap-1 mb-1">
                        <div className="d-flex align-items-center gap-1.5 flex-wrap">
                          <span className="fw-bold text-dark" style={{ fontSize: '0.86rem' }}>
                            {action.title}
                          </span>
                          {action.badge && (
                            <span className={`badge ${action.badgeCls}`} style={{ fontSize: 9, padding: '2px 6px' }}>
                              {action.badge}
                            </span>
                          )}
                        </div>
                        <i className="ri-arrow-right-up-line text-muted action-arrow fs-16 flex-shrink-0"></i>
                      </div>

                      <p
                        className="text-muted mb-0"
                        style={{
                          fontSize: '0.76rem',
                          lineHeight: 1.35,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {action.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div
          className="p-2.5 px-4 bg-white border-top d-flex align-items-center justify-content-between flex-wrap gap-2"
          style={{ fontSize: '0.78rem', color: '#64748B' }}
        >
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-success-subtle text-success">
              <i className="ri-checkbox-circle-fill me-1"></i>
              Bems Farms Portal Ready
            </span>
            <span className="d-none d-sm-inline">
              Tip: Press <kbd style={{ padding: '1px 5px', fontSize: 10 }}>Alt</kbd> + <kbd style={{ padding: '1px 5px', fontSize: 10 }}>N</kbd> anytime to open this modal
            </span>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button type="button" className="btn btn-sm btn-outline-secondary px-3 py-1 rounded-pill" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .action-tile {
          transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .action-tile:hover {
          transform: translateY(-2px);
          border-color: #143C2D !important;
          box-shadow: 0 8px 20px -6px rgba(20, 60, 45, 0.18) !important;
          background-color: #FAFCFA !important;
        }
        .action-tile:hover .action-arrow {
          color: #143C2D !important;
          transform: translate(2px, -2px);
        }
        .hover-card {
          transition: all 0.18s ease;
        }
        .hover-card:hover {
          border-color: #143C2D !important;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px -4px rgba(20, 60, 45, 0.15) !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  )
}
