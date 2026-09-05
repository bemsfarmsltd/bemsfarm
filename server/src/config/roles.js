const ROLES = Object.freeze({
  USER: "user",
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  DELIVERY_MANAGER: "delivery_manager",
  CASHIER: "cashier",
  STOREKEEPER: "storekeeper",
  KITCHEN_STAFF: "kitchen_staff",
});

const STAFF_ROLES = Object.freeze([
  ROLES.SUPERADMIN,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.ACCOUNTANT,
  ROLES.DELIVERY_MANAGER,
  ROLES.CASHIER,
  ROLES.STOREKEEPER,
  ROLES.KITCHEN_STAFF,
]);

const ALL_ROLES = Object.freeze([ROLES.USER, ...STAFF_ROLES]);
const ADMIN_ROLES = Object.freeze([ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER]);
const CUSTOMER_ROLE = ROLES.USER;

module.exports = { ROLES, ALL_ROLES, STAFF_ROLES, ADMIN_ROLES, CUSTOMER_ROLE };