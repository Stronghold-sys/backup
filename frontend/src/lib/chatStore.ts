/**
 * 💬 CHAT STORE - Real-time with Supabase
 * 
 * ✅ Real-time sync with Supabase Database
 * ✅ Realtime updates via Supabase Realtime
 * ✅ BroadcastChannel for multi-tab sync
 */

import { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase'; // ✅ FIXED: Use singleton instance instead of creating new one
import { projectId, publicAnonKey } from '/utils/supabase/info';
import * as chatApi from './chatApi';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'admin';
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: 'active' | 'closed';
  adminId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatState {
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  activeConversationId: string | null;
  isLoading: boolean;
  isInitialized: boolean;
}

// Simple store class
class Store<T> {
  private state: T;
  private listeners: Set<(state: T) => void> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState = () => this.state;

  setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const newState = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = { ...this.state, ...newState };
    this.listeners.forEach((listener) => listener(this.state));
  };

  subscribe = (listener: (state: T) => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

const chatStore = new Store<ChatState>({
  conversations: [],
  messages: {},
  activeConversationId: null,
  isLoading: false,
  isInitialized: false,
});

// BroadcastChannel for multi-tab sync
const chatChannel = typeof window !== 'undefined' ? new BroadcastChannel('chat-sync') : null;

// Export store instance
export const chatStoreInstance = chatStore;

// ==================== REALTIME SUBSCRIPTION ====================

let realtimeSubscription: any = null;

/**
 * Subscribe to Supabase Realtime for kv_store changes
 */
export function subscribeToRealtime() {
  if (realtimeSubscription) {
    console.info('⚠️ [Chat] Already subscribed to realtime');
    return;
  }

  console.info('🔌 [Chat] Subscribing to Supabase Realtime...');

  realtimeSubscription = supabase
    .channel('kv_store_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'kv_store_adb995ba',
        filter: 'key=like.chat:%',
      },
      async (payload) => {
        console.info('🔔 [Chat] Realtime event:', payload.eventType, payload.new?.key);

        const key = payload.new?.key || payload.old?.key;
        
        if (!key) return;

        // Handle conversation changes
        if (key.startsWith('chat:conversation:')) {
          if (payload.eventType === 'DELETE') {
            await chatStoreHelpers.fetchConversations();
          } else {
            await chatStoreHelpers.fetchConversations();
          }
        }
        
        // Handle message changes
        if (key.startsWith('chat:message:')) {
          const conversationId = key.split(':')[2];
          if (conversationId) {
            await chatStoreHelpers.fetchMessages(conversationId);
          }
        }
      }
    )
    .subscribe((status) => {
      console.info('🔌 [Chat] Realtime status:', status);
    });
}

/**
 * Unsubscribe from realtime
 */
export function unsubscribeFromRealtime() {
  if (realtimeSubscription) {
    console.info('🔌 [Chat] Unsubscribing from realtime...');
    supabase.removeChannel(realtimeSubscription);
    realtimeSubscription = null;
  }
}

// ==================== STORE HELPERS ====================

export const chatStoreHelpers = {
  /**
   * Initialize chat store - fetch all data
   */
  initialize: async (userId?: string) => {
    const state = chatStore.getState();
    if (state.isInitialized) {
      console.info('⚠️ [Chat] Already initialized');
      return;
    }

    console.info('🚀 [Chat] Initializing chat store...');
    chatStore.setState({ isLoading: true });

    try {
      // Subscribe to realtime first
      subscribeToRealtime();

      // Fetch conversations
      await chatStoreHelpers.fetchConversations();

      chatStore.setState({ isInitialized: true, isLoading: false });
      console.info('✅ [Chat] Chat store initialized');
    } catch (error) {
      console.error('❌ [Chat] Failed to initialize:', error);
      chatStore.setState({ isLoading: false });
    }
  },

  /**
   * Fetch all conversations
   */
  fetchConversations: async () => {
    try {
      const conversations = await chatApi.getAllConversations();
      chatStore.setState({ conversations });
      chatChannel?.postMessage({ type: 'conversations-updated', conversations });
      console.info(`✅ [Chat] Fetched ${conversations.length} conversations`);
    } catch (error) {
      console.error('❌ [Chat] Failed to fetch conversations:', error);
    }
  },

  /**
   * Fetch messages for a conversation
   */
  fetchMessages: async (conversationId: string) => {
    try {
      const messages = await chatApi.getMessages(conversationId);
      const state = chatStore.getState();
      chatStore.setState({
        messages: {
          ...state.messages,
          [conversationId]: messages,
        },
      });
      chatChannel?.postMessage({ type: 'messages-updated', conversationId, messages });
      console.info(`✅ [Chat] Fetched ${messages.length} messages for ${conversationId}`);
    } catch (error) {
      console.error('❌ [Chat] Failed to fetch messages:', error);
    }
  },

  /**
   * Create or get conversation for user
   */
  getOrCreateConversation: async (userId: string, userName: string, userEmail: string): Promise<Conversation> => {
    try {
      // Try to get existing conversation
      let conversation = await chatApi.getUserConversation(userId);

      if (!conversation) {
        // Create new conversation
        conversation = {
          id: `conv-${userId}-${Date.now()}`,
          userId,
          userName,
          userEmail,
          lastMessage: '',
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        conversation = await chatApi.createConversation(conversation);
        console.info('✅ [Chat] Created new conversation:', conversation.id);
      }

      // Update local state
      const state = chatStore.getState();
      const exists = state.conversations.find((c) => c.id === conversation!.id);
      if (!exists) {
        chatStore.setState({
          conversations: [conversation, ...state.conversations],
        });
      }

      return conversation;
    } catch (error) {
      console.error('❌ [Chat] Failed to get/create conversation:', error);
      throw error;
    }
  },

  /**
   * Send message
   */
  sendMessage: async (message: Message, conversationId: string) => {
    try {
      // Send to API
      await chatApi.sendMessage(message, conversationId);

      // Update local state
      const state = chatStore.getState();
      const conversationMessages = state.messages[conversationId] || [];
      chatStore.setState({
        messages: {
          ...state.messages,
          [conversationId]: [...conversationMessages, message],
        },
      });

      console.info('✅ [Chat] Message sent:', message.id);

      // Realtime will trigger automatic refetch
    } catch (error) {
      console.error('❌ [Chat] Failed to send message:', error);
      throw error;
    }
  },

  /**
   * Mark messages as read
   */
  markAsRead: async (conversationId: string) => {
    try {
      await chatApi.markMessagesAsRead(conversationId);
      console.info('✅ [Chat] Messages marked as read');
      
      // Realtime will trigger automatic refetch
    } catch (error) {
      // ✅ Graceful error handling - don't throw, just log
      console.warn('⚠️ [Chat] Failed to mark as read (non-critical):', error);
      // Don't throw - this is not critical for user experience
    }
  },

  /**
   * Update conversation
   */
  updateConversation: async (conversationId: string, updates: Partial<Conversation>) => {
    try {
      await chatApi.updateConversation(conversationId, updates);
      console.info('✅ [Chat] Conversation updated:', conversationId);
      
      // Realtime will trigger automatic refetch
    } catch (error) {
      console.error('❌ [Chat] Failed to update conversation:', error);
    }
  },

  /**
   * Set active conversation
   */
  setActiveConversation: (conversationId: string | null) => {
    chatStore.setState({ activeConversationId: conversationId });
    
    // Fetch messages if not loaded
    if (conversationId) {
      const state = chatStore.getState();
      if (!state.messages[conversationId]) {
        chatStoreHelpers.fetchMessages(conversationId);
      }
    }
  },

  /**
   * Get unread count for user
   */
  getUnreadCount: (userId: string) => {
    const state = chatStore.getState();
    return state.conversations
      .filter((conv) => conv.userId === userId)
      .reduce((total, conv) => total + conv.unreadCount, 0);
  },

  /**
   * Cleanup
   */
  cleanup: () => {
    unsubscribeFromRealtime();
    chatStore.setState({
      conversations: [],
      messages: {},
      activeConversationId: null,
      isInitialized: false,
    });
  },
};

// Listen for messages from other tabs
if (chatChannel) {
  chatChannel.onmessage = (event) => {
    const { type, conversations, conversationId, messages } = event.data;
    const state = chatStore.getState();

    switch (type) {
      case 'conversations-updated':
        if (JSON.stringify(state.conversations) !== JSON.stringify(conversations)) {
          chatStore.setState({ conversations });
        }
        break;
      case 'messages-updated':
        if (JSON.stringify(state.messages[conversationId]) !== JSON.stringify(messages)) {
          chatStore.setState({
            messages: {
              ...state.messages,
              [conversationId]: messages,
            },
          });
        }
        break;
    }
  };
}

// React hook
export function useChatStore() {
  const [state, setState] = useState(chatStore.getState());

  useEffect(() => {
    return chatStore.subscribe(setState);
  }, []);

  const stableHelpers = useMemo(() => chatStoreHelpers, []);

  return {
    ...state,
    ...stableHelpers,
  };
}