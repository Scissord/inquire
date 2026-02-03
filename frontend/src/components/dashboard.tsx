'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TooltipProvider,
} from '@/components';
import { useEffect, useState } from 'react';
import { useNotificationStore, useUserStore } from '@/store';
import { AccountService } from '@/services/account.service';
import { IAccount } from '@/interfaces';
import { useRouter } from 'next/navigation';

interface ModulesGridProps {
  showTitle?: boolean;
}

export function Dashboard({ showTitle = true }: ModulesGridProps) {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const [mounted, setMounted] = useState(false);
  const [accounts, setAccounts] = useState<IAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const notificationStore = useNotificationStore.getState();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!user?.access_token) return;

    handleFetchAccounts(user.access_token);
  }, [mounted, user?.access_token]);

  const handleFetchAccounts = async (access_token: string) => {
    setIsLoading(true);
    const response = await AccountService.getAccounts({ access_token });

    if (response.accounts.length) {
      setAccounts(response.accounts);
    } else {
      let errorMessage = response.message
        ? Array.isArray(response.message)
          ? response.message.join(', ')
          : response.message
        : response.error || 'Unknown error';

      if(response.statusCode === 401) {
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

  const handleAccountClick = (account_id: string) => {
    router.push(`/accounts/${account_id}`);
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
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading accounts...</p>
          ) : accounts.length > 0 ? (
            <div className="rounded-lg border bg-card">
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
                      className='cursor-pointer'
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
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No accounts found.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
