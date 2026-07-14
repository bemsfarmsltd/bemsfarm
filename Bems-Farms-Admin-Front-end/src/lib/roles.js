// ─────────────────────────────────────────────────────────────────
//  Bems Farms — Role-Based Access Control
//  Central config: role constants, permission groups, UI labels
// ─────────────────────────────────────────────────────────────────

export const ROLES = {
  SUPERADMIN:       'superadmin',
  MANAGER:          'manager',
  ACCOUNTANT:       'accountant',
  DELIVERY_MANAGER: 'delivery_manager',
  CASHIER:          'cashier',
  KITCHEN_STAFF:    'kitchen_staff',
}

// ── Permission Groups ──────────────────────────────────────────────
// Import these arrays in App.jsx (route guards) and Sidebar.jsx (menu visibility)

/** Every role */
export const ALL_ROLES = Object.values(ROLES)

/** Superadmin + Manager only */
export const ADMIN_ONLY = ['superadmin', 'manager']

/** Can manage finances */
export const FINANCE_ROLES = ['superadmin', 'manager', 'accountant']

/** Can manage deliveries */
export const DELIVERY_ROLES = ['superadmin', 'manager', 'delivery_manager']

/** Can access POS */
export const POS_ROLES = ['superadmin', 'manager', 'cashier']

/** Can see orders */
export const ORDER_ROLES = ['superadmin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'kitchen_staff']

/** Can manage customers */
export const CUSTOMER_ROLES = ['superadmin', 'manager', 'cashier']

/** Can manage products & inventory */
export const PRODUCT_ROLES = ['superadmin', 'manager', 'kitchen_staff']

/** Can see reports */
export const REPORT_ROLES = ['superadmin', 'manager', 'accountant']

/** Can access Chef Bems AI */
export const AI_ROLES = ['superadmin', 'manager', 'kitchen_staff']

/** Can manage staff */
export const STAFF_ROLES = ['superadmin', 'manager']

/** Can access settings */
export const SETTINGS_ROLES = ['superadmin', 'manager']

/** Multi-store — superadmin only */
export const MULTISTORE_ROLES = ['superadmin']

// ── UI Labels & Colors ─────────────────────────────────────────────
export const ROLE_META = {
  superadmin: {
    label:       'Super Admin',
    description: 'Full system access',
    color:       '#dc2626',
    bg:          '#fee2e2',
    icon:        'ri-shield-star-line',
    email:       'superadmin@bemsfarms.com',
    password:    'super123',
  },
  manager: {
    label:       'Manager',
    description: 'Operations & staff management',
    color:       '#7c3aed',
    bg:          '#ede9fe',
    icon:        'ri-user-star-line',
    email:       'manager@bemsfarms.com',
    password:    'manager123',
  },
  accountant: {
    label:       'Accountant',
    description: 'Finance, accounts & reports',
    color:       '#0369a1',
    bg:          '#e0f2fe',
    icon:        'ri-bank-card-line',
    email:       'accountant@bemsfarms.com',
    password:    'account123',
  },
  delivery_manager: {
    label:       'Delivery Manager',
    description: 'Deliveries, drivers & zones',
    color:       '#b45309',
    bg:          '#fef3c7',
    icon:        'ri-bike-line',
    email:       'delivery@bemsfarms.com',
    password:    'delivery123',
  },
  cashier: {
    label:       'Cashier',
    description: 'POS, orders & customers',
    color:       '#15803d',
    bg:          '#dcfce7',
    icon:        'ri-store-2-line',
    email:       'cashier@bemsfarms.com',
    password:    'cashier123',
  },
  kitchen_staff: {
    label:       'Kitchen Staff',
    description: 'Orders, products & inventory',
    color:       '#9d174d',
    bg:          '#fce7f3',
    icon:        'ri-restaurant-line',
    email:       'kitchen@bemsfarms.com',
    password:    'kitchen123',
  },
}
