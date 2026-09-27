import { useAuth } from "../auth/providers/auth-provider";

export type Conversation = {
  conversation_id: string;
  raw_user_prompt: string;
  ai_response_text: string;
  created_at: string;
};

export type ConversationSidebarProps = {
  activeConversationId: string | null;
  refreshKey: number;
  isDrawerOpen: boolean;
  onDrawerOpenChange: (open: boolean) => void;
  onNewSearch: () => void;
  onSelectConversation: (conversation: Conversation) => void;
};

export type SidebarContentProps = {
  activeConversationId: string | null;
  conversations: Conversation[];
  error: string;
  isLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
  onDrawerOpenChange: (open: boolean) => void;
  onNewSearch: () => void;
  onSelectConversation: (conversation: Conversation) => void;
};
