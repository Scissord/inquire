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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components';
import type { IAccount } from '@/interfaces';
import { AccountService, AuthService, TransactionService } from '@/services';
import { useNotificationStore, useUserStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function TransactionsPage() {
  // hooks
  const router = useRouter();
  // stores
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const logout = useUserStore((state) => state.logout);
  const notificationStore = useNotificationStore.getState();

  // state
  const [mounted, setMounted] = useState(false);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);
  const [isReceiversLoading, setIsReceiversLoading] = useState(false);
  const [myAccounts, setMyAccounts] = useState<IAccount[]>([]);
  const [otherAccounts, setOtherAccounts] = useState<IAccount[]>([]);

  const [activeTab, setActiveTab] = useState<'exchange' | 'transfer'>(
    'exchange',
  );

  // exchange form state
  const [exchangeSourceId, setExchangeSourceId] = useState('');
  const [exchangeDestinationId, setExchangeDestinationId] = useState('');
  const [exchangeAmount, setExchangeAmount] = useState('');
  const [isExchanging, setIsExchanging] = useState(false);

  // transfer form state
  const [transferSenderId, setTransferSenderId] = useState('');
  const [transferReceiverId, setTransferReceiverId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const exchangeSourceAccount = useMemo(
    () => myAccounts.find((a) => a.id === exchangeSourceId) ?? null,
    [myAccounts, exchangeSourceId],
  );

  const exchangeDestinationOptions = useMemo(() => {
    if (!exchangeSourceAccount) return [];
    return myAccounts.filter(
      (a) =>
        a.id !== exchangeSourceAccount.id &&
        a.currency !== exchangeSourceAccount.currency,
    );
  }, [myAccounts, exchangeSourceAccount]);

  const transferSenderAccount = useMemo(
    () => myAccounts.find((a) => a.id === transferSenderId) ?? null,
    [myAccounts, transferSenderId],
  );

  // otherAccounts already filtered by currency on backend
  const transferReceiverOptions = otherAccounts;

  useEffect(() => {
    if (!mounted) return;
    if (!user?.access_token) return;

    const fetchAccounts = async () => {
      setIsAccountsLoading(true);

      // keep user fresh (email/id) + avoid stale session
      const profileRes = await AuthService.getProfile({
        access_token: user.access_token,
      });

      if (profileRes.statusCode && profileRes.statusCode >= 400) {
        let errorMessage = profileRes.message
          ? Array.isArray(profileRes.message)
            ? profileRes.message.join(', ')
            : profileRes.message
          : profileRes.error || 'Unknown error';

        if (profileRes.statusCode === 401) {
          logout();
          errorMessage = 'Session expired';
          router.push('/auth');
        }

        notificationStore.addNotification({
          type: 'destructive',
          title: 'Error',
          description: errorMessage,
        });
        setMyAccounts([]);
        setIsAccountsLoading(false);
        return;
      }

      setUser(profileRes.user);
      setMyAccounts(profileRes.accounts ?? []);
      setIsAccountsLoading(false);
    };

    fetchAccounts();
  }, [
    mounted,
    user?.access_token,
    logout,
    router,
    notificationStore,
    setUser,
  ]);

  // init defaults after accounts loaded
  useEffect(() => {
    if (myAccounts.length === 0) {
      setExchangeSourceId('');
      setExchangeDestinationId('');
      setTransferSenderId('');
      setTransferReceiverId('');
      return;
    }

    // exchange defaults
    setExchangeSourceId((prev) => prev || myAccounts[0].id);
    // transfer defaults
    setTransferSenderId((prev) => prev || myAccounts[0].id);
  }, [myAccounts]);

  // load receiver accounts when sender changes (filtered by currency on backend)
  useEffect(() => {
    if (!user?.access_token || !transferSenderAccount) {
      setOtherAccounts([]);
      return;
    }

    const fetchReceivers = async () => {
      setIsReceiversLoading(true);
      const accountsRes = await AccountService.get({
        access_token: user.access_token,
        currency: transferSenderAccount.currency,
      });

      if (accountsRes.statusCode && accountsRes.statusCode >= 400) {
        setOtherAccounts([]);
      } else {
        setOtherAccounts(accountsRes.accounts ?? []);
      }
      setIsReceiversLoading(false);
    };

    fetchReceivers();
  }, [user?.access_token, transferSenderAccount]);

  // keep exchange destination valid
  useEffect(() => {
    if (!exchangeSourceAccount) {
      setExchangeDestinationId('');
      return;
    }

    const stillValid = exchangeDestinationOptions.some(
      (a) => a.id === exchangeDestinationId,
    );
    if (stillValid) return;

    setExchangeDestinationId(exchangeDestinationOptions[0]?.id ?? '');
  }, [
    exchangeSourceAccount,
    exchangeDestinationOptions,
    exchangeDestinationId,
  ]);

  // keep transfer receiver valid
  useEffect(() => {
    if (!transferSenderAccount) {
      setTransferReceiverId('');
      return;
    }

    const stillValid = transferReceiverOptions.some(
      (a) => a.id === transferReceiverId,
    );
    if (stillValid) return;

    setTransferReceiverId(transferReceiverOptions[0]?.id ?? '');
  }, [transferSenderAccount, transferReceiverOptions, transferReceiverId]);

  const handleExchange = async () => {
    if (
      !user?.access_token ||
      !exchangeSourceId ||
      !exchangeDestinationId ||
      !exchangeAmount
    ) {
      return;
    }

    const amount = parseFloat(exchangeAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: 'Please enter a valid amount',
      });
      return;
    }

    setIsExchanging(true);
    const res = await TransactionService.createExchange({
      access_token: user.access_token,
      source_account_id: exchangeSourceId,
      destination_account_id: exchangeDestinationId,
      amount: exchangeAmount,
      metadata: {
        source_account_id: exchangeSourceId,
        destination_account_id: exchangeDestinationId,
        amount: exchangeAmount,
        locale: navigator.language || navigator.languages[0] || 'ru',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    if (res.status === 'completed') {
      const meta = (res.metadata ?? {}) as Record<string, unknown>;
      const sourceCurrency = String(meta.source_currency ?? '');
      const destCurrency = String(meta.destination_currency ?? '');
      const destAmount = String(meta.destination_amount ?? '');
      const rate = String(meta.rate ?? '');

      notificationStore.addNotification({
        type: 'default',
        title: 'Success',
        description:
          sourceCurrency && destCurrency && destAmount && rate
            ? `Exchanged ${exchangeAmount} ${sourceCurrency} → ${destAmount} ${destCurrency} (rate: ${rate})`
            : 'Exchange completed',
      });

      setExchangeAmount('');
      // refresh my accounts (balances changed after exchange)
      if (user?.access_token) {
        const profileRes = await AuthService.getProfile({
          access_token: user.access_token,
        });
        if (!profileRes.statusCode || profileRes.statusCode < 400) {
          setMyAccounts(profileRes.accounts ?? []);
        }
      }
    } else {
      let errorMessage = res.message
        ? Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message
        : res.error || 'Exchange failed';

      if (res.statusCode === 401) {
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

    setIsExchanging(false);
  };

  const handleTransfer = async () => {
    if (
      !user?.access_token ||
      !transferSenderId ||
      !transferReceiverId ||
      !transferAmount
    ) {
      return;
    }

    const amount = parseFloat(transferAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: 'Please enter a valid amount',
      });
      return;
    }

    const sender = myAccounts.find((a) => a.id === transferSenderId);
    if (sender && amount > Number(sender.balance)) {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: `Insufficient funds. Your balance: ${sender.balance} ${sender.currency}`,
      });
      return;
    }

    setIsTransferring(true);
    const res = await TransactionService.createTransfer({
      access_token: user.access_token,
      sender_account_id: transferSenderId,
      receiver_account_id: transferReceiverId,
      amount: transferAmount,
      metadata: {
        sender_account_id: transferSenderId,
        receiver_account_id: transferReceiverId,
        amount: transferAmount,
        locale: navigator.language || navigator.languages[0] || 'ru',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    if (res.status === 'completed') {
      notificationStore.addNotification({
        type: 'default',
        title: 'Success',
        description: 'Transfer completed',
      });

      setTransferAmount('');

      // refresh accounts (balances changed after transfer)
      if (user?.access_token && transferSenderAccount) {
        const [profileRes, accountsRes] = await Promise.all([
          AuthService.getProfile({ access_token: user.access_token }),
          AccountService.get({
            access_token: user.access_token,
            currency: transferSenderAccount.currency,
          }),
        ]);
        if (!profileRes.statusCode || profileRes.statusCode < 400) {
          setMyAccounts(profileRes.accounts ?? []);
        }
        if (!accountsRes.statusCode || accountsRes.statusCode < 400) {
          setOtherAccounts(accountsRes.accounts ?? []);
        }
      }
    } else {
      let errorMessage = res.message
        ? Array.isArray(res.message)
          ? res.message.join(', ')
          : res.message
        : res.error || 'Transfer failed';

      if (res.statusCode === 401) {
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

  const selectClassName =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-foreground">Transactions</h1>
          <Button variant="outline" onClick={() => router.push('/history')}>
            History
          </Button>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'exchange' | 'transfer')}
        >
          <TabsList className="mb-4">
            <TabsTrigger value="exchange">Exchange</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="exchange">
            <Card>
              <CardHeader>
                <CardTitle>1) Between your wallets (Exchange)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {isAccountsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading accounts...
                  </p>
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
                            {acc.currency} • {acc.balance} •{' '}
                            {acc.id.slice(0, 8)}...
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
                        onChange={(e) =>
                          setExchangeDestinationId(e.target.value)
                        }
                        disabled={isExchanging || !exchangeSourceId}
                      >
                        {exchangeDestinationOptions.length === 0 ? (
                          <option value="">
                            No destination wallets with another currency
                          </option>
                        ) : (
                          exchangeDestinationOptions.map((acc) => (
                            <option key={acc.id} value={acc.id}>
                              {acc.currency} • {acc.balance} •{' '}
                              {acc.id.slice(0, 8)}...
                            </option>
                          ))
                        )}
                      </select>
                      {exchangeSourceAccount &&
                        exchangeDestinationOptions.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            Exchange requires two wallets with different
                            currencies.
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
          </TabsContent>

          <TabsContent value="transfer">
            <Card>
              <CardHeader>
                <CardTitle>2) To other wallets (Transfer)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                {isAccountsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading accounts...
                  </p>
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
                            {acc.currency} • {acc.balance} •{' '}
                            {acc.id.slice(0, 8)}...
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
                        disabled={isTransferring || isReceiversLoading || !transferSenderId}
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
                              {acc.user_email} • {acc.currency} •{' '}
                              {acc.id.slice(0, 8)}...
                            </option>
                          ))
                        )}
                      </select>
                      {transferSenderAccount &&
                        !isReceiversLoading &&
                        transferReceiverOptions.length === 0 && (
                          <p className="text-xs text-muted-foreground">
                            No other users have wallets with {transferSenderAccount.currency} currency.
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
