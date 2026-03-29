import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "Isaac <support@verxio.xyz>",
            to: user.email,
            subject: "Reset your password",
            html: `
              <p>Click the link below to reset your password:</p>
              <a href="${url}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
              <p>Or copy and paste this URL: ${url}</p>
              <p>This link expires in 1 hour.</p>
            `,
            text: `Reset your password: ${url} (expires in 1 hour)`,
          });
        } catch (error) {
          console.error("Failed to send password reset email:", error);
          throw error;
        }
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      if (process.env.RESEND_API_KEY) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "Isaac <support@verxio.xyz>",
            to: user.email,
            subject: "Verify your email address",
            html: `
              <p>Welcome to Isaac! Please verify your email:</p>
              <a href="${url}" style="display:inline-block;padding:10px 20px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a>
              <p>Or copy and paste this URL: ${url}</p>
              <p>This link expires in 24 hours.</p>
            `,
            text: `Verify your Isaac account: ${url} (expires in 24 hours)`,
          });
        } catch (error) {
          console.error("Failed to send verification email:", error);
        }
      }
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: true,
    },
  },

  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET!,
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL!,
    process.env.NEXT_PUBLIC_API_URL!,
  ].filter(Boolean),

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
});
