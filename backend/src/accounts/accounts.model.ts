export interface IAccount extends Record<string, unknown> {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date;
}
