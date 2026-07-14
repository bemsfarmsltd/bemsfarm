import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import {
  ALL_ROLES, ADMIN_ONLY, FINANCE_ROLES, DELIVERY_ROLES,
  POS_ROLES, ORDER_ROLES, CUSTOMER_ROLES, PRODUCT_ROLES,
  REPORT_ROLES, AI_ROLES, STAFF_ROLES, SETTINGS_ROLES,
} from './lib/roles'

// Public
import Landing      from './pages/landing/Landing'
import Login        from './pages/auth/Login'
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
import Barcode         from './pages/products/Barcode'
import BulkExport      from './pages/products/BulkExport'

// Inventory
import StockList       from './pages/inventory/StockList'
import StockAdjustment from './pages/inventory/StockAdjustment'
import StockTransfer   from './pages/inventory/StockTransfer'
import BatchManagement from './pages/inventory/BatchManagement'
import Warehouses      from './pages/inventory/Warehouses'
import StockAlerts     from './pages/inventory/StockAlerts'
import StockValuation  from './pages/inventory/StockValuation'
import LostItems       from './pages/inventory/LostItems'

// Orders
import OrdersList  from './pages/orders/OrdersList'
import OrderDetail from './pages/orders/OrderDetail'
import Receipts    from './pages/orders/Receipts'
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
import CustomerReportPage from './pages/customers/CustomerReport'

// Staff
import StaffList        from './pages/staff/StaffList'
import AddStaff         from './pages/staff/AddStaff'
import RolesPermissions from './pages/staff/RolesPermissions'
import Attendance       from './pages/staff/Attendance'
import Schedule         from './pages/staff/Schedule'
import Holidays         from './pages/staff/Holidays'
import Payroll          from './pages/staff/Payroll'

// Accounts
import FinancialOverview from './pages/accounts/FinancialOverview'
import BankAccounts      from './pages/accounts/BankAccounts'
import Income            from './pages/accounts/Income'
import Expenses          from './pages/accounts/Expenses'
import MoneyTransfer     from './pages/accounts/MoneyTransfer'
import Transactions      from './pages/accounts/Transactions'
import DriverCommissions from './pages/accounts/DriverCommissions'
import PaymentReconciliation from './pages/accounts/PaymentReconciliation'

// Chef Bems AI
import Conversations    from './pages/chef-bems/Conversations'
import DietaryRules     from './pages/chef-bems/DietaryRules'
import MealAssociations from './pages/chef-bems/MealAssociations'
import Substitution     from './pages/chef-bems/Substitution'
import Recommendation   from './pages/chef-bems/Recommendation'

// Reports
import SalesReport     from './pages/reports/SalesReport'
import InventoryReport from './pages/reports/InventoryReport'
import CustomerReport  from './pages/reports/CustomerReport'
import PurchaseReport  from './pages/reports/PurchaseReport'
import SupplierReport  from './pages/reports/SupplierReport'
import ExpenseReport   from './pages/reports/ExpenseReport'
import FinanceReport   from './pages/reports/FinanceReport'

