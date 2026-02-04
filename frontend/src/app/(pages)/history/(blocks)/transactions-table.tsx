'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components';
import { ITransaction } from '@/interfaces';

interface TransactionsTableProps {
  transactions: ITransaction[];
  isTransactionsLoading: boolean;
  formatDateTime: (value: unknown) => string;
}

export function TransactionsTable({
  transactions,
  isTransactionsLoading,
  formatDateTime,
}: TransactionsTableProps) {
  if (isTransactionsLoading) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        Loading transactions...
      </p>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        No transactions found.
      </p>
    );
  }

  return (
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
              <TableCell className="font-mono text-xs">{tx.id}</TableCell>
              <TableCell className="font-mono text-xs">{tx.type}</TableCell>
              <TableCell className="font-mono text-xs">{tx.status}</TableCell>
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
  );
}
