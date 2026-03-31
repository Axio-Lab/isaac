"use client";

import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { signIn, sendVerificationEmail } from "@/lib/auth-client";
import { GlassButton } from "@/components/ui/glass-button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";

const schema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8, "Password is required"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [socialLoading, setSocialLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (searchParams.get("verified") === "true") {
      toast.success("Email verified! You can now log in.");
      router.replace("/login");
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (isAuthenticated) router.replace("/tasks");
  }, [isAuthenticated, router]);

  const onSubmit = async (values: FormData) => {
    try {
      const result = await signIn.email(
        { email: values.email, password: values.password },
        {
          onError: async (ctx) => {
            if (ctx.error.status === 403) {
              try {
                await sendVerificationEmail({
                  email: values.email,
                  callbackURL: `${window.location.origin}/login?verified=true`,
                });
                toast.success("Verification email sent! Check your inbox.");
                router.push(`/check-email?email=${encodeURIComponent(values.email)}`);
              } catch {
                router.push(`/check-email?email=${encodeURIComponent(values.email)}`);
              }
            } else {
              toast.error(ctx.error.message || "Login failed.");
            }
          },
        }
      );
      if (result?.error) return;
      toast.success("Login successful!");
      window.location.href = "/tasks";
    } catch (error: any) {
      toast.error(error?.message || "An unexpected error occurred.");
    }
  };

  const handleGoogleLogin = async () => {
    setSocialLoading(true);
    try {
      await signIn.social({ provider: "google", callbackURL: "/tasks" });
    } catch {
      toast.error("Failed to sign in with Google.");
      setSocialLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-full px-4 bg-background">
      <div className="w-full max-w-sm border border-border rounded-xl p-5 bg-card">
        <div className="text-center mb-5">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <img src="/images/isaac-mark.svg" alt="" className="h-4 w-4" width={16} height={16} />
          </div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Isaac</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sign in to your account</p>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isSubmitting || socialLoading}
          className="w-full h-9 border border-border rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-muted transition-colors disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Email</label>
            <input
              type="email"
              placeholder="user@example.com"
              {...register("email")}
              className="mt-1 w-full h-9 px-3 border border-border rounded-lg text-base sm:text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.email && (
              <p className="text-[10px] text-destructive mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground">Password</label>
            <input
              type="password"
              placeholder="********"
              {...register("password")}
              className="mt-1 w-full h-9 px-3 border border-border rounded-lg text-base sm:text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.password && (
              <p className="text-[10px] text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[11px] text-primary hover:underline underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>

          <GlassButton
            type="submit"
            disabled={isSubmitting || socialLoading}
            size="sm"
            className="w-full glass-filled"
            contentClassName="flex items-center justify-center w-full text-xs font-semibold py-2.5"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </GlassButton>

          <p className="text-center text-[11px] text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="text-primary hover:underline underline-offset-4 font-medium"
            >
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}
    >
      <LoginForm />
    </Suspense>
  );
}
