import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export const queryNumber = ({ value }: { value: unknown }) =>
  typeof value === 'string' &&
  value.trim() &&
  /^-?(?:\d+\.?\d*|\.\d+)$/.test(value)
    ? Number(value)
    : NaN;
export function coordinates(lat: number, lon: number) {
  const latitude = Number(lat.toFixed(4)) || 0;
  const longitude = Number(lon.toFixed(4)) || 0;
  return {
    latitude,
    longitude,
    locationKey: `ow:${latitude.toFixed(4)}:${longitude.toFixed(4)}`,
  };
}
export class LocationDto {
  @ApiProperty({ example: 'Hà Nội', maxLength: 160 })
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  name: string;
  @ApiProperty({ example: 'VN', pattern: '^[A-Z]{2}$' })
  @Matches(/^[A-Z]{2}$/)
  country: string;
  @ApiPropertyOptional({ nullable: true, maxLength: 160 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 160)
  state?: string | null;
  @ApiProperty({ example: 21.0285, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;
  @ApiProperty({ example: 105.8542, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}
export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Transform(queryNumber)
  @IsInt()
  @Min(1)
  @Max(1000000)
  page = 1;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Transform(queryNumber)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 20;
}
export class HistoryPaginationDto extends PaginationDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 20 })
  @Max(20)
  declare pageSize: number;
}
export function locationData(dto: LocationDto) {
  return {
    ...coordinates(dto.latitude, dto.longitude),
    name: dto.name,
    country: dto.country,
    state: dto.state ?? null,
  };
}
type StoredLocation = {
  locationKey: string;
  name: string;
  country: string;
  state: string | null;
  latitude: unknown;
  longitude: unknown;
};
export function publicLocation(row: StoredLocation) {
  return {
    locationKey: row.locationKey,
    name: row.name,
    country: row.country,
    state: row.state,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}
export function pagination(query: PaginationDto, totalItems: number) {
  return {
    page: query.page,
    pageSize: query.pageSize,
    totalItems,
    totalPages: Math.ceil(totalItems / query.pageSize),
  };
}
