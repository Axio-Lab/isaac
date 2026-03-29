"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import { signIn } from "@/lib/auth-client";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormData) => {
    try {
      await fetch("/api/auth/forget-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email, redirectTo: "/login" }),
      });
      setSent(true);
      toast.success("Password reset email sent!");
    } catch {
      toast.error("Failed to send reset email.");
    }
  };

  if (sent) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full px-4 bg-background">
        <div className="w-full max-w-sm border border-border rounded-xl p-6 bg-card shadow-sm text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-sm text-muted-foreground mb-4">
            We&apos;ve sent a password reset link to your email.
          </p>
          <Link href="/login" className="text-sm text-primary underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 bg-background">
      <div className="w-full max-w-sm border border-border rounded-xl p-6 bg-card shadow-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Enter your email to receive a reset link
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <input
              type="email"
              placeholder="user@example.com"
              {...register("email")}
              className="mt-1 w-full h-10 px-3 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 bg-primary text-primary-foreground rounded-md text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary underline underline-offset-4">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
