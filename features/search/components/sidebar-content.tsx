import { useAuth } from "@/features/auth/providers/auth-provider";
import { Conversation, SidebarContentProps } from "../types";
import { Button } from "@/components/ui/button";
import { Clock3, Loader2, MessageSquare, Plus, X } from "lucide-react";

export function SidebarContent({
  activeConversationId,
  conversations,
  error,
  isLoading,
  user,
  onDrawerOpenChange,
  onNewSearch,
  onSelectConversation,
}: SidebarContentProps) {
  const handleSelect = (conversation: Conversation) => {
    onSelectConversation(conversation);
    onDrawerOpenChange(false);
  };

  const formatConversationDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-3 px-3 pb-3">
        <div>
          <p className="font-display text-lg font-bold tracking-[-0.04em] text-ink">
            beepbeep<span className="text-[#66891a]">.ai</span>
          </p>
          <p className="text-xs text-muted">Saved searches</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Close conversation menu"
          onClick={() => onDrawerOpenChange(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Button
        variant="outline"
        className="mb-4 w-full justify-start gap-2"
        onClick={() => {
          onNewSearch();
          onDrawerOpenChange(false);
        }}
      >
        <Plus className="h-4 w-4" />
        New search
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {!user ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
            <MessageSquare className="mb-3 h-4 w-4 text-[#66891a]" />
            <p>Sign in to save and revisit your vehicle searches.</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading searches...
          </div>
        ) : error ? (
          <p className="px-2 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : conversations.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted">
            <Clock3 className="mb-3 h-4 w-4" />
            Your saved searches will appear here.
          </div>
        ) : (
          <div className="grid gap-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.conversation_id}
                type="button"
                aria-current={
                  activeConversationId === conversation.conversation_id
                    ? "page"
                    : undefined
                }
                className={`group rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeConversationId === conversation.conversation_id
                    ? "bg-accent-soft text-ink"
                    : "text-foreground"
                }`}
                onClick={() => handleSelect(conversation)}
              >
                <span className="block truncate text-sm font-medium">
                  {conversation.raw_user_prompt}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {formatConversationDate(conversation.created_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
