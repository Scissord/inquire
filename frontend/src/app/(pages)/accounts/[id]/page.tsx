'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { IAccount } from '@/interfaces';
import { AccountService } from '@/services';
import { useNotificationStore, useUserStore } from '@/store';
import { useRouter } from 'next/navigation';

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
      access_token
    });

    if (response.account) {
      setAccount(response.account);
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
  }

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
          </div>
        )}
      </div>
    </div>
  );
}
