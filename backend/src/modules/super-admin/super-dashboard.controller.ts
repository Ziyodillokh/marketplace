import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperDashboardService } from './super-dashboard.service';
import { SuperJwtGuard } from './super-jwt.guard';

@Controller('super-admin/dashboard')
@UseGuards(SuperJwtGuard)
export class SuperDashboardController {
  constructor(private readonly service: SuperDashboardService) {}

  @Get('kpi')
  kpi() {
    return this.service.getKpi();
  }

  @Get('revenue')
  revenue(@Query('days') days?: string) {
    return this.service.getRevenueChart(Number(days) || 30);
  }

  @Get('tariff-distribution')
  tariffDistribution() {
    return this.service.getTariffDistribution();
  }

  @Get('activity')
  activity(@Query('limit') limit?: string) {
    return this.service.getActivity(Number(limit) || 20);
  }
}
