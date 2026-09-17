import CustomerMessages from './pages/customers/CustomerMessages'
import CustomerBroadcasts from './pages/customers/CustomerBroadcasts'
import ProductDemand from './pages/customers/ProductDemand'
import GodEye from './pages/system/SystemAudit'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/ui/ErrorBoundary'
import {
  ALL_ROLES, ADMIN_ONLY, FINANCE_ROLES, DELIVERY_ROLES,
  POS_ROLES, ORDER_ROLES, CUSTOMER_ROLES, PRODUCT_ROLES,
  REPORT_ROLES, AI_ROLES, STAFF_ROLES, SETTINGS_ROLES, MULTISTORE_ROLES,
} from './lib/roles'

// Auth & Errors
import Login from './pages/auth/Login'
import ResetPassword from './pages/auth/ResetPassword'
import Onboard from './pages/auth/Onboard'
import Unauthorized from './pages/errors/Unauthorized'

// Dashboard
import Dashboard from './pages/dashboard/Dashboard'

// POS
import POS from './pages/pos/POS'

// Products
import ProductsList    from './pages/products/ProductsList'
import AddProduct      from './pages/products/AddProduct'
import Categories      from './pages/products/Categories'
import SubCategories   from './pages/products/SubCategories'
import Units           from './pages/products/Units'
import Variants        from './pages/products/Variants'
import Reviews         from './pages/products/Reviews'
import Barcode         from './pages/products/Barcode'
import BulkExport      from './pages/products/BulkExport'

// Inventory
import StockList       from './pages/inventory/StockList'
import StockIn         from './pages/inventory/StockIn'
import StockOut        from './pages/inventory/StockOut'
import StockAdjustment from './pages/inventory/StockAdjustment'
import StockTransfer   from './pages/inventory/StockTransfer'
import BatchManagement from './pages/inventory/BatchManagement'
import Warehouses      from './pages/inventory/Warehouses'
import StockAlerts     from './pages/inventory/StockAlerts'
import StockValuation  from './pages/inventory/StockValuation'
import LostItems       from './pages/inventory/LostItems'
import PurchaseScheduleCalendar from './pages/inventory/PurchaseScheduleCalendar'

// Orders
import OrdersList  from './pages/orders/OrdersList'
import OrderDetail from './pages/orders/OrderDetail'
import Invoices    from './pages/orders/Invoices'
import Refunds     from './pages/orders/Refunds'

// Deliveries
import ActiveDeliveries  from './pages/deliveries/ActiveDeliveries'
import DeliveryZones     from './pages/deliveries/DeliveryZones'
import DriversManagement from './pages/deliveries/DriversManagement'
import DeliveryMap       from './pages/deliveries/DeliveryMap'

// Customers
import CustomersList  from './pages/customers/CustomersList'
import CustomerDetail from './pages/customers/CustomerDetail'
import LoyaltyPoints  from './pages/customers/LoyaltyPoints'
import ActivityLog    from './pages/customers/ActivityLog'
import WalletBalance  from './pages/customers/WalletBalance'

// Staff
import StaffList        from './pages/staff/StaffList'
import AddStaff         from './pages/staff/AddStaff'
import RolesPermissions from './pages/staff/RolesPermissions'
import Attendance       from './pages/staff/Attendance'
import Schedule         from './pages/staff/Schedule'
import Holidays         from './pages/staff/Holidays'
import Payroll          from './pages/staff/Payroll'

// Accounts
import BankAccounts      from './pages/accounts/BankAccounts'
import Income            from './pages/accounts/Income'
import MoneyTransfer     from './pages/accounts/MoneyTransfer'
import Transactions      from './pages/accounts/Transactions'
import DriverCommissions from './pages/accounts/DriverCommissions'

// Chef Bems AI
import Conversations    from './pages/chef-bems/Conversations'
import DietaryRules     from './pages/chef-bems/DietaryRules'
import MealAssociations from './pages/chef-bems/MealAssociations'

// Multi-store
import StoreList from './pages/multistore/StoreList'
import AddStore  from './pages/multistore/AddStore'

// Reports
import SalesReport     from './pages/reports/SalesReport'
import InventoryReport from './pages/reports/InventoryReport'
import CustomerReport  from './pages/reports/CustomerReport'
import PurchaseReport  from './pages/reports/PurchaseReport'
import SupplierReport  from './pages/reports/SupplierReport'
import FinanceReport   from './pages/reports/FinanceReport'

// Settings
import SettingsAll          from './pages/settings/SettingsAll'
import GeneralSettings      from './pages/settings/GeneralSettings'
import NotificationSettings from './pages/settings/NotificationSettings'
import PaymentSettings      from './pages/settings/PaymentSettings'
import CouponSettings       from './pages/settings/CouponSettings'
import POSSettings          from './pages/settings/POSSettings'
import TaxSettings          from './pages/settings/TaxSettings'
import CurrencySettings     from './pages/settings/CurrencySettings'
import InvoiceSettings      from './pages/settings/InvoiceSettings'
import ManagerSettings      from './pages/settings/ManagerSettings'
import TeamOnboarding        from './pages/settings/TeamOnboarding'
import Profile               from './pages/settings/Profile'

