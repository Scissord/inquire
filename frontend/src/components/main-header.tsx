'use client';

import { useRouter, usePathname } from 'next/navigation';
import { User } from 'lucide-react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
} from '@/components';
  import { useUserStore } from '@/store';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'О компании', href: '/about' },
  { label: 'Модули', href: '/modules' },
  { label: 'Тарифы', href: '/pricing' },
  { label: 'Контакты', href: '/contacts' },
];

export function MainHeader() {
  const router = useRouter();
  const user = useUserStore((state) => state.user);
  const logout = useUserStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push('/auth');
  };
  const pathname = usePathname();

  return (
    <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <div className="text-2xl font-bold">
            <span className="bg-gradient-to-r from-[#d7ad61] via-[#e8c374] to-[#d7ad61] bg-clip-text text-transparent">
              GYV
            </span>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium transition-all duration-200 rounded-md ${
                  isActive
                    ? 'bg-secondary-100 dark:bg-primary-200 text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary-100 dark:hover:bg-primary-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-10 w-10 rounded-full hover:bg-secondary-100/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200">
                <User className="h-5 w-5 text-foreground" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-lg leading-none text-muted-foreground">
                  {user?.email || 'user@example.com'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/profile')}
              className="cursor-pointer"
            >
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
