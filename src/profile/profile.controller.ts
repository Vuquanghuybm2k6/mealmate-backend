import { Body, Controller, Get, Put } from '@nestjs/common';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import {
  OrderHistoryView,
  ProfileService,
  ReviewView,
  SavedRecipeView,
  UserProfileView,
} from './profile.service';

@Controller(['profile', 'user/profile'])
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  async getProfile(
    @CurrentUserId() userId: string,
  ): Promise<{ data: UserProfileView }> {
    const profile = await this.profileService.getProfile(userId);
    return { data: profile };
  }

  @Put()
  async updateProfile(
    @CurrentUserId() userId: string,
    @Body() dto: Partial<UserProfileView>,
  ): Promise<{ data: UserProfileView; message: string }> {
    const updated = await this.profileService.updateProfile(userId, dto);
    return { data: updated, message: 'Cập nhật thông tin thành công!' };
  }

  @Get('orders')
  async getOrders(
    @CurrentUserId() userId: string,
  ): Promise<{ data: OrderHistoryView[] }> {
    const orders = await this.profileService.getOrders(userId);
    return { data: orders };
  }

  @Get('saved')
  async getSavedRecipes(
    @CurrentUserId() userId: string,
  ): Promise<{ data: SavedRecipeView[] }> {
    const saved = await this.profileService.getSavedRecipes(userId);
    return { data: saved };
  }

  @Get('reviews')
  async getReviews(
    @CurrentUserId() userId: string,
  ): Promise<{ data: ReviewView[] }> {
    const reviews = await this.profileService.getReviews(userId);
    return { data: reviews };
  }
}
