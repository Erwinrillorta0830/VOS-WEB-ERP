import { DEPARTMENTS, ROUTES } from "../constants/constants";

// Type definition for the permission check function
type PermissionCheck = (dept: number, isAdmin: boolean) => boolean;

/**
 * PERMISSION_SCHEMA
 * Centralized mapping of routes to the roles allowed to access them.
 */
export const PERMISSION_SCHEMA: Record<string, PermissionCheck> = {
  [ROUTES.CANCELLATION]: (dept) => dept === DEPARTMENTS.CSR || dept === DEPARTMENTS.IT,
  [ROUTES.REPORT]: (dept) => dept === DEPARTMENTS.AUDITOR || dept === DEPARTMENTS.IT,
  [ROUTES.APPROVAL]: (dept, admin) => (dept === DEPARTMENTS.AUDITOR && admin) || dept === DEPARTMENTS.IT,

  // To add a new department in the future, just add one line here:
  // [ROUTES.WAREHOUSE]: (dept) => dept === DEPARTMENTS.WAREHOUSE,
};

/**
 * Helper function to validate access
 */
export function hasAccess(
  route: string,
  dept: number | null,
  isAdmin: boolean,
): boolean {
  if (dept === null) return false;
  const check = PERMISSION_SCHEMA[route];
  // If no check is defined for a route, default to allowing it (or false for strict security)
  return check ? check(dept, isAdmin) : true;
}

export function getInvoiceFallback(
  dept: number | null,
  isAdmin: boolean,
): string {
  if (dept === DEPARTMENTS.CSR || dept === DEPARTMENTS.IT) return ROUTES.CANCELLATION;
  if (dept === DEPARTMENTS.AUDITOR) {
    return isAdmin ? ROUTES.APPROVAL : ROUTES.REPORT;
  }
  return ROUTES.APP_HOME;
}
