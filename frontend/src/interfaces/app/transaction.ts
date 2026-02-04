export interface ITransaction {
  id: string;
  type: string;
  status: string;
  created_at: Date;
  metadata: Record<string, unknown>;
}

export interface IGetTransactionsInput {
  access_token: string;
  limit: number;
  page: number;
  type?: 'transfer' | 'exchange';
}

export interface IGetTransactionsResponse {
  total?: number;
  transactions: ITransaction[];
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface ICreateTransferInput {
  sender_account_id: string;
  receiver_account_id: string;
  amount: string;
  metadata?: Record<string, unknown>;
  access_token: string;
}

export interface ICreateTransferResponse {
  // success shape
  id?: string;
  type?: string;
  status?: string;
  created_at?: Date;
  metadata?: Record<string, unknown>;

  // error shape
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface ICreateExchangeInput {
  source_account_id: string;
  destination_account_id: string;
  amount: string;
  metadata?: Record<string, unknown>;
  access_token: string;
}

export interface ICreateExchangeResponse {
  // success shape
  id?: string;
  type?: string;
  status?: string;
  created_at?: Date;
  metadata?: Record<string, unknown>;

  // error shape
  statusCode?: number;
  message?: string | string[];
  error?: string;
}
