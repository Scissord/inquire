/* eslint-disable react/no-unescaped-entities */
'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components';
import type { IAccount } from '@/interfaces';

interface ExchangeFormProps {
  isAccountsLoading: boolean;
  myAccounts: IAccount[];
  exchangeSourceId: string;
  setExchangeSourceId: (value: string) => void;
  exchangeDestinationId: string;
  setExchangeDestinationId: (value: string) => void;
  exchangeAmount: string;
  setExchangeAmount: (value: string) => void;
  exchangeSourceAccount: IAccount | null;
  exchangeDestinationOptions: IAccount[];
  isExchanging: boolean;
  handleExchange: () => void;
  selectClassName: string;
}

export function ExchangeForm({
  isAccountsLoading,
  myAccounts,
  exchangeSourceId,
  setExchangeSourceId,
  exchangeDestinationId,
  setExchangeDestinationId,
  exchangeAmount,
  setExchangeAmount,
  exchangeSourceAccount,
  exchangeDestinationOptions,
  isExchanging,
  handleExchange,
  selectClassName,
}: ExchangeFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1) Between your wallets (Exchange)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {isAccountsLoading ? (
          <p className="text-sm text-muted-foreground">Loading accounts...</p>
        ) : myAccounts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You don't have any accounts yet.
          </p>
        ) : (
          <>
            <div className="grid gap-2">
              <Label htmlFor="exchange-source">From (source)</Label>
              <select
                id="exchange-source"
                className={selectClassName}
                value={exchangeSourceId}
                onChange={(e) => setExchangeSourceId(e.target.value)}
                disabled={isExchanging}
              >
                {myAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.currency} • {acc.balance} • {acc.id.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="exchange-destination">To (destination)</Label>
              <select
                id="exchange-destination"
                className={selectClassName}
                value={exchangeDestinationId}
                onChange={(e) => setExchangeDestinationId(e.target.value)}
                disabled={isExchanging || !exchangeSourceId}
              >
                {exchangeDestinationOptions.length === 0 ? (
                  <option value="">
                    No destination wallets with another currency
                  </option>
                ) : (
                  exchangeDestinationOptions.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.currency} • {acc.balance} • {acc.id.slice(0, 8)}...
                    </option>
                  ))
                )}
              </select>
              {exchangeSourceAccount &&
                exchangeDestinationOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Exchange requires two wallets with different currencies.
                  </p>
                )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="exchange-amount">
                Amount
                {exchangeSourceAccount
                  ? ` (${exchangeSourceAccount.currency})`
                  : ''}
              </Label>
              <Input
                id="exchange-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={exchangeAmount}
                onChange={(e) => setExchangeAmount(e.target.value)}
                disabled={isExchanging}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleExchange}
                disabled={
                  isExchanging ||
                  !exchangeSourceId ||
                  !exchangeDestinationId ||
                  !exchangeAmount ||
                  exchangeDestinationOptions.length === 0
                }
              >
                {isExchanging ? 'Exchanging...' : 'Exchange'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
