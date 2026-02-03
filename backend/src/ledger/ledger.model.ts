export interface ITransaction extends Record<string, unknown> {
  id: string;
  type: string;
  status: string;
  created_at: Date;
  metadata: Record<string, unknown>;
}
