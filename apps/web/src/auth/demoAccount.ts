/**
 * The seeded demo account (scripts/seed-demo.ts): an Owner of "Mom's medicines" holding
 * sample data only. It exists so a visitor can open the app without creating an account,
 * which sends a real confirmation code by email. The password is already public in the
 * README; it protects nothing beyond the sample cabinet, so it is not a secret.
 *
 * Both values can be overridden at build time (VITE_DEMO_EMAIL, VITE_DEMO_PASSWORD) should
 * the account ever be rotated.
 */
export const DEMO_EMAIL: string = import.meta.env.VITE_DEMO_EMAIL ?? 'asha.demo@asli.internal';
export const DEMO_PASSWORD: string = import.meta.env.VITE_DEMO_PASSWORD ?? 'AsliDemo!2026';
