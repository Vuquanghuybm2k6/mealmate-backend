import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AppConfigModule } from './config/app-config.module';
import { FridgeModule } from './fridge/fridge.module';
import { FunModule } from './fun/fun.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { MealsModule } from './meals/meals.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfileModule } from './profile/profile.module';
import { RecipesModule } from './recipes/recipes.module';
import { RemindersModule } from './reminders/reminders.module';
import { ShoppingModule } from './shopping/shopping.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    IngredientsModule,
    RecipesModule,
    FridgeModule,
    MealsModule,
    ShoppingModule,
    ProfileModule,
    FunModule,
    RemindersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
