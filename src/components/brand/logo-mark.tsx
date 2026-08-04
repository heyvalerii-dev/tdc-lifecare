interface LogoMarkProps {
  className?: string;
}

/** Hands-only logo mark — sourced from brand SVG asset */
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 150 150"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <image width="150" height="150" href="/logo-mark.png" />
    </svg>
  );
}
