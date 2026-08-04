import Image from "next/image";

export function HeroIllustration() {
  return (
    <Image
      src="/hero-illustration.png"
      alt=""
      width={585}
      height={610}
      priority
      className="hero-illustration-breathe h-auto w-full max-w-[280px] lg:max-w-[300px]"
      aria-hidden="true"
    />
  );
}
