export const DEMO_USER_ID = "portfolio-demo-visitor-v1";
export const DEMO_EMAIL = "visitor@portfolio.invalid";

export function isDemoEnabled() {
  return process.env.DEMO_MODE === "true";
}

export function isSafeDemoUser(user: { role: string; isActive: boolean; passwordHash: string | null }) {
  return user.role === "USER" && user.isActive && user.passwordHash === null;
}
