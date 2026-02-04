'use client';

import { Button } from '@/components';
import type { IAccount } from '@/interfaces';

interface AccountDetailsProps {
  account: IAccount;
  isOtherUserAccount: boolean;
  onOpenTransferDialog: () => void;
}

export function AccountDetails({
  account,
  isOtherUserAccount,
  onOpenTransferDialog,
}: AccountDetailsProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="grid gap-3">
        <div>
          <p className="text-xs text-muted-foreground">Account ID</p>
          <p className="font-mono text-sm">{account.id}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">User ID</p>
          <p className="font-mono text-sm">{account.user_id}</p>
          {isOtherUserAccount && (
            <p className="text-xs text-yellow-600 mt-1">
              This account belongs to another user
            </p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Currency</p>
          <p className="text-sm">{account.currency}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-sm">{account.balance}</p>
        </div>
      </div>

      {isOtherUserAccount && (
        <div className="mt-6 pt-4 border-t">
          <Button onClick={onOpenTransferDialog}>
            Transfer to this account
          </Button>
        </div>
      )}
    </div>
  );
}
