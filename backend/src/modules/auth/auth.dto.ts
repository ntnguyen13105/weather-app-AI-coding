import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'learner@example.com', maxLength: 254 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email: string;
  @ApiProperty({ minLength: 1, maxLength: 128, format: 'password' })
  @IsString()
  @Length(1, 128)
  password: string;
}
export class RegisterDto extends LoginDto {
  @ApiProperty({ minLength: 12, maxLength: 128, format: 'password' })
  @Length(12, 128)
  declare password: string;
  @ApiProperty({ example: 'Người học', minLength: 1, maxLength: 80 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 80)
  displayName: string;
}
