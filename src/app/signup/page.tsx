// src/app/signup/page.tsx
import { Suspense } from "react";
import SignupClient from "./SignupClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading…</div>}>
      <SignupClient />
    </Suspense>
  );
}
