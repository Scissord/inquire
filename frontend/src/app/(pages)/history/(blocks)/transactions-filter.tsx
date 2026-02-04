'use client';

import { Button } from '@/components';

interface TransactionsFilterProps {
  transactionsPage: number;
  setTransactionsPage: (value: number | ((prev: number) => number)) => void;
  transactionsType: '' | 'exchange' | 'transfer';
  setTransactionsType: (value: '' | 'exchange' | 'transfer') => void;
  totalPages: number;
  totalTransactions: number;
  isTransactionsLoading: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export function TransactionsFilter({
  transactionsPage,
  setTransactionsPage,
  transactionsType,
  setTransactionsType,
  totalPages,
  totalTransactions,
  isTransactionsLoading,
  canGoPrev,
  canGoNext,
}: TransactionsFilterProps) {
  return (
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
            const value = e.target.value as '' | 'exchange' | 'transfer';
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
          onClick={() => setTransactionsPage((prev) => Math.max(1, prev - 1))}
        >
          Prev
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!canGoNext}
          onClick={() =>
            setTransactionsPage((prev) => Math.min(totalPages, prev + 1))
          }
        >
          Next
        </Button>
      </div>
    </div>
  );
}
