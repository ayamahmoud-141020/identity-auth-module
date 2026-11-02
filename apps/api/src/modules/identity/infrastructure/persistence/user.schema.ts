import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class SessionSubdocument {
  @Prop({ type: String, required: true }) id!: string;
  /** Never selected by default; the repository opts in explicitly. */
  @Prop({ type: String, required: true, select: false }) refreshTokenHash!: string;
  @Prop({ type: Date, required: true }) expiresAt!: Date;
}
const SessionSchema = SchemaFactory.createForClass(SessionSubdocument);

@Schema({ collection: 'users', versionKey: false })
export class UserDocument {
  /** Application-generated UUID; keeps the domain independent of ObjectId. */
  @Prop({ type: String, required: true }) _id!: string;
  @Prop({ type: String, required: true, unique: true }) email!: string;
  @Prop({ type: String, required: true }) name!: string;
  /** Never selected by default; the repository opts in explicitly. */
  @Prop({ type: String, required: true, select: false }) passwordHash!: string;
  @Prop({ type: SessionSchema, default: null }) session!: SessionSubdocument | null;
  @Prop({ type: Date, required: true }) createdAt!: Date;
}

export type UserHydratedDocument = HydratedDocument<UserDocument>;
export const UserSchema = SchemaFactory.createForClass(UserDocument);
