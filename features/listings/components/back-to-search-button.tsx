"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackToSearchButton() {
  const router = useRouter();

  const handleBack = () => {
    const listingParams = new URLSearchParams(window.location.search);
    const conversationId = listingParams.get("conversationId");
    if (conversationId) {
      router.push(
        `/?conversationId=${encodeURIComponent(conversationId)}&restore=listing`,
      );
      return;
    }

    if (listingParams.get("restore") === "listing") {
      router.push("/?restore=listing");
      return;
    }

    const referrer = document.referrer;
    const cameFromThisApp = referrer
      ? new URL(referrer).origin === window.location.origin
      : false;

    if (cameFromThisApp) {
      router.back();
      return;
    }

    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        buttonVariants({ variant: "ghost" }),
        "mb-6 gap-2 px-0 text-sm font-semibold text-muted hover:bg-transparent hover:text-ink",
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      Back to search
    </button>
  );
}
