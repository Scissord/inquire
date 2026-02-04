import {
  IGetTransactionsInput,
  IGetTransactionsResponse,
  ICreateTransferInput,
  ICreateTransferResponse,
  ICreateExchangeInput,
  ICreateExchangeResponse,
} from '@/interfaces';

const NEXT_PUBLIC_BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL;

if (!NEXT_PUBLIC_BACKEND_API_URL) {
  throw new Error('NEXT_PUBLIC_BACKEND_API_URL is not defined');
}

export const TransactionService = {
  async get(data: IGetTransactionsInput): Promise<IGetTransactionsResponse> {
    const queries = new URLSearchParams();

    if (data.limit) queries.set('limit', String(data.limit));
    if (data.page) queries.set('page', String(data.page));
    if (data.type) queries.set('type', data.type);

    const response = await fetch(
      `${NEXT_PUBLIC_BACKEND_API_URL}/transactions?${queries.toString()}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.access_token}`,
        },
      },
    );

    const result: IGetTransactionsResponse = await response.json();

    return result;
  },

  async createTransfer(
    data: ICreateTransferInput,
  ): Promise<ICreateTransferResponse> {
    const response = await fetch(
      `${NEXT_PUBLIC_BACKEND_API_URL}/transactions/transfer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify({
          sender_account_id: data.sender_account_id,
          receiver_account_id: data.receiver_account_id,
          amount: data.amount,
          metadata: data.metadata || {},
        }),
      },
    );

    const result: ICreateTransferResponse = await response.json();

    return result;
  },

  async createExchange(
    data: ICreateExchangeInput,
  ): Promise<ICreateExchangeResponse> {
    const response = await fetch(
      `${NEXT_PUBLIC_BACKEND_API_URL}/transactions/exchange`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.access_token}`,
        },
        body: JSON.stringify({
          source_account_id: data.source_account_id,
          destination_account_id: data.destination_account_id,
          amount: data.amount,
          metadata: data.metadata || {},
        }),
      },
    );

    const result: ICreateExchangeResponse = await response.json();

    return result;
  },
};
