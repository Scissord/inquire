import './globals.css';
import Provider from './provider';

export const metadata = {
  title: 'Главная',
  description: 'Описание сайта',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
