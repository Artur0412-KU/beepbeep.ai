"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { AuthHeader } from "@/features/auth/components/auth-header";
import { supabase } from "@/lib/supabase/client";
import type { Listing } from "@/features/listings/types";
import { ListingCard } from "@/features/listings/components/listing-card";
import { SearchField } from "@/features/search/components/search-field";
import listings from "@/features/listings/data/listing-dataset.json";
import {
  matchesSearchContext,
  parseSearchContext,
} from "@/features/search/lib/search-context";
import { ConversationSidebar } from "@/features/search/components/conversation-sidebar";
import { Conversation } from "../types";
import { getTimeGreeting, listingReturnStorageKey } from "../lib/utils";

export default function Home() {
  const { user, session } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Listing[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [timeGreeting, setTimeGreeting] = useState("morning");
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [conversationRefreshKey, setConversationRefreshKey] = useState(0);
  const [isConversationDrawerOpen, setIsConversationDrawerOpen] =
    useState(false);

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
        conversationId?: string | null;
      };
      if (!response.ok) throw new Error(data.message || "Search failed.");
      setResults(data.listings ?? []);
      setHasSearched(true);
      setActiveConversationId(data.conversationId ?? null);
      if (user && data.conversationId) {
        setConversationRefreshKey((current) => current + 1);
      }
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

  const handleNewSearch = () => {
    setPrompt("");
    setResults([]);
    setHasSearched(false);
    setError("");
    setActiveConversationId(null);
  };

  const handleConversationSelect = (conversation: Conversation) => {
    try {
      const filters = parseSearchContext(conversation.ai_response_text);
      setPrompt(conversation.raw_user_prompt);
      setResults(
        (listings as Listing[]).filter((listing) =>
          matchesSearchContext(listing, filters),
        ),
      );
      setHasSearched(true);
      setError("");
      setActiveConversationId(conversation.conversation_id);
    } catch {
      setPrompt(conversation.raw_user_prompt);
      setResults([]);
      setHasSearched(false);
      setActiveConversationId(conversation.conversation_id);
      setError("This saved search is no longer available to restore.");
    }
  };

  useEffect(() => {
    if (!hasSearched) return;

    try {
      sessionStorage.setItem(
        listingReturnStorageKey,
        JSON.stringify({
          prompt,
          results,
          conversationId: activeConversationId,
        }),
      );
    } catch {
      // Session storage can be unavailable in private browsing contexts.
    }
  }, [activeConversationId, hasSearched, prompt, results]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationId = params.get("conversationId");
    const shouldRestoreAnonymousSearch = params.get("restore") === "listing";

    if (!conversationId && !shouldRestoreAnonymousSearch) return;

    const clearRestoreParams = () => {
      window.history.replaceState({}, "", "/");
    };

    if (conversationId && user) {
      let isMounted = true;
      const loadConversation = async () => {
        const { data, error: queryError } = await supabase
          .from("conversations")
          .select(
            "conversation_id, raw_user_prompt, ai_response_text, created_at",
          )
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (!isMounted) return;

        if (queryError || !data) {
          setError("We couldn't restore that conversation.");
        } else {
          handleConversationSelect(data as Conversation);
          clearRestoreParams();
        }
      };

      void loadConversation();
      return () => {
        isMounted = false;
      };
    }

    try {
      const savedSearch = sessionStorage.getItem(listingReturnStorageKey);
      if (!savedSearch) return;

      const restored = JSON.parse(savedSearch) as {
        prompt?: unknown;
        results?: unknown;
        conversationId?: unknown;
      };
      if (
        typeof restored.prompt !== "string" ||
        !Array.isArray(restored.results)
      ) {
        return;
      }

      setPrompt(restored.prompt);
      setResults(restored.results as Listing[]);
      setHasSearched(true);
      setActiveConversationId(
        typeof restored.conversationId === "string"
          ? restored.conversationId
          : null,
      );
      setError("");
      sessionStorage.removeItem(listingReturnStorageKey);
      clearRestoreParams();
    } catch {
      setError("We couldn't restore that search.");
    }
  }, [user]);

  return (
    <main className="mx-auto flex max-w-[1480px] gap-5 px-4 py-4 sm:px-7 sm:py-3">
      <ConversationSidebar
        activeConversationId={activeConversationId}
        refreshKey={conversationRefreshKey}
        isDrawerOpen={isConversationDrawerOpen}
        onDrawerOpenChange={setIsConversationDrawerOpen}
        onNewSearch={handleNewSearch}
        onSelectConversation={handleConversationSelect}
      />
      <div className="min-w-0 flex-1">
        <AuthHeader
          onOpenConversations={() => setIsConversationDrawerOpen(true)}
        />
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
          onPromptChange={(value) => {
            setPrompt(value);
            setActiveConversationId(null);
          }}
          onSubmit={handleSearch}
        />

        {hasSearched && (
          <section
            className="grid gap-[18px] sm:grid-cols-2"
            aria-live="polite"
          >
            {results.map((listing) => (
              <ListingCard
                key={listing.listing_id}
                listing={listing}
                conversationId={activeConversationId}
              />
            ))}
          </section>
        )}

        {hasSearched && results.length === 0 && !isSearching && (
          <p className="p-10 text-center text-muted">
            No vehicles match that description. Try broadening your search.
          </p>
        )}
      </div>
    </main>
  );
}
