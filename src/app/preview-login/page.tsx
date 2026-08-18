import { Suspense } from "react";
import { PreviewLoginForm } from "./preview-login-form";
import { PageLoadingState } from "@/components/ui/page-loading-state";

export const metadata = {
  title: "Private Preview | TDC LifeCare",
  robots: { index: false, follow: false },
};

export default function PreviewLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col">
          <PageLoadingState />
        </div>
      }
    >
      <PreviewLoginForm />
    </Suspense>
  );
}
