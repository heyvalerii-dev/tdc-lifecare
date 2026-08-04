import Image from "next/image";

/**
 * Mobile-only watermark behind hero copy.
 *
 * Stacking: must sit at z-0 inside an `isolate` parent — negative z-index
 * would paint behind the page's bg-white and disappear entirely.
 */
export function HeroMobileWatermark() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center lg:hidden"
      aria-hidden="true"
    >
      <Image
        src="/hero-illustration.png"
        alt=""
        width={585}
        height={610}
        priority
        className="h-auto w-[clamp(180px,52vw,240px)] opacity-[0.15] blur-[1px]"
      />
    </div>
  );
}
