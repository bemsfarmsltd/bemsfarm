// ─────────────────────────────────────────────────────────────────
//  Bems Farms — Role-Based Access Control
//  Central config: role constants, permission groups, UI labels
// ─────────────────────────────────────────────────────────────────

export const ROLES = {
  ADMIN:            'admin',
  SUPERADMIN:       'superadmin',
  MANAGER:          'manager',
  ACCOUNTANT:       'accountant',
  DELIVERY_MANAGER: 'delivery_manager',
  CASHIER:          'cashier',
  SALESPERSON:      'salesperson',
  SALES_PERSON:     'sales_person',
  SALES:            'sales',
  KITCHEN_STAFF:    'kitchen_staff',
  APP_DEVELOPER:    'app_developer',
}

// ── Permission Groups ──────────────────────────────────────────────
// Import these arrays in App.jsx (route guards) and Sidebar.jsx (menu visibility)

/** Every role */
export const ALL_ROLES = Object.values(ROLES)

/** Sales / cashier roles dedicated strictly to POS */
export const SALES_ROLES = ['cashier', 'salesperson', 'sales_person', 'sales', 'pos']

export const isSalesRole = (role) => {
  return role ? SALES_ROLES.includes(String(role).toLowerCase()) : false
}

export const isAppDeveloperRole = (role) => {
  return role ? String(role).toLowerCase() === 'app_developer' : false
}

/** Can access and manage mobile apps releases & versioning */
export const MOBILE_APP_ROLES = ['admin', 'superadmin', 'manager', 'app_developer']

/** Superadmin + Admin + Manager only */
export const ADMIN_ONLY = ['admin', 'superadmin', 'manager']

/** Can manage finances */
export const FINANCE_ROLES = ['admin', 'superadmin', 'manager', 'accountant']

/** Can manage deliveries */
export const DELIVERY_ROLES = ['admin', 'superadmin', 'manager', 'delivery_manager']

/** Can access POS */
export const POS_ROLES = ['admin', 'superadmin', 'manager', 'cashier', 'salesperson', 'sales_person', 'sales']

/** Can see orders */
export const ORDER_ROLES = ['admin', 'superadmin', 'manager', 'accountant', 'delivery_manager', 'cashier', 'salesperson', 'sales_person', 'sales', 'kitchen_staff']

/** Can manage customers */
export const CUSTOMER_ROLES = ['admin', 'superadmin', 'manager', 'cashier', 'salesperson', 'sales_person', 'sales']

/** Can manage products & inventory */
export const PRODUCT_ROLES = ['admin', 'superadmin', 'manager', 'kitchen_staff']

/** Can see reports */
export const REPORT_ROLES = ['admin', 'superadmin', 'manager', 'accountant']

/** Can access Chef Bems AI */
export const AI_ROLES = ['admin', 'superadmin', 'manager', 'kitchen_staff']

/** Can manage staff */
export const STAFF_ROLES = ['admin', 'superadmin', 'manager']

/** Can access settings */
export const SETTINGS_ROLES = ['admin', 'superadmin', 'manager']

/** Multi-store — superadmin / admin only */
export const MULTISTORE_ROLES = ['admin', 'superadmin']

export const isStaffRole = (role) => {
  return role ? (ALL_ROLES.includes(role) || isSalesRole(role)) : false
}

export const STAFF_HOME = {
  admin: '/dashboard',
  superadmin: '/dashboard',
  manager: '/dashboard',
  cashier: '/pos',
  salesperson: '/pos',
  sales_person: '/pos',
  sales: '/pos',
  kitchen_staff: '/inventory/stock',
  delivery_manager: '/deliveries/active',
  accountant: '/accounts/overview',
  app_developer: '/settings/mobile-apps',
}

// ── Role-Based Notification & Real-Time Event Access ───────────────
export const ROLE_ALLOWED_NOTIF_TYPES = {
  superadmin: '*',
  admin: '*',
  manager: [
    'order_placed', 'pos_sale', 'order_delivery', 'order_completed',
    'driver_assigned', 'driver_support_message', 'dispatch_alert', 'emergency', 'emergency_sos',
    'support_message', 'ai_chat', 'low_stock', 'out_of_stock',
    'product_created', 'product_price_updated', 'stock_restock', 'stock_adjustment', 'batch_expiry',
    'refund_request', 'refund_processed', 'customer_register',
    'mobile_app_action', 'staff_action', 'payout_approved', 'payout_rejected', 'payout_disbursed',
    'store_sales_reconciliation',
  ],
  app_developer: ['mobile_app_action'],
  delivery_manager: [
    'order_delivery', 'driver_assigned', 'driver_support_message',
    'dispatch_alert', 'emergency', 'emergency_sos', 'order_placed', 'order_completed',
  ],
  accountant: [
    'order_placed', 'pos_sale', 'order_completed',
    'refund_request', 'refund_processed', 'driver_wallet_adjustment',
    'payout_disbursed', 'payout_approved', 'payout_rejected',
    'wallet_frozen', 'wallet_unfrozen', 'customer_wallet_adjustment',
    'store_sales_reconciliation', 'product_price_updated',
  ],
  kitchen_staff: [
    'low_stock', 'out_of_stock', 'product_created',
    'stock_restock', 'stock_adjustment', 'batch_expiry', 'ai_chat', 'order_placed',
  ],
  storekeeper: [
    'low_stock', 'out_of_stock', 'product_created',
    'stock_restock', 'stock_adjustment', 'batch_expiry', 'order_placed',
  ],
  cashier: ['pos_sale', 'order_placed', 'customer_register'],
  salesperson: ['pos_sale', 'order_placed', 'customer_register'],
  sales_person: ['pos_sale', 'order_placed', 'customer_register'],
  sales: ['pos_sale', 'order_placed', 'customer_register'],
  pos: ['pos_sale', 'order_placed', 'customer_register'],
}

