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

interface TransferFormProps {
  isAccountsLoading: boolean;
  myAccounts: IAccount[];
  transferSenderId: string;
  setTransferSenderId: (value: string) => void;
  transferReceiverId: string;
  setTransferReceiverId: (value: string) => void;
  transferAmount: string;
  setTransferAmount: (value: string) => void;
  transferSenderAccount: IAccount | null;
  transferReceiverOptions: IAccount[];
  isTransferring: boolean;
  isReceiversLoading: boolean;
  handleTransfer: () => void;
  selectClassName: string;
}

export function TransferForm({
  isAccountsLoading,
  myAccounts,
  transferSenderId,
  setTransferSenderId,
  transferReceiverId,
  setTransferReceiverId,
  transferAmount,
  setTransferAmount,
  transferSenderAccount,
  transferReceiverOptions,
  isTransferring,
  isReceiversLoading,
  handleTransfer,
  selectClassName,
}: TransferFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>2) To other wallets (Transfer)</CardTitle>
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
              <Label htmlFor="transfer-sender">From (your wallet)</Label>
              <select
                id="transfer-sender"
                className={selectClassName}
                value={transferSenderId}
                onChange={(e) => setTransferSenderId(e.target.value)}
                disabled={isTransferring}
              >
                {myAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.currency} • {acc.balance} • {acc.id.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-receiver">
                To (other user's wallet)
              </Label>
              <select
                id="transfer-receiver"
                className={selectClassName}
                value={transferReceiverId}
                onChange={(e) => setTransferReceiverId(e.target.value)}
                disabled={
                  isTransferring || isReceiversLoading || !transferSenderId
                }
              >
                {isReceiversLoading ? (
                  <option value="">Loading receivers...</option>
                ) : transferReceiverOptions.length === 0 ? (
                  <option value="">
                    No available receiver wallets for this currency
                  </option>
                ) : (
                  transferReceiverOptions.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.user_email} • {acc.currency} • {acc.id.slice(0, 8)}
                      ...
                    </option>
                  ))
                )}
              </select>
              {transferSenderAccount &&
                !isReceiversLoading &&
                transferReceiverOptions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No other users have wallets with{' '}
                    {transferSenderAccount.currency} currency.
                  </p>
                )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="transfer-amount">
                Amount
                {transferSenderAccount
                  ? ` (${transferSenderAccount.currency})`
                  : ''}
              </Label>
              <Input
                id="transfer-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Enter amount"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                disabled={isTransferring}
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleTransfer}
                disabled={
                  isTransferring ||
                  !transferSenderId ||
                  !transferReceiverId ||
                  !transferAmount ||
                  transferReceiverOptions.length === 0
                }
              >
                {isTransferring ? 'Transferring...' : 'Transfer'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
