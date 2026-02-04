'use client';

import { TooltipProvider } from '@/components';
import { TransactionService } from '@/services';
import { ITransaction } from '@/interfaces';
import { useNotificationStore, useUserStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { TransactionsFilter, TransactionsTable } from './(blocks)';

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
            <TransactionsFilter
              transactionsPage={transactionsPage}
              setTransactionsPage={setTransactionsPage}
              transactionsType={transactionsType}
              setTransactionsType={setTransactionsType}
              totalPages={totalPages}
              totalTransactions={totalTransactions}
              isTransactionsLoading={isTransactionsLoading}
              canGoPrev={canGoPrev}
              canGoNext={canGoNext}
            />

            <TransactionsTable
              transactions={transactions}
              isTransactionsLoading={isTransactionsLoading}
              formatDateTime={formatDateTime}
            />
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