export const canRoleReceiveNotification = (role, notifType) => {
  if (!role) return false
  const key = String(role).toLowerCase().trim()
  const allowed = ROLE_ALLOWED_NOTIF_TYPES[key]
  if (allowed === '*') return true
  if (!Array.isArray(allowed)) return false
  return allowed.includes(String(notifType || '').toLowerCase().trim())
}

const SOCKET_EVENT_ROLE_MAP = {
  'order:created': [
    'superadmin', 'admin', 'manager', 'accountant', 'delivery_manager',
    'cashier', 'salesperson', 'sales_person', 'sales', 'pos', 'kitchen_staff', 'storekeeper',
  ],
  'order:updated': [
    'superadmin', 'admin', 'manager', 'accountant', 'delivery_manager',
    'cashier', 'salesperson', 'sales_person', 'sales', 'pos', 'kitchen_staff', 'storekeeper',
  ],
  'dashboard:update': [
    'superadmin', 'admin', 'manager', 'accountant', 'delivery_manager',
    'cashier', 'salesperson', 'sales_person', 'sales', 'pos', 'kitchen_staff', 'storekeeper',
  ],
  'delivery:updated': ['superadmin', 'admin', 'manager', 'delivery_manager'],
  'driver:telemetry': ['superadmin', 'admin', 'manager', 'delivery_manager'],
  'driver:location': ['superadmin', 'admin', 'manager', 'delivery_manager'],
  'dispatch:alert': ['superadmin', 'admin', 'manager', 'delivery_manager'],
  'emergency:sos': ['superadmin', 'admin', 'manager', 'delivery_manager'],
  'driver:support_message': ['superadmin', 'admin', 'manager', 'delivery_manager'],
  'stock:updated': [
    'superadmin', 'admin', 'manager', 'kitchen_staff', 'storekeeper',
    'cashier', 'salesperson', 'sales_person', 'sales', 'pos',
  ],
  'support:message': ['superadmin', 'admin', 'manager'],
}

export const canRoleReceiveSocketEvent = (role, eventName, payload = null) => {
  if (!role) return false
  const key = String(role).toLowerCase().trim()
  if (eventName === 'notification:new') {
    const notifType = payload?.type || payload?.notification?.type
    return canRoleReceiveNotification(key, notifType)
  }
  const allowedRoles = SOCKET_EVENT_ROLE_MAP[eventName]
  if (allowedRoles) return allowedRoles.includes(key)
  return key === 'superadmin' || key === 'admin'
}

// ── UI Labels & Colors ─────────────────────────────────────────────
export const ROLE_META = {
  admin: {
    label:       'Administrator',
    description: 'Full system access',
    color:       '#dc2626',
    bg:          '#fee2e2',
    icon:        'ri-shield-star-line',
    email:       'admin@bemsfarms.com',
    password:    'admin123',
  },
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
    label:       'Cashier / Sales',
    description: 'POS, orders & customers',
    color:       '#15803d',
    bg:          '#dcfce7',
    icon:        'ri-store-2-line',
    email:       'cashier@bemsfarms.com',
    password:    'cashier123',
  },
  salesperson: {
    label:       'Sales Person',
    description: 'POS, sales register & checkout',
    color:       '#15803d',
    bg:          '#dcfce7',
    icon:        'ri-store-2-line',
    email:       'sales@bemsfarms.com',
    password:    'sales123',
  },
  sales_person: {
    label:       'Sales Person',
    description: 'POS, sales register & checkout',
    color:       '#15803d',
    bg:          '#dcfce7',
    icon:        'ri-store-2-line',
    email:       'sales@bemsfarms.com',
    password:    'sales123',
  },
  sales: {
    label:       'Sales Person',
    description: 'POS, sales register & checkout',
    color:       '#15803d',
    bg:          '#dcfce7',
    icon:        'ri-store-2-line',
    email:       'sales@bemsfarms.com',
    password:    'sales123',
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
  app_developer: {
    label:       'Mobile App Developer',
    description: 'Mobile APK deployment & version control',
    color:       '#0284c7',
    bg:          '#e0f2fe',
    icon:        'ri-smartphone-line',
    email:       'developer@bemsfarms.com',
    password:    'dev123',
  },
}
