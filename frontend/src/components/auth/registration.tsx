'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Label,
  Input,
  Button,
} from '@/components';
import { AuthService } from '@/services';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useNotificationStore, useUserStore } from '@/store';
import { IRegistrationOutput } from '@/interfaces';
import { useRouter } from 'next/navigation';

const registrationSchema = z.object({
  email: z.email('Invalid email'),
  password: z
    .string()
    .min(3, 'Password must be at least 3 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
  password_confirmation: z
    .string()
    .min(3, 'Password must be at least 3 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationForm = ({
  setTab,
}: {
  setTab: Dispatch<SetStateAction<string>>;
}) => {
  const router = useRouter();

  const setUser = useUserStore((state) => state.setUser);
  const notificationStore = useNotificationStore.getState();

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordVerification, setShowPasswordVerification] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: 'onBlur',
  });

  const onSubmit = async (data: RegistrationFormData) => {
    if (data.password !== data.password_confirmation) {
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: 'Passwords do not match!',
      });
      return;
    }

    const response: IRegistrationOutput = await AuthService.registration({
      email: data.email,
      password: data.password,
    });

    if (response?.user?.id) {
      setUser(response.user);
      router.push('/');
    } else {
      const errorMessage = response.message
        ? Array.isArray(response.message)
          ? response.message.join(', ')
          : response.message
        : response.error || 'Unknown error';
      notificationStore.addNotification({
        type: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    }
  };

  return (
    <form
      className="space-y-4 p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="example@mail.com"
          {...register('email')}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            className={errors.password ? 'border-red-500' : ''}
          />
          <button
            // variant={'ghost'}
            // size={'sm'}
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>
      <div>
        <Label htmlFor="password_confirmation">
          Password confirmation
        </Label>
        <div className="relative">
          <Input
            id="password_confirmation"
            placeholder="••••••••"
            type={showPassword ? 'text' : 'password'}
            {...register('password_confirmation')}
            className={errors.password_confirmation ? 'border-red-500' : ''}
          />
          <button
            // variant={'ghost'}
            // size={'sm'}
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
            onClick={() =>
              setShowPasswordVerification(!showPasswordVerification)
            }
          >
            {showPasswordVerification ? (
              <EyeOffIcon size={16} />
            ) : (
              <EyeIcon size={16} />
            )}
          </button>
        </div>
        {errors.password_confirmation && (
          <p className="text-red-500 text-sm mt-1">
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center">
        <Button variant="link" onClick={() => setTab('login')}>
          Already have an account?
        </Button>
      </div>
      <Button className="w-full mt-2" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Loading...' : 'Register'}
      </Button>
    </form>
  );
};
