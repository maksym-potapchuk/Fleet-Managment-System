import { ReactNode } from "react";
import MainLayout from "@/components/layout/MainLayout";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <MainLayout>{children}</MainLayout>;
}
