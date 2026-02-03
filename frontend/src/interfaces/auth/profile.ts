import { IUser } from '@/interfaces';

export type IProfileInput = {
  access_token: string;
};

export type IProfileOutput = {
  user?: IUser;
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
