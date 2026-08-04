"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * When a Headless UI Dialog/Drawer is open, Floating UI popovers must portal
 * into this container (the dialog root) — not document.body.
 *
 * Why:
 * 1. Dialog uses z-[60] stacking; body-level popovers at z-50 render underneath
 *    the full-screen drawer shell, so elementFromPoint hits the shell instead.
 * 2. Dialog's useInertOthers marks body siblings outside #headlessui-portal-root
 *    as inert, which blocks pointer events on body-ported popovers.
 */
const OverlayPortalContext = createContext<HTMLElement | null>(null);

export function OverlayPortalProvider({
  root,
  children,
}: {
  root: HTMLElement | null;
  children: ReactNode;
}) {
  return (
    <OverlayPortalContext.Provider value={root}>
      {children}
    </OverlayPortalContext.Provider>
  );
}

export function useOverlayPortalRoot(): HTMLElement | null {
  return useContext(OverlayPortalContext);
}
