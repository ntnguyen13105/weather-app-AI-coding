import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, ValidateIf } from 'class-validator';
export class UpdateUserDto {
  @ApiPropertyOptional({ minLength: 1, maxLength: 80 })
  @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  displayName?: string;
  @ApiPropertyOptional({ enum: ['C', 'F'] })
  @ValidateIf((_o, value) => value !== undefined)
  @IsIn(['C', 'F'])
  preferredTemperatureUnit?: 'C' | 'F';
}
export class PasswordDto {
  @ApiProperty({ minLength: 1, maxLength: 128, format: 'password' })
  @IsString()
  @Length(1, 128)
  currentPassword: string;
  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password' })
  @IsString()
  @Length(12, 128)
  newPassword: string;
}
