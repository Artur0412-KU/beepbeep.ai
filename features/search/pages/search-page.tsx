"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { supabase } from "@/lib/supabase/client";
import type { Listing } from "@/features/listings/types";
import { ListingCard } from "@/features/listings/components/listing-card";
import { SearchField } from "@/features/search/components/search-field";

const getTimeGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};

export default function Home() {
  const { user, session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Listing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [timeGreeting, setTimeGreeting] = useState("morning");

  useEffect(() => {
    setTimeGreeting(getTimeGreeting());
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProfileName = async () => {
      if (!user) {
        setProfileName("");
        return;
      }

      const { data } = await supabase
        .from("User")
        .select("name")
        .eq("id", user.id)
        .maybeSingle();

      if (isMounted) setProfileName(data?.name?.trim() ?? "");
    };

    void loadProfileName();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError("Tell us what kind of car you are looking for.");
      return;
    }

    setError("");
    setIsSearching(true);
    setHasSearched(false);
    setResults([]);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (session?.access_token)
        headers.Authorization = `Bearer ${session.access_token}`;
      const response = await fetch("/api/search", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });
      const data = (await response.json()) as {
        listings?: Listing[];
        message?: string;
        conversationSaved?: boolean;
      };
      if (!response.ok) throw new Error(data.message || "Search failed.");
      setResults(data.listings ?? []);
      setHasSearched(true);
      setError(
        user && data.conversationSaved === false
          ? "Results loaded, but this conversation could not be saved."
          : "",
      );
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "We could not complete that search.",
      );
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1240px] px-4 py-4 sm:px-7 sm:py-8">
      <AuthHeader />
      <section className="py-8 sm:py-12">
        <h1 className="mt-3 text-center font-display text-[clamp(2.125rem,5vw,4rem)] font-bold leading-[0.98] tracking-[-0.055em] text-ink">
          Good {timeGreeting}, {profileName || "there"}
        </h1>
        <p className="mt-4 text-center text-[17px] text-muted">
          Describe the car you want in your own words and let AI find the
          closest matches.
        </p>
      </section>

      <SearchField
        prompt={prompt}
        isSearching={isSearching}
        error={error}
        onPromptChange={setPrompt}
        onSubmit={handleSearch}
      />

      {hasSearched && (
        <section className="grid gap-[18px] sm:grid-cols-2" aria-live="polite">
          {results.map((listing) => (
            <ListingCard key={listing.listing_id} listing={listing} />
          ))}
        </section>
      )}

      {hasSearched && results.length === 0 && !isSearching && (
        <p className="p-10 text-center text-muted">
          No vehicles match that description. Try broadening your search.
        </p>
      )}
    </main>
  );
}