// Settings
import GeneralSettings      from './pages/settings/GeneralSettings'
import NotificationSettings from './pages/settings/NotificationSettings'
import PaymentSettings      from './pages/settings/PaymentSettings'
import CouponSettings       from './pages/settings/CouponSettings'
import POSSettings          from './pages/settings/POSSettings'
import TaxSettings          from './pages/settings/TaxSettings'
import CurrencySettings     from './pages/settings/CurrencySettings'
import InvoiceSettings      from './pages/settings/InvoiceSettings'
import ManagerSettings      from './pages/settings/ManagerSettings'

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"            element={<Landing />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* ── All authenticated users ── */}
        <Route element={<ProtectedRoute />}>

          {/* POS — full-screen, POS roles only */}
          <Route element={<ProtectedRoute allowedRoles={POS_ROLES} />}>
            <Route path="/pos" element={<POS />} />
          </Route>

          <Route element={<Layout />}>

            {/* Dashboard — everyone */}
            <Route path="/dashboard" element={<Dashboard />} />

            {/* ── Products & Inventory ── superadmin, manager, kitchen_staff */}
            <Route element={<ProtectedRoute allowedRoles={PRODUCT_ROLES} />}>
              <Route path="/products"                element={<ProductsList />} />
              <Route path="/products/add"            element={<AddProduct />} />
              <Route path="/products/:id/edit"       element={<AddProduct />} />
              <Route path="/products/categories"     element={<Categories />} />
              <Route path="/products/sub-categories" element={<SubCategories />} />
              <Route path="/products/units"          element={<Units />} />
              <Route path="/products/variants"       element={<Variants />} />
              <Route path="/products/barcode"        element={<Barcode />} />
              <Route path="/products/export"         element={<BulkExport />} />

              <Route path="/inventory/stock"      element={<StockList />} />
              <Route path="/inventory/adjustment" element={<StockAdjustment />} />
              <Route path="/inventory/transfer"   element={<StockTransfer />} />
              <Route path="/inventory/batches"    element={<BatchManagement />} />
              <Route path="/inventory/warehouses" element={<Warehouses />} />
              <Route path="/inventory/alerts"     element={<StockAlerts />} />
              <Route path="/inventory/valuation"  element={<StockValuation />} />
              <Route path="/inventory/lost-items" element={<LostItems />} />
            </Route>

            {/* ── Orders ── all roles */}
            <Route element={<ProtectedRoute allowedRoles={ORDER_ROLES} />}>
              <Route path="/orders"          element={<OrdersList />} />
              <Route path="/orders/receipts" element={<Receipts />} />
              <Route path="/orders/refunds"  element={<Refunds />} />
              <Route path="/orders/:id"      element={<OrderDetail />} />
            </Route>

            {/* ── Deliveries ── superadmin, manager, delivery_manager */}
            <Route element={<ProtectedRoute allowedRoles={DELIVERY_ROLES} />}>
              <Route path="/deliveries/active"  element={<ActiveDeliveries />} />
              <Route path="/deliveries/map"     element={<DeliveryMap />} />
              <Route path="/deliveries/zones"   element={<DeliveryZones />} />
              <Route path="/deliveries/drivers" element={<DriversManagement />} />
            </Route>

            {/* ── Customers ── superadmin, manager, cashier */}
            <Route element={<ProtectedRoute allowedRoles={CUSTOMER_ROLES} />}>
              <Route path="/customers"          element={<CustomersList />} />
              <Route path="/customers/loyalty"  element={<LoyaltyPoints />} />
              <Route path="/customers/activity" element={<ActivityLog />} />
              <Route path="/customers/report"   element={<CustomerReportPage />} />
              <Route path="/customers/:id"      element={<CustomerDetail />} />
            </Route>

            {/* ── Staff ── superadmin, manager */}
            <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
              <Route path="/staff"            element={<StaffList />} />
              <Route path="/staff/add"        element={<AddStaff />} />
              <Route path="/staff/roles"      element={<RolesPermissions />} />
              <Route path="/staff/attendance" element={<Attendance />} />
              <Route path="/staff/schedule"   element={<Schedule />} />
              <Route path="/staff/holidays"   element={<Holidays />} />
              <Route path="/staff/payroll"    element={<Payroll />} />
            </Route>

            {/* ── Accounts / Finance ── superadmin, manager, accountant */}
            <Route element={<ProtectedRoute allowedRoles={FINANCE_ROLES} />}>
              <Route path="/accounts/overview"     element={<FinancialOverview />} />
              <Route path="/accounts/bank"         element={<BankAccounts />} />
              <Route path="/accounts/income"       element={<Income />} />
              <Route path="/accounts/expenses"     element={<Expenses />} />
              <Route path="/accounts/transfer"     element={<MoneyTransfer />} />
              <Route path="/accounts/transactions" element={<Transactions />} />
              <Route path="/accounts/commissions"  element={<DriverCommissions />} />
              <Route path="/accounts/reconciliation" element={<PaymentReconciliation />} />
            </Route>

            {/* ── Chef Bems AI ── superadmin, manager, kitchen_staff */}
            <Route element={<ProtectedRoute allowedRoles={AI_ROLES} />}>
              <Route path="/chef-bems/conversations"     element={<Conversations />} />
              <Route path="/chef-bems/dietary-rules"     element={<DietaryRules />} />
              <Route path="/chef-bems/meal-associations" element={<MealAssociations />} />
              <Route path="/chef-bems/substitutions"     element={<Substitution />} />
              <Route path="/chef-bems/recommendations"   element={<Recommendation />} />
            </Route>

            {/* ── Reports ── superadmin, manager, accountant */}
            <Route element={<ProtectedRoute allowedRoles={REPORT_ROLES} />}>
              <Route path="/reports/sales"      element={<SalesReport />} />
              <Route path="/reports/inventory"  element={<InventoryReport />} />
              <Route path="/reports/customers"  element={<CustomerReport />} />
              <Route path="/reports/purchases"  element={<PurchaseReport />} />
              <Route path="/reports/suppliers"  element={<SupplierReport />} />
              <Route path="/reports/expenses"   element={<ExpenseReport />} />
              <Route path="/reports/finance"    element={<FinanceReport />} />
            </Route>

            {/* ── Settings ── superadmin, manager */}
            <Route element={<ProtectedRoute allowedRoles={SETTINGS_ROLES} />}>
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

          </Route>
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
