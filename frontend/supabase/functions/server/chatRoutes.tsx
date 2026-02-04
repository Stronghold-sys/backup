import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const chatRoutes = new Hono();

// ✅ Enable CORS for all chat routes
chatRoutes.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Session-Token'],
  maxAge: 86400,
}));

// ✅ Test endpoint to verify chat routes are working
chatRoutes.get('/test', async (c) => {
  return c.json({
    success: true,
    message: 'Chat routes are working!',
    timestamp: new Date().toISOString(),
  });
});

// Initialize Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// ==================== CONVERSATIONS ====================

/**
 * GET /conversations
 * Get all conversations (for admin)
 */
chatRoutes.get('/conversations', async (c) => {
  try {
    const supabase = getSupabaseClient();

    const { data: conversations, error } = await supabase
      .from('kv_store_adb995ba')
      .select('value')
      .like('key', 'chat:conversation:%')
      .order('key', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return c.json({ error: 'Failed to fetch conversations' }, 500);
    }

    const parsedConversations = conversations.map((item: any) => item.value);

    return c.json({
      success: true,
      data: parsedConversations,
    });
  } catch (error: any) {
    console.error('Error in GET /conversations:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /conversations/:userId
 * Get conversation for specific user
 */
chatRoutes.get('/conversations/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('kv_store_adb995ba')
      .select('value')
      .like('key', `chat:conversation:%:${userId}`)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching conversation:', error);
      return c.json({ error: 'Failed to fetch conversation' }, 500);
    }

    return c.json({
      success: true,
      data: data?.value || null,
    });
  } catch (error: any) {
    console.error('Error in GET /conversations/:userId:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /conversations
 * Create new conversation
 */
chatRoutes.post('/conversations', async (c) => {
  try {
    const body = await c.req.json();
    const { conversation } = body;

    if (!conversation || !conversation.id || !conversation.userId) {
      return c.json({ error: 'Invalid conversation data' }, 400);
    }

    const supabase = getSupabaseClient();
    const key = `chat:conversation:${conversation.id}:${conversation.userId}`;

    const { error } = await supabase
      .from('kv_store_adb995ba')
      .upsert({
        key,
        value: conversation,
      });

    if (error) {
      console.error('Error creating conversation:', error);
      return c.json({ error: 'Failed to create conversation' }, 500);
    }

    console.log('✅ Conversation created:', conversation.id);

    return c.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('Error in POST /conversations:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PATCH /conversations/:conversationId
 * Update conversation (e.g., mark as read, update last message)
 */
chatRoutes.patch('/conversations/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const body = await c.req.json();
    const { updates } = body;

    const supabase = getSupabaseClient();

    // Find conversation by ID
    const { data: existingData, error: fetchError } = await supabase
      .from('kv_store_adb995ba')
      .select('key, value')
      .like('key', `chat:conversation:${conversationId}:%`)
      .single();

    if (fetchError || !existingData) {
      return c.json({ error: 'Conversation not found' }, 404);
    }

    const updatedConversation = {
      ...existingData.value,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('kv_store_adb995ba')
      .update({ value: updatedConversation })
      .eq('key', existingData.key);

    if (error) {
      console.error('Error updating conversation:', error);
      return c.json({ error: 'Failed to update conversation' }, 500);
    }

    console.log('✅ Conversation updated:', conversationId);

    return c.json({
      success: true,
      data: updatedConversation,
    });
  } catch (error: any) {
    console.error('Error in PATCH /conversations/:conversationId:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ==================== MESSAGES ====================

/**
 * GET /messages/:conversationId
 * Get all messages for a conversation
 */
chatRoutes.get('/messages/:conversationId', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    const supabase = getSupabaseClient();

    const { data: messages, error } = await supabase
      .from('kv_store_adb995ba')
      .select('value')
      .like('key', `chat:message:${conversationId}:%`)
      .order('key', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return c.json({ error: 'Failed to fetch messages' }, 500);
    }

    const parsedMessages = messages.map((item: any) => item.value);

    return c.json({
      success: true,
      data: parsedMessages,
    });
  } catch (error: any) {
    console.error('Error in GET /messages/:conversationId:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /messages
 * Send new message
 */
chatRoutes.post('/messages', async (c) => {
  try {
    const body = await c.req.json();
    const { message, conversationId } = body;

    if (!message || !conversationId) {
      return c.json({ error: 'Invalid message data' }, 400);
    }

    const supabase = getSupabaseClient();
    const timestamp = new Date().getTime();
    const key = `chat:message:${conversationId}:${timestamp}:${message.id}`;

    // Save message
    const { error: messageError } = await supabase
      .from('kv_store_adb995ba')
      .insert({
        key,
        value: message,
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
      return c.json({ error: 'Failed to save message' }, 500);
    }

    // Update conversation's last message
    const { data: convData, error: convFetchError } = await supabase
      .from('kv_store_adb995ba')
      .select('key, value')
      .like('key', `chat:conversation:${conversationId}:%`)
      .single();

    if (!convFetchError && convData) {
      const updatedConv = {
        ...convData.value,
        lastMessage: message.content,
        lastMessageTime: message.timestamp,
        unreadCount: (convData.value.unreadCount || 0) + 1,
        updatedAt: message.timestamp,
      };

      await supabase
        .from('kv_store_adb995ba')
        .update({ value: updatedConv })
        .eq('key', convData.key);
    }

    console.log('✅ Message sent:', message.id);

    return c.json({
      success: true,
      data: message,
    });
  } catch (error: any) {
    console.error('Error in POST /messages:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * OPTIONS /messages/:conversationId/mark-read
 * Handle CORS preflight for mark-read endpoint
 */
chatRoutes.options('/messages/:conversationId/mark-read', async (c) => {
  return c.text('', 204);
});

/**
 * PATCH /messages/:conversationId/mark-read
 * Mark all messages in conversation as read
 */
chatRoutes.patch('/messages/:conversationId/mark-read', async (c) => {
  try {
    const conversationId = c.req.param('conversationId');
    console.log('📍 [Chat Backend] Mark as read request for:', conversationId);

    const supabase = getSupabaseClient();

    // Get all messages for this conversation
    const { data: messages, error: fetchError } = await supabase
      .from('kv_store_adb995ba')
      .select('key, value')
      .like('key', `chat:message:${conversationId}:%`);

    if (fetchError) {
      console.error('❌ [Chat Backend] Error fetching messages:', fetchError);
      return c.json({ error: 'Failed to fetch messages' }, 500);
    }

    console.log(`📝 [Chat Backend] Found ${messages?.length || 0} messages to mark as read`);

    // If no messages, just return success (nothing to update)
    if (!messages || messages.length === 0) {
      console.log('ℹ️ [Chat Backend] No messages to mark as read');
      return c.json({
        success: true,
        message: 'No messages to mark as read',
      });
    }

    // Update all messages to read: true
    let updateCount = 0;
    for (const item of messages) {
      const { error: updateError } = await supabase
        .from('kv_store_adb995ba')
        .update({
          value: {
            ...item.value,
            read: true,
          }
        })
        .eq('key', item.key);

      if (updateError) {
        console.error('❌ [Chat Backend] Error updating message:', item.key, updateError);
      } else {
        updateCount++;
      }
    }

    console.log(`✅ [Chat Backend] Updated ${updateCount} messages as read`);

    // Reset unread count in conversation
    const { data: convData, error: convError } = await supabase
      .from('kv_store_adb995ba')
      .select('key, value')
      .like('key', `chat:conversation:${conversationId}:%`)
      .single();

    if (!convError && convData) {
      const updatedConv = {
        ...convData.value,
        unreadCount: 0,
        updatedAt: new Date().toISOString(),
      };

      const { error: convUpdateError } = await supabase
        .from('kv_store_adb995ba')
        .update({ value: updatedConv })
        .eq('key', convData.key);

      if (convUpdateError) {
        console.error('❌ [Chat Backend] Error updating conversation:', convUpdateError);
      } else {
        console.log('✅ [Chat Backend] Conversation unread count reset');
      }
    }

    return c.json({
      success: true,
      message: 'Messages marked as read',
      updated: updateCount,
    });
  } catch (error: any) {
    console.error('❌ [Chat Backend] Error in PATCH /messages/:conversationId/mark-read:', error);
    return c.json({
      error: error.message || 'Internal server error',
      details: error.toString(),
    }, 500);
  }
});

export default chatRoutes;