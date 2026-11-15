import { Injectable } from '@nestjs/common';
import { IngredientEntity } from '../domain/entities';
import {
  normalizeForParser,
  normalizeForSearch,
  splitIngredientClauses,
} from '../domain/text';
import { roundTo } from '../domain/nutrition';
import { ParsedFridgeItem, ParsedFridgeResult } from './types';

interface IngredientTerm {
  ingredient: IngredientEntity;
  term: string;
}

interface IngredientMention {
  ingredient: IngredientEntity;
  term: string;
  start: number;
  end: number;
}

interface QuantityCandidate {
  index: number;
  end: number;
  value: number;
  kind: 'weight' | 'count' | 'none';
  grams?: number;
  unit?: string;
}

const QUANTITY_WORDS: Record<string, number> = {
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  nua: 0.5,
  it: 1,
  vai: 2,
};

const WEIGHT_UNIT_TO_GRAMS: Record<string, number> = {
  g: 1,
  gr: 1,
  gam: 1,
  gram: 1,
  kg: 1000,
  kgm: 1000,
  ml: 1,
  l: 1000,
  lit: 1000,
};

const COUNT_UNITS = new Set([
  'qua',
  'trai',
  'cai',
  'cu',
  'bo',
  'nhanh',
  'cay',
  'con',
  'goi',
  'hop',
  'lon',
  'chai',
  'mieng',
  'lat',
  'chen',
  'bat',
  'thia',
  'muong',
  'phan',
  'nam',
  'nham',
]);

const UNIT_PATTERN = [
  ...Object.keys(WEIGHT_UNIT_TO_GRAMS),
  ...COUNT_UNITS,
]
  .sort((first, second) => second.length - first.length)
  .join('|');

const NUMBER_REGEX = new RegExp(
  `(\\d+(?:\\.\\d+)?)\\s*(${UNIT_PATTERN})?`,
  'g',
);

const QUANTITY_WORD_REGEX = new RegExp(
  `\\b(mot|hai|ba|bon|tu|sau|bay|tam|chin|nua|it|vai)\\b(?:\\s+(${UNIT_PATTERN}))?`,
  'g',
);

const DEFAULT_WEIGHT_QUANTITY_GRAMS = 100;

@Injectable()
export class FridgeParserService {
  parse(text: string, ingredients: IngredientEntity[]): ParsedFridgeResult {
    const clauses = splitIngredientClauses(text);
    const termIndex = this.buildTermIndex(ingredients);
    const accumulated = new Map<
      string,
      ParsedFridgeItem & { sourceText: string }
    >();
    const unmatched: string[] = [];

    for (const rawClause of clauses) {
      const clause = normalizeForParser(rawClause);

      if (!clause) {
        continue;
      }

      const mentions = this.findMentions(clause, termIndex);

      if (mentions.length === 0) {
        unmatched.push(rawClause);
        continue;
      }

      const quantities = this.findQuantities(clause, mentions);

      for (const mention of mentions) {
        const quantity = this.findNearestQuantity(quantities, mention);
        const converted = this.convertQuantity(quantity, mention.ingredient);
        const existing = accumulated.get(mention.ingredient.id);

        if (existing) {
          existing.quantity = roundTo(existing.quantity + converted, 2);
          existing.estimatedPrice = Math.round(
            existing.quantity * mention.ingredient.pricePerUnit,
          );
          continue;
        }

        accumulated.set(mention.ingredient.id, {
          ingredientId: mention.ingredient.id,
          name: mention.ingredient.name,
          quantity: converted,
          unit: mention.ingredient.unit,
          estimatedPrice: Math.round(
            converted * mention.ingredient.pricePerUnit,
          ),
          matchedTerm: mention.term,
          sourceText: rawClause,
        });
      }
    }

    return {
      items: [...accumulated.values()],
      unmatched,
    };
  }

  private buildTermIndex(ingredients: IngredientEntity[]): IngredientTerm[] {
    const terms: IngredientTerm[] = [];

    for (const ingredient of ingredients) {
      const candidates = [ingredient.name, ...ingredient.aliases];

      for (const candidate of candidates) {
        const term = normalizeForSearch(candidate);

        if (term.length > 0) {
          terms.push({ ingredient, term });
        }
      }
    }

    return terms.sort(
      (first, second) =>
        second.term.length - first.term.length ||
        first.term.localeCompare(second.term, 'vi'),
    );
  }

  private findMentions(
    clause: string,
    terms: IngredientTerm[],
  ): IngredientMention[] {
    const occupied = new Array<boolean>(clause.length).fill(false);
    const mentions: IngredientMention[] = [];

    for (const { ingredient, term } of terms) {
      let start = clause.indexOf(term);

      while (start !== -1) {
        const end = start + term.length;

        if (
          this.hasWordBoundary(clause, start, end) &&
          !this.isOccupied(occupied, start, end)
        ) {
          mentions.push({ ingredient, term, start, end });
          this.markOccupied(occupied, start, end);
        }

        start = clause.indexOf(term, start + 1);
      }
    }

    return mentions.sort((first, second) => first.start - second.start);
  }

