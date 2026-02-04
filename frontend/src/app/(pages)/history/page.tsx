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
import { TransactionService } from '@/services';
import { ITransaction } from '@/interfaces';
import { useNotificationStore, useUserStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const limit = 10;

export default function HistoryPage() {
  // hooks
  const router = useRouter();
  // stores
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);
  const notificationStore = useNotificationStore.getState();

  // state
  const [mounted, setMounted] = useState(false);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsType, setTransactionsType] = useState<
    '' | 'exchange' | 'transfer'
  >('');
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.access_token) return;

    const fetchTransactions = async () => {
      setIsTransactionsLoading(true);

      const response = await TransactionService.get({
        limit,
        page: transactionsPage,
        access_token: user.access_token,
        ...(transactionsType ? { type: transactionsType } : {}),
      });

      // Treat "empty list" as a valid state, not an error.
      if (response.statusCode && response.statusCode >= 400) {
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

        setTransactions([]);
        setTotalTransactions(0);
      } else {
        setTransactions(response.transactions ?? []);
        setTotalTransactions(response.total ?? 0);
      }

      setIsTransactionsLoading(false);
    };

    fetchTransactions();
  }, [
    mounted,
    user?.access_token,
    transactionsPage,
    transactionsType,
    notificationStore,
    logout,
    router,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalTransactions / limit)),
    [totalTransactions],
  );

  useEffect(() => {
    if (transactionsPage > totalPages) setTransactionsPage(totalPages);
  }, [transactionsPage, totalPages]);

  const canGoPrev = transactionsPage > 1 && !isTransactionsLoading;
  const canGoNext = transactionsPage < totalPages && !isTransactionsLoading;

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
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-4xl font-bold text-foreground">Transactions</h1>
          </div>

          <section className="rounded-lg border bg-card">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">
                  Page {transactionsPage} / {totalPages}
                </span>
                <span className="text-xs text-muted-foreground">
                  (Total: {totalTransactions})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  value={transactionsType}
                  onChange={(e) => {
                    const value = e.target.value as
                      | ''
                      | 'exchange'
                      | 'transfer';
                    setTransactionsType(value);
                    setTransactionsPage(1);
                  }}
                  disabled={isTransactionsLoading}
                  aria-label="Transaction type"
                >
                  <option value="">All</option>
                  <option value="exchange">Exchange</option>
                  <option value="transfer">Transfer</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoPrev}
                  onClick={() =>
                    setTransactionsPage((prev) => Math.max(1, prev - 1))
                  }
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext}
                  onClick={() =>
                    setTransactionsPage((prev) =>
                      Math.min(totalPages, prev + 1),
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>

            {isTransactionsLoading ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">
                Loading transactions...
              </p>
            ) : transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Metadata</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
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
                          {tx.type}
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
                              <span className="block max-w-[520px] truncate font-mono">
                                {metadataText}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-[720px] wrap-break-word font-mono text-xs">
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
              <p className="px-4 py-3 text-sm text-muted-foreground">
                No transactions found.
              </p>
            )}
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
