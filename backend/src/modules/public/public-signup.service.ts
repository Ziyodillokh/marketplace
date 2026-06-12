import { ConflictException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import type { TariffPlan } from '@prisma/client';

export interface SignupInput {
  shopName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  tariffPlan: TariffPlan;
  agreeTerms: boolean;
}

export interface SignupResult {
  ok: true;
  tenantId: string;
  slug: string;
  adminLoginUrl: string;
  tempPassword: string;
}

@Injectable()
export class PublicSignupService {
  private readonly logger = new Logger(PublicSignupService.name);

  constructor(private readonly prisma: PrismaService) {}

  async signup(input: SignupInput): Promise<SignupResult> {
    const shopName = input.shopName.trim();
    const ownerName = input.ownerName.trim();
    const ownerEmail = input.ownerEmail.toLowerCase().trim();
    const ownerPhone = input.ownerPhone.trim();
    const tariffPlan = input.tariffPlan;

    // 1) Email allaqachon bormi
    const existingEmail = await this.prisma.tenant.findUnique({
      where: { ownerEmail },
    });
    if (existingEmail) {
      throw new ConflictException({
        message: 'Bu email allaqachon ro\'yxatdan o\'tgan',
        field: 'ownerEmail',
      });
    }

    // Admin paneldagi ham
    const existingAdmin = await this.prisma.admin.findUnique({
      where: { email: ownerEmail },
    });
    if (existingAdmin) {
      throw new ConflictException({
        message: 'Bu email allaqachon ishlatilgan',
        field: 'ownerEmail',
      });
    }

    // 2) Unique slug yaratish
    const slug = await this.generateUniqueSlug(shopName);

    // 3) Trial — Standard+ tariflarda 14 kun
    const hasTrial = tariffPlan !== 'FREE';
    const trialEndsAt = hasTrial
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      : null;

    // 4) Temp password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // 5) Transaction — Tenant + Admin birga yaratish
    const tenant = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tenant.create({
        data: {
          slug,
          shopName,
          ownerName,
          ownerEmail,
          ownerPhone,
          tariffPlan,
          status: 'ACTIVE',
          isOnTrial: hasTrial,
          trialEndsAt,
        },
      });

      // Admin akkaunt yaratamiz (mijoz admin paneliga kirish uchun)
      // Mavjud Admin model `tenantId` siz, multi-tenant migratsiya keyin bo'ladi
      // Hozir esa admin email tenant email bilan bog'lanadi
      await tx.admin.create({
        data: {
          email: ownerEmail,
          fullName: ownerName,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
        },
      });

      return t;
    });

    this.logger.log(
      `Signup: ${shopName} (${slug}) · ${ownerEmail} · ${tariffPlan}${hasTrial ? ' (trial)' : ''}`,
    );

    // ADMIN_URL "http://localhost:5175" yoki "https://admin.selliostore.uz" formatda
    const adminBase = (process.env.ADMIN_URL ?? 'http://localhost:5175').replace(/\/+$/, '');
    const adminLoginUrl = adminBase.endsWith('/login') ? adminBase : `${adminBase}/login`;

    return {
      ok: true,
      tenantId: tenant.id,
      slug: tenant.slug,
      adminLoginUrl,
      tempPassword,
    };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 40)
      .replace(/^-|-$/g, '');

    const safeBase = base || 'shop';
    let slug = safeBase;
    let attempt = 1;

    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${safeBase}-${attempt}`;
      if (attempt > 50) {
        // Fallback — random suffix
        slug = `${safeBase}-${randomBytes(3).toString('hex')}`;
        break;
      }
    }

    return slug;
  }

  private generateTempPassword(): string {
    // 12 belgili, oson o'qiladigan parol
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnopqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$%';
    const all = upper + lower + digits + special;

    const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

    let pwd =
      pick(upper) +
      pick(upper) +
      pick(lower) +
      pick(lower) +
      pick(lower) +
      pick(digits) +
      pick(digits) +
      pick(special);
    // 4 ta random qo'shimcha
    for (let i = 0; i < 4; i++) pwd += pick(all);
    return pwd
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }
}
