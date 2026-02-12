'use client';

import { useState, useEffect, useRef } from 'react';
import { collaborationService } from '@/services/collaboration.service';
import { Send, Paperclip, Smile, Search, MoreVertical } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender?: { name: string; avatar_url?: string };
  reactions?: { emoji: string; user_ids: string[] }[];
}

interface ChatInterfaceProps {
  channelId: string;
  currentUserId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ channelId, currentUserId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [channelId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const data = await collaborationService.getChannelMessages(channelId, 50, 0);
      setMessages(data || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await collaborationService.sendMessage(channelId, newMessage, 'text');
      setNewMessage('');
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setSearching(true);
      const results = await collaborationService.searchMessages(channelId, searchQuery);
      setMessages(results || []);
    } catch (error) {
      console.error('Failed to search messages:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      await collaborationService.addReaction(messageId, emoji);
      await loadMessages();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Delete this message?')) return;

    try {
      await collaborationService.deleteMessage(messageId);
      await loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && messages.length === 0) {
    return (
      <div className="animate-pulse space-y-4 h-96">
        <div className="h-16 bg-gray-200 rounded-lg" />
        <div className="h-32 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Channel Messages</h2>
        <div className="flex items-center gap-2">
          <div className="relative hidden md:flex">
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search size={16} className="absolute right-3 top-2 text-gray-400" />
          </div>
          <button className="p-1 hover:bg-gray-100 rounded-lg">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 group ${message.sender_id === currentUserId ? 'justify-end' : ''}`}
            >
              {message.sender_id !== currentUserId && (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {message.sender?.name?.[0] || 'U'}
                </div>
              )}

              <div
                className={`flex flex-col gap-1 max-w-md ${
                  message.sender_id === currentUserId ? 'items-end' : 'items-start'
                }`}
              >
                {message.sender_id !== currentUserId && (
                  <p className="text-xs font-medium text-gray-700">{message.sender?.name || 'Unknown'}</p>
                )}

                <div
                  className={`px-3 py-2 rounded-lg ${
                    message.sender_id === currentUserId
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm break-words">{message.content}</p>
                </div>

                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-500">{formatTime(message.created_at)}</p>

                  {message.sender_id === currentUserId && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-xs text-red-600 opacity-0 group-hover:opacity-100 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {message.reactions.map((reaction) => (
                      <button
                        key={reaction.emoji}
                        onClick={() => handleAddReaction(message.id, reaction.emoji)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded flex items-center gap-1"
                      >
                        {reaction.emoji}
                        <span className="text-gray-600">{reaction.user_ids.length}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
        <div className="flex items-end gap-2">
          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Paperclip size={20} />
          </button>

          <div className="flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          <button
            type="button"
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Smile size={20} />
          </button>

          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 rounded-lg transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};
