export const DEPARTMENTS = {
  CSR: 7,
  AUDITOR: 11,
} as const;

export const ROUTES = {
  CANCELLATION: "/invoice-management/invoice-cancellation",
  REPORT: "/invoice-management/invoice-summary-report",
  APPROVAL: "/invoice-management/invoice-cancellation-approval",
  APP_HOME: "/app",
} as const;

export const toBool = (v: any) =>
  v === true || v === 1 || v === "true" || v === "1";
