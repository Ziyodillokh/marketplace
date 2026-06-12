import { Module } from '@nestjs/common';
import { SuperJwtService } from './super-jwt.service';
import { SuperAuthService } from './super-auth.service';
import { SuperAuditService } from './super-audit.service';
import { SuperDashboardService } from './super-dashboard.service';
import { SuperTenantsService } from './super-tenants.service';
import { SuperTeamService } from './super-team.service';
import { SuperTariffsService } from './super-tariffs.service';

import { SuperAuthController } from './super-auth.controller';
import { SuperDashboardController } from './super-dashboard.controller';
import { SuperTenantsController } from './super-tenants.controller';
import { SuperTeamController } from './super-team.controller';
import { SuperAuditController } from './super-audit.controller';
import { SuperTariffsController } from './super-tariffs.controller';
import { SuperSubscriptionsController } from './super-subscriptions.controller';
import { SuperBillingController } from './super-billing.controller';
import { SuperAiController } from './super-ai.controller';
import { SuperSettingsController } from './super-settings.controller';
import { SuperAnalyticsController } from './super-analytics.controller';
import { SuperInfraController } from './super-infra.controller';
import { SuperSupportController } from './super-support.controller';
import { SuperBroadcastsController } from './super-broadcasts.controller';
import { SuperDevController } from './super-dev.controller';

import { SuperJwtGuard, PlatformRolesGuard } from './super-jwt.guard';

@Module({
  controllers: [
    SuperAuthController,
    SuperDashboardController,
    SuperTenantsController,
    SuperTeamController,
    SuperAuditController,
    SuperTariffsController,
    SuperSubscriptionsController,
    SuperBillingController,
    SuperAiController,
    SuperSettingsController,
    SuperAnalyticsController,
    SuperInfraController,
    SuperSupportController,
    SuperBroadcastsController,
    SuperDevController,
  ],
  providers: [
    SuperJwtService,
    SuperAuthService,
    SuperAuditService,
    SuperDashboardService,
    SuperTenantsService,
    SuperTeamService,
    SuperTariffsService,
    SuperJwtGuard,
    PlatformRolesGuard,
  ],
  exports: [SuperJwtService, SuperAuthService, SuperJwtGuard],
})
export class SuperAdminModule {}
