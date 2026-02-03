'use client';

import { useEffect, useRef, useState } from 'react';
import { useNotificationStore, useUserStore } from '@/store';
import { AuthService } from '@/services';
import { useRouter } from 'next/navigation';
type Props = {}

const Profile = (props: Props) => {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const logout = useUserStore((state) => state.logout);
  const notificationStore = useNotificationStore.getState();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (!user?.access_token) {
      return;
    }

    handleFetchUser(user.access_token);
  }, [mounted]);

  const handleFetchUser = async (access_token: string) => {
    const response = await AuthService.getProfile({
      access_token
    });

    console.log(response);

    if (response?.user) {
      setUser(response.user);
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
  };

  return (
    <>
      <h1>Profile</h1>
      {mounted ? (
        <>
          <p>ID: {user?.id}</p>
          <p>Email: {user?.email}</p>
        </>
      ) : (
        <>
          <p>ID:</p>
          <p>Email:</p>
        </>
      )}
    </>
  )
}

export default Profile