'use client';

import { createContext, useContext, ReactNode } from 'react';

interface SidebarContextType {
  openSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

export function SidebarProvider({
  children,
  openSidebar,
}: {
  children: ReactNode;
  openSidebar: () => void;
}) {
  return (
    <SidebarContext.Provider value={{ openSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}
