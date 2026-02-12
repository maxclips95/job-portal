'use client';

import React, { useState, useEffect } from 'react';
import { mentorshipService } from '@/services/mentorship.service';
import {
  MentorshipRelationship,
  MentorshipMessage,
} from '@/types/career-mentorship.types';

const MentorshipDashboard: React.FC<{ userId: string }> = ({ userId }) => {
  const [activeTab, setActiveTab] = useState<'relationships' | 'messages' | 'goals'>('relationships');
  const [relationships, setRelationships] = useState<MentorshipRelationship[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<MentorshipRelationship | null>(null);
  const [messages, setMessages] = useState<MentorshipMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadRelationships();
  }, [userId]);

  useEffect(() => {
    if (selectedRelationship) {
      loadMessages(selectedRelationship.id);
    }
  }, [selectedRelationship]);

  const loadRelationships = async () => {
    try {
      setLoading(true);
      const data = await mentorshipService.getUserRelationships('both');
      setRelationships(data);
      if (data.length > 0) {
        setSelectedRelationship(data[0]);
      }
    } catch (err) {
      console.error('Failed to load relationships:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (relationshipId: string) => {
    try {
      const data = await mentorshipService.getMessages(relationshipId);
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRelationship) return;

    try {
      await mentorshipService.sendMessage(selectedRelationship.id, newMessage);
      setNewMessage('');
      loadMessages(selectedRelationship.id);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading mentorship dashboard...</div>;
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Relationships List */}
      <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold text-lg mb-4">My Mentorships</h3>
        <div className="space-y-3">
          {relationships.map(rel => (
            <div
              key={rel.id}
              onClick={() => setSelectedRelationship(rel)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedRelationship?.id === rel.id
                  ? 'bg-blue-50 border-2 border-blue-500'
                  : 'bg-gray-50 border border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-gray-900">
                  {rel.status === 'active' ? '👥' : '⏸️'} Mentorship
                </p>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  rel.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : rel.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  {rel.status}
                </span>
              </div>
              <p className="text-xs text-gray-600">Match Score: {rel.matchScore}%</p>
              <p className="text-xs text-gray-500 mt-2">
                Started: {new Date(rel.startDate).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {selectedRelationship ? (
        <div className="col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-200">
            {(['relationships', 'messages', 'goals'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'relationships' && '👥 Relationship'}
                {tab === 'messages' && '💬 Messages'}
                {tab === 'goals' && '🎯 Goals'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'relationships' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Relationship Details</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Match Score</p>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-3xl font-bold text-blue-600">{selectedRelationship.matchScore}%</div>
                    <div className="flex-1 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${selectedRelationship.matchScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <p className="text-2xl font-bold mt-2 capitalize">{selectedRelationship.status}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Started</p>
                  <p className="text-lg font-semibold mt-2">
                    {new Date(selectedRelationship.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="text-lg font-semibold mt-2">
                    {Math.floor(
                      (new Date().getTime() - new Date(selectedRelationship.startDate).getTime()) /
                        (1000 * 60 * 60 * 24),
                    )}{' '}
                    days
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Messages</h3>
              
              {/* Messages List */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet. Start a conversation!</p>
                ) : (
                  messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg ${
                        msg.senderId === userId
                          ? 'bg-blue-50 border border-blue-200 ml-8'
                          : 'bg-gray-50 border border-gray-200 mr-8'
                      }`}
                    >
                      <p className="text-sm text-gray-600 mb-2">
                        {msg.senderId === userId ? 'You' : 'Mentor'}
                      </p>
                      <p className="text-gray-900">{msg.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-bold mb-4">Mentorship Goals</h3>
              <div className="space-y-4">
                {selectedRelationship.goals.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No goals set yet</p>
                ) : (
                  selectedRelationship.goals.map((goal, idx) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{goal.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{goal.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          goal.completed
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {goal.completed ? '✓ Completed' : 'In Progress'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="col-span-2 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center py-16">
          <p className="text-gray-500 text-center">
            <p className="text-2xl mb-2">👥</p>
            No mentorship relationships yet. <br />
            Find a mentor to get started!
          </p>
        </div>
      )}
    </div>
  );
};

export default MentorshipDashboard;
