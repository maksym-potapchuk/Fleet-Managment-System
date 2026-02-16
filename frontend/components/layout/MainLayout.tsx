import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen bg-slate-100/70">
      <Sidebar />

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-7xl p-4 pt-16 sm:p-6 sm:pt-20 lg:p-8 lg:pt-8 2xl:max-w-[96rem]">
          {children}
        </div>
      </main>
    </div>
  );
}
