'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardContent,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  LoginForm,
  RegistrationForm,
  Button,
} from '@/components';

export function AuthenticationForm() {
  const [tab, setTab] = useState('login');
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-100 p-4 dark:bg-primary-100">
      <Card className="w-[400px] dark:bg-primary-200 dark:border-primary-200/50 shadow-xl">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoHome}
                className="h-8 w-8 dark:bg-[#293852]"
                aria-label="На главную"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <TabsList className="dark:bg-[#293852] flex-1">
                <TabsTrigger value="login">Вход</TabsTrigger>
                <TabsTrigger value="register">Регистрация</TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            <TabsContent value="register">
              <RegistrationForm setTab={setTab} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