  private findQuantities(
    clause: string,
    mentions: IngredientMention[],
  ): QuantityCandidate[] {
    const candidates: QuantityCandidate[] = [];
    const numericClause = clause.replace(
      /(\d+)\s*\/\s*(\d+)/g,
      (_match, numerator: string, denominator: string) =>
        String(Number(numerator) / Number(denominator)),
    );

    const numberRegex = new RegExp(NUMBER_REGEX.source, 'g');
    let match: RegExpExecArray | null;

    while ((match = numberRegex.exec(numericClause)) !== null) {
      const unit = match[2];
      const start = match.index;
      const end = start + match[0].length;

      if (this.overlapsMention(start, end, mentions)) {
        continue;
      }

      candidates.push(
        this.buildQuantityCandidate(
          Number(match[1]),
          unit,
          start,
          end,
        ),
      );
    }

    const wordRegex = new RegExp(QUANTITY_WORD_REGEX.source, 'g');

    while ((match = wordRegex.exec(numericClause)) !== null) {
      const word = match[1];
      const unit = match[2];
      const start = match.index;
      const end = start + match[0].length;

      if (this.overlapsMention(start, end, mentions)) {
        continue;
      }

      candidates.push(
        this.buildQuantityCandidate(
          QUANTITY_WORDS[word],
          unit,
          start,
          end,
        ),
      );
    }

    return candidates.sort((first, second) => first.index - second.index);
  }

  private buildQuantityCandidate(
    value: number,
    rawUnit: string | undefined,
    index: number,
    end: number,
  ): QuantityCandidate {
    if (!rawUnit) {
      return { index, end, value, kind: 'none' };
    }

    const unit = normalizeForSearch(rawUnit);
    const gramsPerUnit = WEIGHT_UNIT_TO_GRAMS[unit];

    if (gramsPerUnit !== undefined) {
      return {
        index,
        end,
        value,
        kind: 'weight',
        grams: value * gramsPerUnit,
        unit,
      };
    }

    if (COUNT_UNITS.has(unit)) {
      return { index, end, value, kind: 'count', unit };
    }

    return { index, end, value, kind: 'none' };
  }

  private findNearestQuantity(
    quantities: QuantityCandidate[],
    mention: IngredientMention,
  ): QuantityCandidate | undefined {
    let nearest: QuantityCandidate | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const quantity of quantities) {
      const distance = this.distanceToMention(quantity, mention);

      if (distance < nearestDistance) {
        nearest = quantity;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  private convertQuantity(
    quantity: QuantityCandidate | undefined,
    ingredient: IngredientEntity,
  ): number {
    const ingredientUnit = normalizeForSearch(ingredient.unit);
    const ingredientIsWeight = WEIGHT_UNIT_TO_GRAMS[ingredientUnit] !== undefined;
    const gramsPerIngredientUnit = ingredient.gramsPerUnit || 1;

    if (!quantity) {
      if (!ingredientIsWeight) {
        return 1;
      }

      return this.gramsToIngredientQuantity(
        DEFAULT_WEIGHT_QUANTITY_GRAMS,
        ingredientUnit,
      );
    }

    if (quantity.kind === 'weight') {
      const grams = quantity.grams ?? 0;

      if (ingredientIsWeight) {
        return roundTo(this.gramsToIngredientQuantity(grams, ingredientUnit), 2);
      }

      return roundTo(grams / gramsPerIngredientUnit, 2);
    }

    if (ingredientIsWeight) {
      return roundTo(
        this.gramsToIngredientQuantity(
          quantity.value * gramsPerIngredientUnit,
          ingredientUnit,
        ),
        2,
      );
    }

    return roundTo(quantity.value, 2);
  }

  private gramsToIngredientQuantity(
    grams: number,
    ingredientUnit: string,
  ): number {
    if (
      ingredientUnit === 'kg' ||
      ingredientUnit === 'kgm' ||
      ingredientUnit === 'l' ||
      ingredientUnit === 'lit'
    ) {
      return grams / 1000;
    }

    return grams;
  }

  private distanceToMention(
    quantity: QuantityCandidate,
    mention: IngredientMention,
  ): number {
    if (quantity.index >= mention.start && quantity.index <= mention.end) {
      return 0;
    }

    if (quantity.end >= mention.start && quantity.end <= mention.end) {
      return 0;
    }

    return Math.min(
      Math.abs(quantity.index - mention.start),
      Math.abs(quantity.end - mention.end),
      Math.abs(quantity.end - mention.start),
      Math.abs(quantity.index - mention.end),
    );
  }

  private overlapsMention(
    start: number,
    end: number,
    mentions: IngredientMention[],
  ): boolean {
    return mentions.some(
      (mention) => start < mention.end && end > mention.start,
    );
  }

  private hasWordBoundary(clause: string, start: number, end: number): boolean {
    const before = start === 0 ? ' ' : clause[start - 1];
    const after = end >= clause.length ? ' ' : clause[end];

    return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
  }

  private isOccupied(occupied: boolean[], start: number, end: number): boolean {
    for (let index = start; index < end; index += 1) {
      if (occupied[index]) {
        return true;
      }
    }

    return false;
  }

  private markOccupied(
    occupied: boolean[],
    start: number,
    end: number,
  ): void {
    for (let index = start; index < end; index += 1) {
      occupied[index] = true;
    }
  }
}
