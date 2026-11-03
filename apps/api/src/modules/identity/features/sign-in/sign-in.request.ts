import { ApiProperty } from '@nestjs/swagger';
import { type SignInInput } from '@app/shared';

/** Swagger documentation only. Validation is done by ZodValidationPipe(signInSchema). */
export class SignInRequest implements SignInInput {
  @ApiProperty({ format: 'email', example: 'jane@example.com' }) email!: string;
  @ApiProperty({ example: 'Str0ng!pass' }) password!: string;
}
