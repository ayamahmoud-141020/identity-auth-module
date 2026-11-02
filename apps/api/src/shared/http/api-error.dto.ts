import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type ApiErrorResponse } from '@app/shared';

/** Swagger description of the single error shape produced by HttpExceptionFilter. */
export class ApiErrorDto implements ApiErrorResponse {
  @ApiProperty({ example: 400 }) statusCode!: number;
  @ApiProperty({ example: 'Bad Request' }) error!: string;
  @ApiProperty({ example: 'Request validation failed' }) message!: string;
  @ApiProperty({ example: '/api/v1/auth/sign-up' }) path!: string;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) timestamp!: string;
  @ApiProperty({ example: '6f1c9a4e-1b2d-4c3e-9f0a-0b1c2d3e4f5a' }) requestId!: string;
  @ApiPropertyOptional({
    example: { password: ['At least one number'] },
    description: 'Field-level validation messages (400 only)',
  })
  details?: Record<string, string[]>;
}
