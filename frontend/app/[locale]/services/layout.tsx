import MainLayout from '@/components/layout/MainLayout';

export default function ServicesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
