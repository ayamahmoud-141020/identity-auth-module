import { ApiProperty } from '@nestjs/swagger';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  type SignUpInput,
} from '@app/shared';

/** Swagger documentation only. Validation is done by ZodValidationPipe(signUpSchema). */
export class SignUpRequest implements SignUpInput {
  @ApiProperty({ format: 'email', maxLength: EMAIL_MAX_LENGTH, example: 'jane@example.com' })
  email!: string;

  @ApiProperty({ minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH, example: 'Jane Doe' })
  name!: string;

  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description: 'At least one letter, one number and one special character',
    example: 'Str0ng!pass',
  })
  password!: string;
}
