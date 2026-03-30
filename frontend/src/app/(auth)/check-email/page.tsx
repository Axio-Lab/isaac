"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { sendVerificationEmail } from "@/lib/auth-client";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const result = await sendVerificationEmail({ email, callbackURL: "/tasks" });
      if (result?.error) {
        toast.error(result.error.message || "Failed to resend verification email.");
      } else {
        toast.success("Verification email resent! Check your inbox.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 bg-background">
      <div className="w-full max-w-sm border border-border rounded-xl p-6 bg-card shadow-sm text-center">
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
        <p className="text-sm text-muted-foreground mb-1">
          We&apos;ve sent a verification link to:
        </p>
        {email && <p className="text-sm font-medium text-foreground mb-4">{email}</p>}
        <p className="text-sm text-muted-foreground mb-6">
          Click the link in the email to verify your account.
        </p>
        <button
          onClick={handleResend}
          disabled={resending || !email}
          className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 mb-3"
        >
          {resending ? "Resending..." : "Resend verification email"}
        </button>
        <Link
          href="/login"
          className="text-sm text-primary underline underline-offset-4 font-medium"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}
    >
      <CheckEmailContent />
    </Suspense>
  );
}
