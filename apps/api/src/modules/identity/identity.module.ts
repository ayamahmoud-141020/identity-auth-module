import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PASSWORD_HASHER, TOKEN_ISSUER, USER_REPOSITORY } from './domain/ports';
import { RefreshCookieService } from './features/common/refresh-cookie.service';
import { GetCurrentUserController } from './features/get-current-user/get-current-user.controller';
import { GetCurrentUserHandler } from './features/get-current-user/get-current-user.handler';
import { RefreshSessionController } from './features/refresh-session/refresh-session.controller';
import { RefreshSessionHandler } from './features/refresh-session/refresh-session.handler';
import { SignInController } from './features/sign-in/sign-in.controller';
import { SignInHandler } from './features/sign-in/sign-in.handler';
import { SignOutController } from './features/sign-out/sign-out.controller';
import { SignOutHandler } from './features/sign-out/sign-out.handler';
import { SignUpController } from './features/sign-up/sign-up.controller';
import { SignUpHandler } from './features/sign-up/sign-up.handler';
import { LogUserRegisteredHandler } from './features/user-registered/log-user-registered.handler';
import { MongoUserRepository } from './infrastructure/persistence/mongo-user.repository';
import { UserDocument, UserSchema } from './infrastructure/persistence/user.schema';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher';
import { JwtAuthGuard } from './infrastructure/security/jwt-auth.guard';
import { JwtTokenIssuer } from './infrastructure/security/jwt-token-issuer';

const commandHandlers = [SignUpHandler, SignInHandler, RefreshSessionHandler, SignOutHandler];
const queryHandlers = [GetCurrentUserHandler];
const eventHandlers = [LogUserRegisteredHandler];

@Module({
  imports: [
    CqrsModule,
    JwtModule.register({}), // secrets and TTLs are passed per call by JwtTokenIssuer / JwtAuthGuard
    MongooseModule.forFeature([{ name: UserDocument.name, schema: UserSchema }]),
  ],
  controllers: [
    SignUpController,
    SignInController,
    RefreshSessionController,
    SignOutController,
    GetCurrentUserController,
  ],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    RefreshCookieService,
    JwtAuthGuard,
    // Ports → adapters. Domain and handlers depend only on the tokens.
    { provide: USER_REPOSITORY, useClass: MongoUserRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    { provide: TOKEN_ISSUER, useClass: JwtTokenIssuer },
  ],
})
export class IdentityModule {}
