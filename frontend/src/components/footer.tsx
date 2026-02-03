'use client';

import Link from 'next/link';

const navItems = [
  { label: 'Главная', href: '/' },
  { label: 'О компании', href: '/about' },
  { label: 'Модули', href: '/modules' },
  { label: 'Тарифы', href: '/pricing' },
  { label: 'Контакты', href: '/contacts' },
];

const legalItems = [
  { label: 'Политика конфиденциальности', href: '/privacy' },
  { label: 'Договор публичной оферты', href: '/offer' },
  { label: 'Пользовательское соглашение', href: '/terms' },
];

const socials = [
  { label: "What's App", href: '#' },
  { label: 'Instagram', href: '#' },
  { label: 'Facebook', href: '#' },
];

const linkClassName =
  'inline-flex rounded-md px-2 py-1 text-sm text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-secondary-100 dark:hover:bg-primary-200';

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-10">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand / copyright */}
          <div className="space-y-3">
            <div className="text-lg font-semibold text-foreground">GYV</div>
            <p className="text-sm text-muted-foreground">
              © 2025 Все права защищены.
            </p>
          </div>

          {/* Contacts */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Контакты</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Юридический адрес: (заглушка)</p>
              <p>Контактный номер: (заглушка)</p>
              <p>Электронная почта: (заглушка)</p>
            </div>
            <div className="pt-2">
              <div className="flex flex-wrap gap-2">
                {socials.map((s) => (
                  <Link key={s.label} href={s.href} className={linkClassName}>
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Разделы</h3>
            <div className="flex flex-col items-start gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClassName}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Документы</h3>
            <div className="flex flex-col items-start gap-1">
              {legalItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={linkClassName}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
