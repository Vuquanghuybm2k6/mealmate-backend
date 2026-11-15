export interface ParsedFridgeItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  estimatedPrice: number;
  matchedTerm: string;
  sourceText: string;
}

export interface ParsedFridgeResult {
  items: ParsedFridgeItem[];
  unmatched: string[];
}

export interface FridgeItemView {
  id: string;
  ingredientId: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  addedAt: Date;
}

export interface ParseFridgeResultView extends ParsedFridgeResult {
  saved: boolean;
}
