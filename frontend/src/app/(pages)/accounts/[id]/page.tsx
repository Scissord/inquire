'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { IAccount } from '@/interfaces';
import { AccountService, TransactionService } from '@/services';
import { useNotificationStore, useUserStore } from '@/store';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@/components';

export default function AccountPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const user = useUserStore((state) => state.user);
  const [account, setAccount] = useState<IAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const logout = useUserStore((state) => state.logout);
  const notificationStore = useNotificationStore.getState();

  // Transfer state
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [myAccounts, setMyAccounts] = useState<IAccount[]>([]);
  const [selectedSenderAccountId, setSelectedSenderAccountId] =
    useState<string>('');
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Check if this account belongs to another user
  const isOtherUserAccount = account && user && account.user_id !== user.id;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!id) return;
    if (!mounted) return;
    if (!user?.access_token) return;

    handleFetchAccount(id, user.access_token);
  }, [mounted, id, user?.access_token]);

  const handleFetchAccount = async (id: string, access_token: string) => {
    setIsLoading(true);
    const response = await AccountService.getAccountById({
      id,
      access_token,
    });

    if (response.account) {
      setAccount(response.account);
    } else {
      let errorMessage = response.message
        ? Array.isArray(response.message)
          ? response.message.join(', ')
          : response.message
        : response.error || 'Unknown error';

      if (response.statusCode === 401) {
        logout();
        errorMessage = 'Session expired';
        router.push('/auth');
      }

      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
    setIsLoading(false);
  };

  const handleOpenTransferDialog = async () => {
    if (!user?.access_token) return;

    // Fetch user's own accounts to select sender
    const response = await AccountService.get({
      access_token: user.access_token,
    });

    if (response.accounts && response.accounts.length > 0) {
      // Filter only accounts that belong to current user and have matching currency
      const userAccounts = response.accounts.filter(
        (acc) => acc.user_id === user.id && acc.currency === account?.currency,
      );

      if (userAccounts.length === 0) {
        notificationStore.addNotification({
          type: 'destructive',
          title: 'Error',
          description: `You don't have any ${account?.currency} accounts to transfer from`,
        });
        return;
      }

      setMyAccounts(userAccounts);
      setSelectedSenderAccountId(userAccounts[0].id);
      setIsTransferDialogOpen(true);
    } else {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: 'Failed to load your accounts',
      });
    }
  };

  const handleTransfer = async () => {
    if (
      !user?.access_token ||
      !account ||
      !selectedSenderAccountId ||
      !transferAmount
    ) {
      return;
    }

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: 'Please enter a valid amount',
      });
      return;
    }

    // Check against sender account balance
    const senderAccount = myAccounts.find(
      (acc) => acc.id === selectedSenderAccountId,
    );
    if (senderAccount && amount > senderAccount.balance) {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: `Insufficient funds. Your balance: ${senderAccount.balance} ${senderAccount.currency}`,
      });
      return;
    }

    setIsTransferring(true);

    const response = await TransactionService.createTransfer({
      sender_account_id: selectedSenderAccountId,
      receiver_account_id: account.id,
      amount: transferAmount,
      access_token: user.access_token,
      metadata: {
        sender_account_id: selectedSenderAccountId,
        receiver_account_id: account.id,
        amount: transferAmount,
        currency: account.currency,
        locale: navigator.language || navigator.languages[0] || 'ru',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    if (response.status === 'completed') {
      notificationStore.addNotification({
        type: 'default',
        title: 'Success',
        description: `Successfully transferred ${transferAmount} ${account.currency}`,
      });
      setIsTransferDialogOpen(false);
      setTransferAmount('');
      // Refresh account data
      handleFetchAccount(id!, user.access_token);
    } else {
      let errorMessage = response.message
        ? Array.isArray(response.message)
          ? response.message.join(', ')
          : response.message
        : response.error || 'Transfer failed';

      if (response.statusCode === 401) {
        logout();
        errorMessage = 'Session expired';
        router.push('/auth');
      }

      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }

    setIsTransferring(false);
  };

  return (
    <div className="bg-background p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">
          Account {id}
        </h1>

        {isLoading && (
          <p className="text-sm text-muted-foreground">Loading...</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {!isLoading && !error && account && (
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
                <Button onClick={handleOpenTransferDialog}>
                  Transfer to this account
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Transfer Dialog */}
        <Dialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transfer Funds</DialogTitle>
              <DialogDescription>
                Transfer {account?.currency} to account {account?.id}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Select your account to transfer from:</Label>
                <RadioGroup
                  value={selectedSenderAccountId}
                  onValueChange={setSelectedSenderAccountId}
                >
                  {myAccounts.map((acc) => (
                    <div key={acc.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={acc.id} id={acc.id} />
                      <Label
                        htmlFor={acc.id}
                        className="font-normal cursor-pointer"
                      >
                        <span className="font-mono text-xs">
                          {acc.id.slice(0, 8)}...
                        </span>
                        <span className="ml-2 text-muted-foreground">
                          Balance: {acc.balance} {acc.currency}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ({account?.currency})</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter amount"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsTransferDialogOpen(false)}
                disabled={isTransferring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={
                  isTransferring || !transferAmount || !selectedSenderAccountId
                }
              >
                {isTransferring ? 'Transferring...' : 'Transfer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
