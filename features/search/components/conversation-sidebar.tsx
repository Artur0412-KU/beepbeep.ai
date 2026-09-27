"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { SidebarContent } from "./sidebar-content";
import { Conversation, ConversationSidebarProps } from "../types";

export function ConversationSidebar({
  activeConversationId,
  refreshKey,
  isDrawerOpen,
  onDrawerOpenChange,
  onNewSearch,
  onSelectConversation,
}: ConversationSidebarProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadConversations = async () => {
      if (!user) {
        setConversations([]);
        setError("");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("conversations")
        .select(
          "conversation_id, raw_user_prompt, ai_response_text, created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!isMounted) return;

      if (queryError) {
        setError("We couldn't load your saved searches.");
        setConversations([]);
      } else {
        setConversations((data ?? []) as Conversation[]);
      }
      setIsLoading(false);
    };

    void loadConversations();
    return () => {
      isMounted = false;
    };
  }, [refreshKey, user]);

  return (
    <>
      <aside className="hidden h-[calc(100vh-2rem)] w-[250px] shrink-0 flex-col rounded-2xl border border-border bg-card p-3 md:flex">
        <SidebarContent
          activeConversationId={activeConversationId}
          conversations={conversations}
          error={error}
          isLoading={isLoading}
          user={user}
          onDrawerOpenChange={onDrawerOpenChange}
          onNewSearch={onNewSearch}
          onSelectConversation={onSelectConversation}
        />
      </aside>

      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close conversation menu"
            className="absolute inset-0 bg-ink/25"
            onClick={() => onDrawerOpenChange(false)}
          />
          <aside className="relative h-full w-[min(86vw,320px)] bg-card p-3 shadow-xl">
            <SidebarContent
              activeConversationId={activeConversationId}
              conversations={conversations}
              error={error}
              isLoading={isLoading}
              user={user}
              onDrawerOpenChange={onDrawerOpenChange}
              onNewSearch={onNewSearch}
              onSelectConversation={onSelectConversation}
            />
          </aside>
        </div>
      )}
    </>
  );
}
