import {
  IRegistrationInput,
  IRegistrationOutput,
  ILoginInput,
  ILoginOutput,
  IProfileInput,
  IProfileOutput,
} from '@/interfaces';
import { useNotificationStore } from '@/store';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!NEXT_PUBLIC_BACKEND_API_URL) {
  throw new Error('NEXT_PUBLIC_BACKEND_API_URL is not defined');
}

export const AuthService = {
  async registration(data: IRegistrationInput): Promise<IRegistrationOutput> {
    const response = await fetch(`${NEXT_PUBLIC_BACKEND_API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result: IRegistrationOutput = await response.json();

    return result;
  },

  async login(data: ILoginInput): Promise<ILoginOutput> {
    const response = await fetch(`${NEXT_PUBLIC_BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    });

    const result: ILoginOutput = await response.json();

    return result;
  },

  async getProfile(data: IProfileInput): Promise<IProfileOutput> {
    const response = await fetch(`${NEXT_PUBLIC_BACKEND_API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.access_token}`,
      },
      credentials: 'include',
    });

    const result: IProfileOutput = await response.json();

    return result;
  },
};
