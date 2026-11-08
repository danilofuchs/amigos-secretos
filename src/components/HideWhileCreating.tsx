'use client';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Leaves out links to the create page while already on it. */
export function HideWhileCreating({ children }: { children: ReactNode }) {
  return usePathname() === '/create' ? null : children;
}
