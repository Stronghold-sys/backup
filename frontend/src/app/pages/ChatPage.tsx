import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Card } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import Layout from '@/app/components/Layout/Layout';
import { useAuthStore } from '@/lib/store';
import { useChatStore, Message } from '@/lib/chatStore';
import { toast } from 'sonner';

export default function ChatPage() {
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    activeConversationId,
    isLoading,
    initialize,
    getOrCreateConversation,
    sendMessage,
    markAsRead,
    setActiveConversation,
    getUnreadCount,
    fetchMessages,
  } = useChatStore();

  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Initialize chat store
  useEffect(() => {
    initialize();
  }, []);

  // Get or create user's conversation
  useEffect(() => {
    if (user && !currentConversationId) {
      console.info('🔍 [ChatPage] Getting/creating conversation for user:', user.id);
      getOrCreateConversation(user.id, user.name || user.username, user.email)
        .then((conv) => {
          console.info('✅ [ChatPage] Got conversation:', conv.id);
          setCurrentConversationId(conv.id);
          setActiveConversation(conv.id);
          // Fetch messages for this conversation
          fetchMessages(conv.id);
        })
        .catch((error) => {
          console.error('❌ [ChatPage] Failed to get conversation:', error);
          toast.error('Gagal memuat percakapan');
        });
    }
  }, [user, currentConversationId]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  // Mark messages as read when viewing (with delay to ensure data is loaded)
  useEffect(() => {
    if (activeConversationId && user) {
      // ✅ Add small delay to ensure conversation is loaded
      const timer = setTimeout(() => {
        markAsRead(activeConversationId);
      }, 1000); // 1 second delay
      
      return () => clearTimeout(timer);
    }
  }, [activeConversationId, user]);

  // Refresh messages every 5 seconds
  useEffect(() => {
    if (!activeConversationId) return;

    const interval = setInterval(() => {
      console.info('🔄 [ChatPage] Refreshing messages...');
      fetchMessages(activeConversationId);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeConversationId]);

  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];
  const unreadCount = user ? getUnreadCount(user.id) : 0;

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversationId || !user || isSending) return;

    setIsSending(true);

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      conversationId: activeConversationId,
      senderId: user.id,
      senderName: user.name || user.username,
      senderRole: 'user',
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    console.info('💬 [ChatPage] Sending message:', {
      conversationId: activeConversationId,
      message: newMessage.content,
    });

    try {
      await sendMessage(newMessage, activeConversationId);
      setMessageText('');
      console.info('✅ [ChatPage] Message sent successfully');
      toast.success('Pesan terkirim');
    } catch (error) {
      console.error('❌ [ChatPage] Failed to send message:', error);
      toast.error('Gagal mengirim pesan');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hari ini';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    } else {
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  if (isLoading && !currentConversationId) {
    return (
      <Layout>
        <div className="h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat percakapan...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 flex flex-col">
          {/* Header */}
          <div className="mb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <MessageCircle className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                Chat Support
              </h1>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} Pesan Baru</Badge>
              )}
            </div>
            <p className="text-gray-600">Hubungi admin untuk bantuan</p>
          </div>

          {/* Chat Container - Full height */}
          <Card className="overflow-hidden shadow-lg flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  A
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Admin Support</h3>
                  <p className="text-sm text-white/80 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    Online
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {conversationMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <HelpCircle className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Belum ada pesan</p>
                  <p className="text-sm">Mulai percakapan dengan admin support</p>
                </div>
              ) : (
                <>
                  {conversationMessages.map((message, index) => {
                    const showDate =
                      index === 0 ||
                      formatDate(conversationMessages[index - 1].timestamp) !==
                        formatDate(message.timestamp);

                    return (
                      <div key={message.id}>
                        {showDate && (
                          <div className="flex justify-center mb-4">
                            <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                        )}

                        <div
                          className={`flex ${
                            message.senderRole === 'user' ? 'justify-end' : 'justify-start'
                          } mb-3`}
                        >
                          {message.senderRole === 'admin' && (
                            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0">
                              {getInitial(message.senderName)}
                            </div>
                          )}

                          <div
                            className={`max-w-[70%] ${
                              message.senderRole === 'user'
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                : 'bg-white text-gray-800'
                            } rounded-lg px-4 py-2 shadow-sm`}
                          >
                            {message.senderRole === 'admin' && (
                              <p className="text-xs font-semibold mb-1 text-gray-500">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {message.content}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                message.senderRole === 'user'
                                  ? 'text-white/70'
                                  : 'text-gray-400'
                              }`}
                            >
                              {formatTime(message.timestamp)}
                            </p>
                          </div>

                          {message.senderRole === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold ml-2 flex-shrink-0">
                              {getInitial(message.senderName)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="border-t bg-white p-4 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ketik pesan..."
                  className="flex-1"
                  disabled={isSending || isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() || isSending || isLoading}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tekan Enter untuk mengirim, Shift + Enter untuk baris baru
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}