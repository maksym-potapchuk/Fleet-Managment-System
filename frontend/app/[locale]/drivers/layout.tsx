import MainLayout from '@/components/layout/MainLayout';

export default function DriversLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
