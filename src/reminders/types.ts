import { MealTypeValue, ReminderChannelValue, ReminderDueKind } from '../domain/enums';
import { RecipeSummaryView } from '../recipes/types';

export interface ReminderView {
  id: string;
  mealType: MealTypeValue;
  timeOfDay: string;
  channel: ReminderChannelValue;
  enabled: boolean;
  lastSentAt: Date | null;
  secondSentAt: Date | null;
}

export interface DueReminderView {
  reminderId: string;
  mealType: MealTypeValue;
  timeOfDay: string;
  kind: ReminderDueKind;
  slotKey: string;
  title: string;
  message: string;
  quickRecipes: RecipeSummaryView[];
}

export interface PushSubscriptionView {
  id: string;
  endpoint: string;
  createdAt: Date;
}

export interface ReminderDispatchResult {
  checkedUsers: number;
  sent: number;
  delivered: number;
}
