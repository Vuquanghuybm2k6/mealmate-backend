export const APP_CONFIG = Symbol('APP_CONFIG');
export const DEFAULT_USER_ID = 'demo-user';

export interface AppConfig {
  port: number;
  quickRecipeMaxMinutes: number;
  healthyMaxKcal: number;
  healthyMinProtein: number;
  fridgeMatchThreshold: number;
  reminderSecondDelayMinutes: number;
  reminderSecondWindowMinutes: number;
  defaultUserId: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleCallbackUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  frontendUrl: string;
}

function readNumber(
  rawValue: string | undefined,
  fallback: number,
  { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {},
): number {
  if (rawValue === undefined || rawValue.trim() === '') {
    return fallback;
  }

  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < min || value > max) {
    return fallback;
  }

  return value;
}

export function loadAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): AppConfig {
  return {
    port: readNumber(env.PORT, 3000, { min: 1, max: 65535 }),
    quickRecipeMaxMinutes: readNumber(env.QUICK_RECIPE_MAX_MINUTES, 20, {
      min: 1,
      max: 120,
    }),
    healthyMaxKcal: readNumber(env.HEALTHY_MAX_KCAL, 600, { min: 1 }),
    healthyMinProtein: readNumber(env.HEALTHY_MIN_PROTEIN, 15, { min: 0 }),
    fridgeMatchThreshold: readNumber(env.FRIDGE_MATCH_THRESHOLD, 0.6, {
      min: 0,
      max: 1,
    }),
    reminderSecondDelayMinutes: readNumber(
      env.REMINDER_SECOND_DELAY_MINUTES,
      30,
      { min: 1, max: 240 },
    ),
    reminderSecondWindowMinutes: readNumber(
      env.REMINDER_SECOND_WINDOW_MINUTES,
      60,
      { min: 1, max: 480 },
    ),
    defaultUserId: env.DEFAULT_USER_ID?.trim() || DEFAULT_USER_ID,
    googleClientId: env.GOOGLE_CLIENT_ID?.trim() || undefined,
    googleClientSecret: env.GOOGLE_CLIENT_SECRET?.trim() || undefined,
    googleCallbackUrl:
      env.GOOGLE_CALLBACK_URL?.trim() ||
      'http://localhost:3000/api/v1/auth/google/callback',
    jwtSecret:
      env.JWT_SECRET?.trim() || 'bepsv-dev-secret-change-me-in-production',
    jwtExpiresIn: env.JWT_EXPIRES_IN?.trim() || '7d',
    frontendUrl: env.FRONTEND_URL?.trim() || 'http://localhost:5173',
  };
}
