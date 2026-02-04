export interface IAccount {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
  created_at: string;
  user_email: string;
}

export interface IGetAccountsInput {
  access_token: string;
  currency?: string;
}

export interface IGetAccountsResponse {
  accounts: IAccount[];
  statusCode?: number;
  message?: string | string[];
  error?: string;
}

export interface IGetAccountByIdInput {
  id: string;
  access_token: string;
}

export interface IGetAccountByIdResponse {
  account: IAccount;
  statusCode?: number;
  message?: string | string[];
  error?: string;
}