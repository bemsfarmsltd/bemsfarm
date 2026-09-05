// ─────────────────────────────────────────────────────────────────
//  Bems Farms — Role-Based Access Control
//  Central config: role constants, permission groups, UI labels
// ─────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPERADMIN:       'superadmin',
  ADMIN:            'admin',
  MANAGER:          'manager',
  ACCOUNTANT:       'accountant',
  DELIVERY_MANAGER: 'delivery_manager',
  CASHIER:          'cashier',
  STOREKEEPER:      'storekeeper',
  KITCHEN_STAFF:    'kitchen_staff',
}

// ── Permission Groups ──────────────────────────────────────────────
// Import these arrays in App.jsx (route guards) and Sidebar.jsx (menu visibility)

/** Every role */
export const ALL_ROLES = Object.values(ROLES)

/** Superadmin + Manager only */
export const ADMIN_ONLY = ['superadmin', 'admin', 'manager']

/** Superadmin only */
export const SUPERADMIN_ONLY = ['superadmin']

/** Can manage finances */
export const FINANCE_ROLES = ['superadmin', 'admin', 'manager', 'accountant']

/** Can manage deliveries */
export const DELIVERY_ROLES = ['superadmin', 'admin', 'manager', 'delivery_manager']

/** Can access POS */
export const POS_ROLES = ['superadmin', 'admin', 'manager', 'cashier']

/** Can see orders */
export const ORDER_ROLES = ['superadmin', 'admin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'kitchen_staff']

/** Can manage customers */
export const CUSTOMER_ROLES = ['superadmin', 'admin', 'manager', 'cashier']

/** Can manage products & inventory */
export const PRODUCT_ROLES = ['superadmin', 'admin', 'manager', 'kitchen_staff']

/** Can manage inventory */
export const INVENTORY_ROLES = ['superadmin', 'admin', 'manager', 'storekeeper', 'kitchen_staff']

/** Can see reports */
export const REPORT_ROLES = ['superadmin', 'admin', 'manager', 'accountant']

/** Can access Chef Bems AI */
export const AI_ROLES = ['superadmin', 'admin', 'manager', 'kitchen_staff']

/** Can manage staff */
export const STAFF_ROLES = ['superadmin', 'manager']

/** Can access settings */
export const SETTINGS_ROLES = ['superadmin', 'manager']

/** Multi-store — matches stores_admin.js (superadmin + manager can view/create/edit; delete & manager-assign are superadmin-only at the route level) */
export const MULTISTORE_ROLES = ['superadmin', 'admin', 'manager']

/** Can manage purchase orders — matches purchases_admin.js */
export const PURCHASE_ROLES = ['superadmin', 'admin', 'manager']

/** Can manage suppliers — matches suppliers_admin.js */
export const SUPPLIER_ROLES = ['superadmin', 'admin', 'manager']

// ── UI Labels & Colors ─────────────────────────────────────────────
export const ROLE_META = {
  superadmin: {
    label:       'Super Admin',
    description: 'Full system access',
    color:       '#dc2626',
    bg:          '#fee2e2',
    icon:        'ri-shield-star-line',
  },
  admin: {
    label:       'Admin',
    description: 'Administrative operations access',
    color:       '#be123c',
    bg:          '#ffe4e6',
    icon:        'ri-shield-user-line',
  },
  manager: {
    label:       'Manager',
    description: 'Operations & staff management',
    color:       '#7c3aed',
    bg:          '#ede9fe',
    icon:        'ri-user-star-line',
  },
  storekeeper: {
    label:       'Storekeeper',
    description: 'Inventory and purchasing operations',
    color:       '#166534',
    bg:          '#dcfce7',
    icon:        'ri-archive-stack-line',
  },
  accountant: {
    label:       'Accountant',
    description: 'Finance, accounts & reports',
    color:       '#0369a1',
    bg:          '#e0f2fe',
    icon:        'ri-bank-card-line',
  },
  delivery_manager: {
    label:       'Delivery Manager',
    description: 'Deliveries, drivers & zones',
    color:       '#b45309',
    bg:          '#fef3c7',
    icon:        'ri-bike-line',
  },
  cashier: {
    label:       'Cashier',
    description: 'POS, orders & customers',
    color:       '#15803d',
    bg:          '#dcfce7',
    icon:        'ri-store-2-line',
  },
  kitchen_staff: {
    label:       'Kitchen Staff',
    description: 'Orders, products & inventory',
    color:       '#9d174d',
    bg:          '#fce7f3',
    icon:        'ri-restaurant-line',
  },
}
