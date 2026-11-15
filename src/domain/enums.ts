export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner'] as const;
export type MealTypeValue = (typeof MEAL_TYPES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type DifficultyValue = (typeof DIFFICULTIES)[number];

export const DIET_TYPES = ['omnivore', 'vegetarian', 'vegan'] as const;
export type DietTypeValue = (typeof DIET_TYPES)[number];

export const REMINDER_CHANNELS = ['push', 'email', 'both'] as const;
export type ReminderChannelValue = (typeof REMINDER_CHANNELS)[number];

export const FUN_MESSAGE_CONTEXTS = [
  'wheel',
  'budget_cheap',
  'budget_good',
  'streak',
  'healthy',
] as const;
export type FunMessageContextValue = (typeof FUN_MESSAGE_CONTEXTS)[number];

export const REMINDER_DUE_KINDS = ['primary', 'second'] as const;
export type ReminderDueKind = (typeof REMINDER_DUE_KINDS)[number];
