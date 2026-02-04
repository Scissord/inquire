import { IAccount, IUser } from '@/interfaces';

export type IProfileInput = {
  access_token: string;
};

export type IProfileOutput = {
  user: IUser;
  accounts: IAccount[];
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
