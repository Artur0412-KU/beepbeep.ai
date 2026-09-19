"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { UserInfoForm } from "@/features/profile/components/user-info-form";

export default function UserPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) router.replace("/");
  }, [authLoading, router, user]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-[1240px] px-4 py-4 sm:px-7 sm:py-8">
        <AuthHeader />
        <div className="flex min-h-[40vh] items-center justify-center text-muted">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading profile...
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-4 sm:px-7 sm:py-8">
      <AuthHeader />
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to search
      </Link>
      <div className="mb-8">
        <p className="text-xs font-bold tracking-[0.14em] text-[#66891a]">
          ACCOUNT
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.05em]">
          Your profile
        </h1>
        <p className="mt-2 text-muted">
          Keep your contact details up to date.
        </p>
      </div>
      <UserInfoForm user={user} />
    </main>
  );
}
