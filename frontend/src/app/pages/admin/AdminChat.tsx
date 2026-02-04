import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Search, HelpCircle, RefreshCw } from 'lucide-react';
import AdminLayout from '@/app/components/Layout/AdminLayout';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Badge } from '@/app/components/ui/badge';
import { useChatStore, Message } from '@/lib/chatStore';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

export default function AdminChat() {
  const { user } = useAuthStore();
  const {
    conversations,
    messages,
    activeConversationId,
    isLoading,
    initialize,
    sendMessage,
    markAsRead,
    setActiveConversation,
    fetchConversations,
    fetchMessages,
  } = useChatStore();

  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat store
  useEffect(() => {
    console.info('🚀 [AdminChat] Initializing...');
    initialize();
    fetchConversations();
  }, []);

  // Auto-refresh conversations every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.info('🔄 [AdminChat] Auto-refreshing conversations...');
      fetchConversations();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Auto-refresh active conversation messages every 3 seconds
  useEffect(() => {
    if (!activeConversationId) return;

    const interval = setInterval(() => {
      console.info('🔄 [AdminChat] Auto-refreshing messages...');
      fetchMessages(activeConversationId);
    }, 3000);

    return () => clearInterval(interval);
  }, [activeConversationId]);

  // Filter conversations
  const filteredConversations = conversations.filter(
    (conv) =>
      conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by last message time
  const sortedConversations = [...filteredConversations].sort(
    (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
  );

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const conversationMessages = activeConversationId ? messages[activeConversationId] || [] : [];

  // Total unread count
  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0);

  useEffect(() => {
    // Auto scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleSelectConversation = async (conversationId: string) => {
    console.info('📍 [AdminChat] Selecting conversation:', conversationId);
    setActiveConversation(conversationId);
    
    // Fetch messages
    await fetchMessages(conversationId);
    
    // ✅ Mark as read with delay to ensure data is loaded
    setTimeout(() => {
      markAsRead(conversationId);
    }, 1000);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversationId || !user || isSending) return;

    setIsSending(true);

    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      conversationId: activeConversationId,
      senderId: user.id,
      senderName: user.name || 'Admin',
      senderRole: 'admin',
      content: messageInput.trim(),
      timestamp: new Date().toISOString(),
      read: false,
    };

    console.info('💬 [AdminChat] Sending reply:', {
      conversationId: activeConversationId,
      message: newMessage.content,
    });

    try {
      await sendMessage(newMessage, activeConversationId);
      setMessageInput('');
      console.info('✅ [AdminChat] Reply sent successfully');
      toast.success('Balasan terkirim');
    } catch (error) {
      console.error('❌ [AdminChat] Failed to send reply:', error);
      toast.error('Gagal mengirim balasan');
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

  const handleRefresh = async () => {
    console.info('🔄 [AdminChat] Manual refresh...');
    toast.info('Memuat ulang percakapan...');
    await fetchConversations();
    if (activeConversationId) {
      await fetchMessages(activeConversationId);
    }
    toast.success('Percakapan dimuat ulang');
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

  const getAvatarColor = (id: string) => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-indigo-500',
      'bg-pink-500',
    ];
    const index = id.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Chat Support
              {totalUnreadCount > 0 && (
                <Badge className="bg-red-500 text-white ml-2">
                  {totalUnreadCount} Pesan Baru
                </Badge>
              )}
            </h1>
            <p className="text-gray-600 mt-1">Layanan chat real-time dengan pelanggan</p>
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Muat Ulang
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Chat List */}
          <div className="col-span-12 lg:col-span-4">
            <Card className="p-4 h-[700px] flex flex-col">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari chat..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Chat List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {isLoading && sortedConversations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-gray-400">Memuat percakapan...</p>
                  </div>
                ) : sortedConversations.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Belum ada percakapan</p>
                  </div>
                ) : (
                  sortedConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        activeConversationId === conv.id
                          ? 'bg-gradient-to-r from-orange-50 to-pink-50 border-2 border-orange-300'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <div
                            className={`w-10 h-10 rounded-full ${getAvatarColor(
                              conv.userId
                            )} flex items-center justify-center text-white font-bold`}
                          >
                            {getInitial(conv.userName)}
                          </div>
                          {conv.unreadCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                              {conv.unreadCount}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-semibold text-sm truncate">{conv.userName}</h3>
                            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                              {formatTime(conv.lastMessageTime)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate mb-1">
                            {conv.userEmail}
                          </p>
                          <p
                            className={`text-sm truncate ${
                              conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'
                            }`}
                          >
                            {conv.lastMessage || 'Belum ada pesan'}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Main Chat Area */}
          <div className="col-span-12 lg:col-span-8">
            <Card className="overflow-hidden h-[700px]">
              {activeConversation ? (
                <div className="flex flex-col h-full">
                  {/* Chat Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 text-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-full ${getAvatarColor(
                          activeConversation.userId
                        )} bg-opacity-30 flex items-center justify-center font-bold text-lg`}
                      >
                        {getInitial(activeConversation.userName)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{activeConversation.userName}</h3>
                        <p className="text-sm text-white/80">{activeConversation.userEmail}</p>
                      </div>
                      <Badge
                        className={
                          activeConversation.status === 'active'
                            ? 'bg-green-500'
                            : 'bg-gray-500'
                        }
                      >
                        {activeConversation.status === 'active' ? 'Aktif' : 'Ditutup'}
                      </Badge>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {conversationMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <HelpCircle className="w-16 h-16 mb-4" />
                        <p className="text-lg font-medium">Belum ada pesan</p>
                        <p className="text-sm">Menunggu pesan dari pelanggan</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {conversationMessages.map((message, index) => {
                          const showDate =
                            index === 0 ||
                            formatDate(conversationMessages[index - 1].timestamp) !==
                              formatDate(message.timestamp);

                          return (
                            <div key={message.id}>
                              {showDate && (
                                <div className="flex justify-center my-4">
                                  <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                                    {formatDate(message.timestamp)}
                                  </span>
                                </div>
                              )}

                              <div
                                className={`flex ${
                                  message.senderRole === 'admin' ? 'justify-end' : 'justify-start'
                                }`}
                              >
                                {message.senderRole === 'user' && (
                                  <div
                                    className={`w-8 h-8 rounded-full ${getAvatarColor(
                                      message.senderId
                                    )} flex items-center justify-center text-white text-sm font-bold mr-2 flex-shrink-0`}
                                  >
                                    {getInitial(message.senderName)}
                                  </div>
                                )}

                                <div
                                  className={`max-w-[70%] ${
                                    message.senderRole === 'admin'
                                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                                      : 'bg-white text-gray-800'
                                  } rounded-lg px-4 py-2.5 shadow-sm`}
                                >
                                  {message.senderRole === 'user' && (
                                    <p className="text-xs font-semibold mb-1 text-gray-600">
                                      {message.senderName}
                                    </p>
                                  )}
                                  <p className="text-sm leading-relaxed break-words">
                                    {message.content}
                                  </p>
                                  <p
                                    className={`text-xs mt-1.5 ${
                                      message.senderRole === 'admin'
                                        ? 'text-white/70'
                                        : 'text-gray-400'
                                    }`}
                                  >
                                    {formatTime(message.timestamp)}
                                  </p>
                                </div>

                                {message.senderRole === 'admin' && (
                                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold ml-2 flex-shrink-0">
                                    A
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Input Area */}
                  <div className="border-t bg-white p-4 flex-shrink-0">
                    <div className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ketik balasan..."
                        className="flex-1"
                        disabled={isSending}
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isSending}
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
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare className="w-20 h-20 mb-4 opacity-50" />
                  <p className="text-lg font-medium">Pilih percakapan</p>
                  <p className="text-sm">Pilih pelanggan dari daftar untuk mulai chat</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}