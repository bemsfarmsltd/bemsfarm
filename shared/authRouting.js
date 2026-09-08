export const STAFF_HOME = Object.freeze({
  superadmin: '/dashboard', admin: '/dashboard', manager: '/dashboard',
  accountant: '/accounts/overview', delivery_manager: '/deliveries/active',
  cashier: '/pos', storekeeper: '/inventory/stock', kitchen_staff: '/orders',
});
export const isStaff = (role) => Object.hasOwn(STAFF_HOME, role);
export function customerHome(path) {
  return typeof path === 'string' && /^\/(home|products|product|cart|checkout|orders|profile|about|contact|returns|chef-chat|payment-recovery)(\/|\?|$)/.test(path)
    ? path : '/home';
}
export function appUrl(app, path) {
  return new URL(app === 'admin' ? `/admin${path}` : path, window.location.origin).href;
}
// Both interfaces share the same origin and session storage keys.
export function handoff(app) {
  window.location.replace(appUrl(app, '/login'));
}