import GlobalBarcodeListener from './components/GlobalBarcodeListener'

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <GlobalBarcodeListener />
        <Routes>
          {/* ── Public Auth Routes ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboard" element={<Onboard />} />
          <Route path="/accept-invite" element={<Onboard />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ── All authenticated users ── */}
          <Route element={<ProtectedRoute />}>
            {/* Root redirect to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* POS — full-screen, POS roles only */}
            <Route element={<ProtectedRoute allowedRoles={POS_ROLES} />}>
              <Route path="/pos" element={<POS />} />
            </Route>

            <Route element={<Layout />}>
              {/* Dashboard — everyone */}
              <Route path="/dashboard" element={<Dashboard />} />
              {/* My Profile — every signed-in staff member manages their own account */}
              <Route path="/settings/profile" element={<Profile />} />

              {/* ── Products & Inventory ── */}
              <Route element={<ProtectedRoute allowedRoles={PRODUCT_ROLES} />}>
                <Route path="/products"                element={<ProductsList />} />
                <Route path="/products/add"            element={<AddProduct />} />
                <Route path="/products/categories"     element={<Categories />} />
                <Route path="/products/sub-categories" element={<Navigate to="/products/categories" replace />} />
                <Route path="/products/units"          element={<Units />} />
                <Route path="/products/brands"         element={<Navigate to="/products" replace />} />
                <Route path="/products/variants"       element={<Variants />} />
                <Route path="/products/reviews"        element={<Reviews />} />
                <Route path="/products/barcode"        element={<Barcode />} />
                <Route path="/products/export"         element={<BulkExport />} />
                {/* Bulk import lives inside Add Product now — old links land there in import mode */}
                <Route path="/products/import"         element={<Navigate to="/products/add?mode=import" replace />} />
                <Route path="/products/bulk-import"    element={<Navigate to="/products/add?mode=import" replace />} />

                <Route path="/inventory/stock"      element={<StockList />} />
                <Route path="/inventory/schedule"   element={<PurchaseScheduleCalendar />} />
                <Route path="/inventory/stock-in"   element={<StockIn />} />
                <Route path="/inventory/stock-out"  element={<StockOut />} />
                <Route path="/inventory/adjustment" element={<StockAdjustment />} />
                <Route path="/inventory/transfer"   element={<StockTransfer />} />
                <Route path="/inventory/batches"    element={<BatchManagement />} />
                <Route path="/inventory/warehouses" element={<Warehouses />} />
                <Route path="/inventory/alerts"     element={<StockAlerts />} />
                <Route path="/inventory/valuation"  element={<StockValuation />} />
                <Route path="/inventory/lost-items" element={<LostItems />} />
              </Route>

              {/* ── Orders ── */}
              <Route element={<ProtectedRoute allowedRoles={ORDER_ROLES} />}>
                <Route path="/orders"          element={<OrdersList />} />
                <Route path="/orders/invoices" element={<Invoices />} />
                <Route path="/orders/refunds"  element={<Refunds />} />
                <Route path="/orders/:id"      element={<OrderDetail />} />
              </Route>

              {/* ── Deliveries ── */}
              <Route element={<ProtectedRoute allowedRoles={DELIVERY_ROLES} />}>
                <Route path="/deliveries"         element={<Navigate to="/deliveries/active" replace />} />
                <Route path="/deliveries/active"  element={<ActiveDeliveries />} />
                <Route path="/deliveries/map"     element={<DeliveryMap />} />
                <Route path="/deliveries/zones"   element={<DeliveryZones />} />
                <Route path="/deliveries/drivers" element={<DriversManagement />} />
              </Route>

              {/* ── Customers ── */}
              <Route element={<ProtectedRoute allowedRoles={CUSTOMER_ROLES} />}>
                <Route path="/customers"          element={<CustomersList />} />
                <Route path="/customers/add"      element={<Navigate to="/customers" replace />} />
                <Route path="/customers/loyalty"  element={<LoyaltyPoints />} />
                <Route path="/customers/wallet"   element={<WalletBalance />} />
                <Route path="/customers/activity" element={<ActivityLog />} />
                <Route element={<ProtectedRoute allowedRoles={['admin','superadmin','manager']} />}>
                <Route path="/customers/messages" element={<CustomerMessages />} />
                <Route path="/customers/broadcasts" element={<CustomerBroadcasts />} />
                <Route path="/customers/demand" element={<ProductDemand />} />
              </Route>
              <Route path="/customers/:id"      element={<CustomerDetail />} />
              </Route>

              {/* ── Onboarding / Staff & Team ── */}
              <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
                <Route path="/onboarding"              element={<TeamOnboarding />} />
                <Route path="/onboarding/staff"        element={<TeamOnboarding initialTab="staff" />} />
                <Route path="/onboarding/invites"      element={<TeamOnboarding initialTab="onboarding" />} />
                <Route path="/onboarding/roles"        element={<TeamOnboarding initialTab="roles" />} />

                {/* Legacy staff routes */}
                <Route path="/staff"                   element={<Navigate to="/onboarding" replace />} />
                <Route path="/staff/list"              element={<Navigate to="/onboarding?tab=staff" replace />} />
                <Route path="/staff/add"               element={<Navigate to="/onboarding?tab=onboarding" replace />} />
                <Route path="/staff/roles"             element={<Navigate to="/onboarding?tab=roles" replace />} />
                <Route path="/staff/roles-permissions" element={<Navigate to="/onboarding?tab=roles" replace />} />
                <Route path="/staff/attendance"        element={<Navigate to="/onboarding?tab=staff" replace />} />
                <Route path="/staff/schedule"          element={<Navigate to="/onboarding?tab=staff" replace />} />
                <Route path="/staff/holidays"          element={<Navigate to="/onboarding?tab=staff" replace />} />
                <Route path="/staff/payroll"           element={<Navigate to="/onboarding?tab=staff" replace />} />
              </Route>

              {/* ── Accounts / Finance ── */}
              <Route element={<ProtectedRoute allowedRoles={FINANCE_ROLES} />}>
                <Route path="/accounts/overview"     element={<Navigate to="/accounts/transactions" replace />} />
                <Route path="/accounts/bank"         element={<BankAccounts />} />
                <Route path="/accounts/income"       element={<Income />} />
                <Route path="/accounts/expenses"     element={<Navigate to="/accounts/transactions" replace />} />
                <Route path="/accounts/transfer"     element={<MoneyTransfer />} />
                <Route path="/accounts/transactions" element={<Transactions />} />
                <Route path="/accounts/commissions"  element={<DriverCommissions />} />
              </Route>

              {/* ── Chef Bems AI ── */}
              <Route element={<ProtectedRoute allowedRoles={AI_ROLES} />}>
                <Route path="/chef-bems/conversations"     element={<Conversations />} />
                <Route path="/chef-bems/dietary-rules"     element={<DietaryRules />} />
                <Route path="/chef-bems/meal-associations" element={<MealAssociations />} />
              </Route>

              {/* ── Multi-store ── */}
              <Route element={<ProtectedRoute allowedRoles={MULTISTORE_ROLES} />}>
                <Route path="/stores"     element={<StoreList />} />
                <Route path="/stores/add" element={<AddStore />} />
              </Route>

              {/* ── Reports ── */}
              <Route element={<ProtectedRoute allowedRoles={REPORT_ROLES} />}>
                <Route path="/reports/sales"      element={<SalesReport />} />
                <Route path="/reports/inventory"  element={<InventoryReport />} />
                <Route path="/reports/customers"  element={<CustomerReport />} />
                <Route path="/reports/purchases"  element={<PurchaseReport />} />
                <Route path="/reports/suppliers"  element={<SupplierReport />} />
                <Route path="/reports/expenses"   element={<Navigate to="/reports/finance" replace />} />
                <Route path="/reports/finance"    element={<FinanceReport />} />
              </Route>

              {/* ── Settings ── */}
              <Route element={<ProtectedRoute allowedRoles={SETTINGS_ROLES} />}>
                <Route path="/settings"               element={<SettingsAll />} />
                <Route path="/settings/all"           element={<SettingsAll />} />
                {/* Legacy settings team routes */}
                <Route path="/settings/team"          element={<Navigate to="/onboarding" replace />} />
                <Route path="/settings/onboarding"    element={<Navigate to="/onboarding?tab=onboarding" replace />} />
                <Route path="/settings/staff"         element={<Navigate to="/onboarding?tab=staff" replace />} />
                <Route path="/settings/roles"         element={<Navigate to="/onboarding?tab=roles" replace />} />
                {/* Legacy audit redirect for superadmin */}
                <Route element={<ProtectedRoute allowedRoles={['superadmin']} />}>
                  <Route path="/settings/audit" element={<Navigate to="/god-eye" replace />} />
                </Route>
              <Route path="/settings/general"       element={<GeneralSettings />} />
                <Route path="/settings/notifications" element={<NotificationSettings />} />
                <Route path="/settings/payment"       element={<PaymentSettings />} />
                <Route path="/settings/coupons"       element={<CouponSettings />} />
                <Route path="/settings/pos"           element={<POSSettings />} />
                <Route path="/settings/tax"           element={<TaxSettings />} />
                <Route path="/settings/currencies"    element={<CurrencySettings />} />
                <Route path="/settings/invoices"      element={<InvoiceSettings />} />
                <Route path="/settings/manager"       element={<ManagerSettings />} />
              </Route>

              {/* ── God Eye Audit Log — restricted to one designated owner account ── */}
              <Route element={<ProtectedRoute allowedRoles={['superadmin']} allowedEmails={['admin@bemsfarms.com']} />}>
                <Route path="/god-eye" element={<GodEye />} />
              </Route>
            </Route>
          </Route>

          {/* 404 fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
