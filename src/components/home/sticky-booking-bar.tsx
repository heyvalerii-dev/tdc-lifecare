"use client";

import { useEffect, useState } from "react";
import { BookingCta } from "./booking-cta";

export function StickyBookingBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--brand-border)] bg-white/95 p-4 backdrop-blur-sm sm:hidden">
      <BookingCta fullWidth />
    </div>
  );
}
