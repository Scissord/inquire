import { IUser } from '@/interfaces';

export type ILoginInput = {
  email: string;
  password: string;
};

export type ILoginOutput = {
  user?: IUser;
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
