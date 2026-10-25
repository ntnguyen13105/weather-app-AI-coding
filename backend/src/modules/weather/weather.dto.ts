import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { queryNumber } from '../../common/location.js';
export class CoordinatesDto {
  @ApiProperty({ example: 21.0285, minimum: -90, maximum: 90 })
  @Transform(queryNumber)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;
  @ApiProperty({ example: 105.8542, minimum: -180, maximum: 180 })
  @Transform(queryNumber)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lon: number;
}
export class SearchDto {
  @ApiProperty({ example: 'Hà Nội', minLength: 2, maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.normalize('NFC').trim().replace(/\s+/g, ' ')
      : value,
  )
  @IsString()
  @Length(2, 100)
  q: string;
  @ApiPropertyOptional({ example: 'VN', pattern: '^[A-Z]{2}$' })
  @ValidateIf((_o, value) => value !== undefined)
  @Matches(/^[A-Z]{2}$/)
  country?: string;
}
export class EmptyQueryDto {}
