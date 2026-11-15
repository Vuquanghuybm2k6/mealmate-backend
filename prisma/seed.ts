import { DietType, MealType, Prisma, PrismaClient } from '@prisma/client';
import { DEFAULT_USER_ID } from '../src/config/app-config';
import {
  calculateRecipeCostPerServing,
  calculateRecipeNutritionPerServing,
  isHealthyNutrition,
} from '../src/domain/nutrition';
import {
  assertQuickRecipe,
} from '../src/domain/recipe-constraints';
import { RecipeIngredientEntity } from '../src/domain/entities';
import { ingredients, recipes } from './seed-data';

const prisma = new PrismaClient();

const imageUrlFor = (title: string): string =>
  `https://placehold.co/600x400/e2e8f0/475569?text=${encodeURIComponent(title)}`;

async function seedIngredients(): Promise<void> {
  for (const ingredient of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ingredient.id },
      update: ingredient,
      create: ingredient,
    });
  }
}

async function seedRecipes(): Promise<void> {
  const ingredientById = new Map(
    ingredients.map((ingredient) => [ingredient.id, ingredient]),
  );

  for (const recipe of recipes) {
    const fullIngredients: RecipeIngredientEntity[] = recipe.ingredients.map(
      ([ingredientId, quantity, isMain], index) => {
        const ingredient = ingredientById.get(ingredientId);

        if (!ingredient) {
          throw new Error(`Thiếu nguyên liệu seed: ${ingredientId}`);
        }

        return {
          id: `${recipe.id}-ri-${index + 1}`,
          recipeId: recipe.id,
          ingredientId,
          quantity,
          isMain,
          ingredient: {
            ...ingredient,
          },
        };
      },
    );

    assertQuickRecipe({
      cookMinutes: recipe.cookMinutes,
      difficulty: 'easy',
      tools: recipe.tools,
      servings: recipe.servings,
      steps: recipe.steps,
      ingredients: fullIngredients.map((item) => ({
        quantity: item.quantity,
      })),
    });

    const nutrition = calculateRecipeNutritionPerServing(
      fullIngredients,
      recipe.servings,
    );
    const costEstimate = calculateRecipeCostPerServing(
      fullIngredients,
      recipe.servings,
    );
    const isHealthy = isHealthyNutrition(nutrition, {
      maxKcal: 600,
      minProtein: 15,
    });

    const data = {
      title: recipe.title,
      imageUrl: imageUrlFor(recipe.title),
      cookMinutes: recipe.cookMinutes,
      difficulty: 'easy' as const,
      tools: recipe.tools,
      steps: recipe.steps as Prisma.InputJsonValue,
      servings: recipe.servings,
      costEstimate,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      mealTypes: recipe.mealTypes as MealType[],
      dietTypes: recipe.dietTypes as DietType[],
      spiceLevel: recipe.spiceLevel,
      isHealthy,
    };

    await prisma.recipe.upsert({
      where: { id: recipe.id },
      update: data,
      create: {
        id: recipe.id,
        ...data,
      },
    });

    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: recipe.id },
    });

    await prisma.recipeIngredient.createMany({
      data: fullIngredients.map((item) => ({
        id: item.id,
        recipeId: item.recipeId,
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        isMain: item.isMain,
      })),
    });
  }
}

async function seedDemoUser(): Promise<void> {
  await prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {
      name: 'Sinh viên demo',
      email: 'demo@bepsv.local',
    },
    create: {
      id: DEFAULT_USER_ID,
      name: 'Sinh viên demo',
      email: 'demo@bepsv.local',
    },
  });

  await prisma.userPreference.upsert({
    where: { userId: DEFAULT_USER_ID },
    update: {
      dietType: DietType.omnivore,
      spiceLevel: 1,
      defaultBudget: 30000,
      calorieGoal: 2000,
      proteinGoal: 60,
      healthyMaxKcal: 600,
      healthyMinProtein: 15,
    },
    create: {
      userId: DEFAULT_USER_ID,
      dietType: DietType.omnivore,
      spiceLevel: 1,
      defaultBudget: 30000,
      calorieGoal: 2000,
      proteinGoal: 60,
      healthyMaxKcal: 600,
      healthyMinProtein: 15,
    },
  });

  await prisma.fridgeItem.deleteMany({
    where: { userId: DEFAULT_USER_ID },
  });
}

async function main(): Promise<void> {
  await seedIngredients();
  await seedRecipes();
  await seedDemoUser();

  const [ingredientCount, recipeCount] = await Promise.all([
    prisma.ingredient.count(),
    prisma.recipe.count(),
  ]);

  console.log(
    `Seed hoàn tất: ${ingredientCount} nguyên liệu, ${recipeCount} công thức, user ${DEFAULT_USER_ID}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Seed thất bại', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
