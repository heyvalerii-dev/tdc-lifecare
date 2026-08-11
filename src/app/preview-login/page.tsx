import { Suspense } from "react";
import { PreviewLoginForm } from "./preview-login-form";

export const metadata = {
  title: "Private Preview | TDC LifeCare",
  robots: { index: false, follow: false },
};

export default function PreviewLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white">
          Loading...
        </div>
      }
    >
      <PreviewLoginForm />
    </Suspense>
  );
}
