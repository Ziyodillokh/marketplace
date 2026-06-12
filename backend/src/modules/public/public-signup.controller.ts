import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TariffPlan } from '@prisma/client';
import { PublicSignupService } from './public-signup.service';

class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  shopName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  ownerName!: string;

  @IsEmail()
  @MaxLength(120)
  ownerEmail!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(30)
  @Matches(/^[\d+\s()-]+$/, { message: "Telefon raqam noto'g'ri formatda" })
  ownerPhone!: string;

  @IsEnum(TariffPlan)
  tariffPlan!: TariffPlan;

  @IsBoolean()
  agreeTerms!: boolean;
}

@Controller('public')
export class PublicSignupController {
  constructor(private readonly service: PublicSignupService) {}

  @Post('signup')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5/soat/IP
  async signup(@Body() dto: SignupDto) {
    if (!dto.agreeTerms) {
      return {
        message: 'Foydalanish shartlariga rozilik berish shart',
        field: 'agreeTerms',
      };
    }
    return this.service.signup(dto);
  }
}
