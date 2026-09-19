"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WishlistButton({ listingId }: { listingId: string }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const storageKey = user ? `beepbeepai:wishlist:${user.id}` : "";

  useEffect(() => {
    if (!user) {
      setSaved(false);
      setReady(true);
      return;
    }
    try {
      const ids = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      setSaved(Array.isArray(ids) && ids.includes(listingId));
    } catch {
      setSaved(false);
    } finally {
      setReady(true);
    }
  }, [listingId, storageKey, user]);

  const updateWishlist = () => {
    if (!user || !ready) return;
    let ids: string[] = [];
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      ids = Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
    } catch {
      ids = [];
    }
    const nextIds = ids.includes(listingId) ? ids.filter((id) => id !== listingId) : [...ids, listingId];
    window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
    setSaved(nextIds.includes(listingId));
  };

  return (
    <Button type="button" variant="outline" size="sm" className={cn("gap-2", saved && "border-[#66891a] text-[#66891a]")} disabled={!user} aria-pressed={saved} title={user ? "Add to wishlist" : "Sign in to add to wishlist"} onClick={updateWishlist}>
      <Heart className={cn("h-4 w-4", saved && "fill-current")} />
      {saved ? "Saved" : "Wishlist"}
    </Button>
  );
}
