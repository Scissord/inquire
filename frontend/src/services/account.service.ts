import {
  IGetAccountsInput,
  IGetAccountsResponse,
  IGetAccountByIdInput,
  IGetAccountByIdResponse,
} from '@/interfaces';
import { useNotificationStore } from '@/store';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!NEXT_PUBLIC_BACKEND_API_URL) {
  throw new Error('NEXT_PUBLIC_BACKEND_API_URL is not defined');
}

export const AccountService = {
  async get(data: IGetAccountsInput): Promise<IGetAccountsResponse> {
    const url = new URL(`${NEXT_PUBLIC_BACKEND_API_URL}/accounts`);
    if (data.currency) {
      url.searchParams.set('currency', data.currency);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.access_token}`,
      },
      credentials: 'include',
    });

    const result: IGetAccountsResponse = await response.json();

    return result;
  },

  async getAccountById(
    data: IGetAccountByIdInput,
  ): Promise<IGetAccountByIdResponse> {
    const response = await fetch(
      `${NEXT_PUBLIC_BACKEND_API_URL}/accounts/${data.id}/balance`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.access_token}`,
        },
      },
    );

    const result: IGetAccountByIdResponse = await response.json();

    return result;
  },
};
