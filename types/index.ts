export type SenderType = "user" | "agent" | "bot";
export type MessageType = "text" | "image" | "emoji";

export interface LoginResponse {
  access_token: string;
  expires_in: number;
  user: AgentProfile;
}

export interface AgentProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  source: string;
  external_user_id?: string;
  avatar_url?: string;
  profile_json?: string;
  tags: string[];
  last_seen_at?: string;
  recent_behavior?: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  assigned_agent_id?: string;
  last_message: string;
  unread_count: number;
  updated_at: string;
  customer: Customer;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id?: string;
  sender_name?: string;
  sender_type: SenderType;
  message_type?: MessageType;
  content: string;
  media_url?: string;
  media_key?: string;
  created_at: string;
}

export interface VisitorSessionResponse {
  access_token: string;
  expires_in: number;
  conversation: Conversation;
  initial_message?: Message | null;
  welcome_message?: Message | null;
}

export interface WidgetSettings {
  enabled: boolean;
  brand_name: string;
  avatar_url: string;
  welcome_message: string;
}



export interface UploadImageResponse {
  key: string;
  url: string;
}

export interface ImageUploadPrepareResponse {
  driver: "local" | "qiniu";
  upload_url?: string;
  upload_token?: string;
  key?: string;
  url?: string;
  expires_in?: number;
}

export interface MessagePage {
  items: Message[];
  next_cursor?: string;
}

export interface ConversationPage {
  items: Conversation[];
  next_cursor?: string;
}

export interface CustomerPage {
  items: Customer[];
  total: number;
}

export interface DashboardStats {
  conversations_today: number;
  avg_response_seconds: number;
  online_agents: number;
  sources: Array<{
    source: string;
    count: number;
  }>;
}

export interface PhraseItem {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  content: string;
}
