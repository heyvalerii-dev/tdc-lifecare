import type { Metadata } from "next";
import { HomeHeader } from "@/components/home/home-header";
import { HeroSection } from "@/components/home/hero-section";
import { HomePsychologistsSection } from "@/components/home/home-psychologists-section";
import { HowItWorksSection } from "@/components/home/how-it-works-section";
import { ServicesSection } from "@/components/home/services-section";
import { FaqSection } from "@/components/home/faq-section";
import { CtaSection } from "@/components/home/cta-section";
import { HomeFooter } from "@/components/home/home-footer";
import { StickyBookingBar } from "@/components/home/sticky-booking-bar";

export const metadata: Metadata = {
  title: "TDC LifeCare - Psychological Center",
  description:
    "PRC-licensed psychologists providing confidential counseling, assessment, and consultation. Book your appointment online.",
};

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <HomeHeader immersive />
      <main className="flex-1">
        <HeroSection />
        <HomePsychologistsSection />
        <HowItWorksSection />
        <ServicesSection />
        <FaqSection />
        <CtaSection />
      </main>
      <HomeFooter />
      <StickyBookingBar />
    </div>
  );
}
