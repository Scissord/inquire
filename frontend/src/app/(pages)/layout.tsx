import { MainHeader, Footer } from '@/components';

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MainHeader />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
