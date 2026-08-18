import { Suspense } from "react";
import LoginForm from "./login-form";
import { PageLoadingState } from "@/components/ui/page-loading-state";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col">
          <PageLoadingState />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
