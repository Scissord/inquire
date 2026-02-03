export interface IUser extends Record<string, unknown> {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
}
