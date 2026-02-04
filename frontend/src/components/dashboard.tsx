'use client';

import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components';
import { useEffect, useState } from 'react';
import { useNotificationStore, useUserStore } from '@/store';
import { IAccount, ITransaction } from '@/interfaces';
import { useRouter } from 'next/navigation';
import { AuthService, TransactionService } from '@/services';

interface ModulesGridProps {
  showTitle?: boolean;
}

export function Dashboard({ showTitle = true }: ModulesGridProps) {
  // hooks
  const router = useRouter();
  // stores
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const logout = useUserStore((state) => state.logout);
  const notificationStore = useNotificationStore.getState();

  // states
  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [isAccountsLoading, setIsAccountsLoading] = useState(false);

  const [exchangeTransactions, setExchangeTransactions] = useState<
    ITransaction[]
  >([]);
  const [transferTransactions, setTransferTransactions] = useState<
    ITransaction[]
  >([]);
  const [isLatestTransactionsLoading, setIsLatestTransactionsLoading] =
    useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.access_token) return;

    handleFetchAccounts(user.access_token);
    handleFetchLatestTransactions(user.access_token);
  }, [mounted, user?.access_token]);

  const handleFetchAccounts = async (access_token: string) => {
    setIsAccountsLoading(true);
    const response = await AuthService.getProfile({ access_token });

    if (response.accounts.length) {
      setUser(response.user);
      setAccounts(response.accounts);
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
    setIsAccountsLoading(false);
  };

  const handleAccountClick = (account_id: string) => {
    router.push(`/accounts/${account_id}`);
  };

  const handleFetchLatestTransactions = async (access_token: string) => {
    setIsLatestTransactionsLoading(true);

    const [exchangeRes, transferRes] = await Promise.all([
      TransactionService.get({
        access_token,
        limit: 5,
        page: 1,
        type: 'exchange',
      }),
      TransactionService.get({
        access_token,
        limit: 5,
        page: 1,
        type: 'transfer',
      }),
    ]);

    const handleError = (response: {
      statusCode?: number;
      message?: string | string[];
      error?: string;
    }) => {
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
    };

    if (exchangeRes.statusCode && exchangeRes.statusCode >= 400) {
      setExchangeTransactions([]);
      handleError(exchangeRes);
    } else {
      setExchangeTransactions(exchangeRes.transactions ?? []);
    }

    if (transferRes.statusCode && transferRes.statusCode >= 400) {
      setTransferTransactions([]);
      handleError(transferRes);
    } else {
      setTransferTransactions(transferRes.transactions ?? []);
    }

    setIsLatestTransactionsLoading(false);
  };

  const formatDateTime = (value: unknown) => {
    if (!value) return '—';
    const date =
      value instanceof Date
        ? value
        : typeof value === 'string' || typeof value === 'number'
          ? new Date(value)
          : null;

    if (!date || Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString();
  };

  return (
    <TooltipProvider>
      <div className="bg-background p-8">
        <div className="max-w-7xl mx-auto">
          {showTitle && (
            <h1 className="text-4xl font-bold text-foreground mb-8">
              Dashboard
            </h1>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-lg font-semibold text-foreground">
                  My Accounts
                </h2>
              </div>

              {isAccountsLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Loading accounts...
                </p>
              ) : accounts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account ID</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow
                        key={account.id}
                        className="cursor-pointer"
                        onClick={() => handleAccountClick(account.id)}
                      >
                        <TableCell className="font-mono text-xs">
                          {account.id}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {account.user_id}
                        </TableCell>
                        <TableCell>{account.currency}</TableCell>
                        <TableCell className="text-right">
                          {account.balance}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  No accounts found.
                </p>
              )}
            </section>

            <section className="rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="text-lg font-semibold text-foreground">
                  Latest transactions
                </h2>
              </div>

              {isLatestTransactionsLoading ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">
                  Loading transactions...
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 p-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Exchange (last 5)
                      </h3>
                    </div>

                    {exchangeTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Metadata</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {exchangeTransactions.map((tx) => {
                            const metadataText =
                              tx.metadata && Object.keys(tx.metadata).length > 0
                                ? JSON.stringify(tx.metadata)
                                : '—';

                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="font-mono text-xs">
                                  {tx.id}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {tx.status}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {formatDateTime(tx.created_at)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block max-w-[260px] truncate font-mono">
                                        {metadataText}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[520px] wrap-break-word font-mono text-xs">
                                      {metadataText}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No exchange transactions found.
                      </p>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-foreground">
                        Transfer (last 5)
                      </h3>
                    </div>

                    {transferTransactions.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Metadata</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transferTransactions.map((tx) => {
                            const metadataText =
                              tx.metadata && Object.keys(tx.metadata).length > 0
                                ? JSON.stringify(tx.metadata)
                                : '—';

                            return (
                              <TableRow key={tx.id}>
                                <TableCell className="font-mono text-xs">
                                  {tx.id}
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {tx.status}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {formatDateTime(tx.created_at)}
                                </TableCell>
                                <TableCell className="text-xs">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block max-w-[260px] truncate font-mono">
                                        {metadataText}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-[520px] wrap-break-word font-mono text-xs">
                                      {metadataText}
                                    </TooltipContent>
                                  </Tooltip>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No transfer transactions found.
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => router.push('/history')}
                    >
                      View all
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
