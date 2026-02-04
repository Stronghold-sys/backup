/**
 * 💬 CHAT API SERVICE
 * 
 * ✅ Real-time chat with Supabase backend
 * ✅ Conversations and messages management
 */

import { projectId, publicAnonKey } from '/utils/supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-adb995ba/chat`;

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

// Helper function for fetch with better error handling
async function fetchWithErrorHandling(url: string, options: RequestInit) {
  console.info('🌐 [Chat API] Request:', {
    url,
    method: options.method,
    headers: options.headers,
  });

  try {
    const response = await fetch(url, options);
    
    console.info('📥 [Chat API] Response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
    });

    // Try to parse JSON
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error('❌ [Chat API] Failed to parse JSON response');
      throw new Error(`Invalid JSON response: ${response.statusText}`);
    }

    if (!response.ok) {
      throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error: any) {
    // Enhanced error logging
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('❌ [Chat API] Network error - possible causes:', {
        url,
        possibleCauses: [
          'CORS issue',
          'Server not running',
          'Invalid URL',
          'Network connectivity issue',
        ],
      });
    }
    throw error;
  }
}

// ==================== CONVERSATIONS ====================

/**
 * Get all conversations (admin only)
 */
export async function getAllConversations(): Promise<Conversation[]> {
  try {
    console.info('📡 [Chat API] Fetching all conversations...');
    
    const result = await fetchWithErrorHandling(`${API_URL}/conversations`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.info(`✅ [Chat API] Fetched ${result.data.length} conversations`);
    return result.data;
  } catch (error: any) {
    console.error('❌ [Chat API] Error fetching conversations:', error);
    throw error;
  }
}

/**
 * Get conversation for specific user
 */
export async function getUserConversation(userId: string): Promise<Conversation | null> {
  try {
    console.info(`📡 [Chat API] Fetching conversation for user ${userId}...`);
    
    const result = await fetchWithErrorHandling(`${API_URL}/conversations/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (result.data) {
      console.info(`✅ [Chat API] Found conversation: ${result.data.id}`);
    } else {
      console.info(`ℹ️ [Chat API] No conversation found for user ${userId}`);
    }

    return result.data;
  } catch (error: any) {
    console.error('❌ [Chat API] Error fetching conversation:', error);
    throw error;
  }
}

/**
 * Create new conversation
 */
export async function createConversation(conversation: Conversation): Promise<Conversation> {
  try {
    console.info('📡 [Chat API] Creating conversation:', conversation.id);
    
    const result = await fetchWithErrorHandling(`${API_URL}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ conversation }),
    });

    console.info('✅ [Chat API] Conversation created:', result.data.id);
    return result.data;
  } catch (error: any) {
    console.error('❌ [Chat API] Error creating conversation:', error);
    throw error;
  }
}

/**
 * Update conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: Partial<Conversation>
): Promise<Conversation> {
  try {
    console.info('📡 [Chat API] Updating conversation:', conversationId);
    
    const result = await fetchWithErrorHandling(`${API_URL}/conversations/${conversationId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates }),
    });

    console.info('✅ [Chat API] Conversation updated');
    return result.data;
  } catch (error: any) {
    console.error('❌ [Chat API] Error updating conversation:', error);
    throw error;
  }
}

// ==================== MESSAGES ====================

/**
 * Get all messages for conversation
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  try {
    console.info(`📡 [Chat API] Fetching messages for conversation ${conversationId}...`);
    
    const result = await fetchWithErrorHandling(`${API_URL}/messages/${conversationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.info(`✅ [Chat API] Fetched ${result.data.length} messages`);
    return result.data;
  } catch (error: any) {
    console.error('❌ [Chat API] Error fetching messages:', error);
    throw error;
  }
}

/**
 * Send new message
 */
export async function sendMessage(message: Message, conversationId: string): Promise<Message> {
  try {
    console.info('📡 [Chat API] Sending message:', message.id);
    
    const result = await fetchWithErrorHandling(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationId }),
    });

    console.info('✅ [Chat API] Message sent:', result.data.id);
    return result.data;
  } catch (error: any) {
    console.error('❌ [Chat API] Error sending message:', error);
    throw error;
  }
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(conversationId: string): Promise<void> {
  try {
    console.info('📡 [Chat API] Marking messages as read:', conversationId);
    console.info('🌐 [Chat API] Request URL:', `${API_URL}/messages/${conversationId}/mark-read`);
    
    const result = await fetchWithErrorHandling(`${API_URL}/messages/${conversationId}/mark-read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.info('✅ [Chat API] Messages marked as read');
  } catch (error: any) {
    console.error('❌ [Chat API] Error marking messages as read:', error);
    console.error('   Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
}
