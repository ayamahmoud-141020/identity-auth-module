import { ApiProperty } from '@nestjs/swagger';
import { type AuthResponse, type UserResponse } from '@app/shared';

export class UserResponseDto implements UserResponse {
  @ApiProperty({ example: '6f1c9a4e-1b2d-4c3e-9f0a-0b1c2d3e4f5a' }) id!: string;
  @ApiProperty({ example: 'jane@example.com' }) email!: string;
  @ApiProperty({ example: 'Jane Doe' }) name!: string;
  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' }) createdAt!: string;
}

export class AuthResponseDto implements AuthResponse {
  @ApiProperty({
    description: 'Short-lived JWT. Keep in memory; send as `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiProperty({ type: UserResponseDto }) user!: UserResponseDto;
}
