import { IUser } from '@/interfaces';

export type IRegistrationInput = {
  email: string;
  password: string;
};

export type IRegistrationOutput = {
  user?: IUser;
  statusCode?: number;
  message?: string | string[];
  error?: string;
};
