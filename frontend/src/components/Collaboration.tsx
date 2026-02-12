'use client';

import { useState } from 'react';
import { LayoutDashboard, MessageSquare, ListTodo, Bell, Settings } from 'lucide-react';
import { TeamDashboard } from '@/components/TeamDashboard';
import { ChatInterface } from '@/components/ChatInterface';
import { ProjectBoard } from '@/components/ProjectBoard';
import { NotificationCenter } from '@/components/NotificationCenter';
import { TeamSettings } from '@/components/TeamSettings';
import { useAuthStore } from '@/store/authStore';

interface CollaborationPageProps {
  teamId: string;
}

export const CollaborationPage: React.FC<CollaborationPageProps> = ({ teamId }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'projects' | 'notifications' | 'settings'>(
    'dashboard'
  );
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'projects', label: 'Projects', icon: ListTodo },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <TeamDashboard teamId={teamId} />;
      case 'chat':
        return selectedChannelId ? (
          <ChatInterface channelId={selectedChannelId} currentUserId={user?.id || 'current-user'} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="font-medium">Select a channel to start chatting</p>
          </div>
        );
      case 'projects':
        return selectedProjectId ? (
          <ProjectBoard projectId={selectedProjectId} />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <ListTodo size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="font-medium">Select a project to view tasks</p>
          </div>
        );
      case 'notifications':
        return <NotificationCenter teamId={teamId} />;
      case 'settings':
        return <TeamSettings teamId={teamId} onTeamUpdate={() => {}} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Team Collaboration</h1>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 overflow-x-auto -mx-4 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-4 py-2 font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white border-b-blue-600 text-blue-600'
                      : 'bg-gray-50 border-b-transparent text-gray-600 hover:text-gray-900 hover:bg-white'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Channel/Project Selector */}
          {(activeTab === 'chat' || activeTab === 'projects') && (
            <aside className="lg:col-span-1 space-y-4">
              {activeTab === 'chat' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Channels</h3>
                  <div className="space-y-2">
                    {['general', 'announcements', 'random'].map((channel) => (
                      <button
                        key={channel}
                        onClick={() => setSelectedChannelId(channel)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedChannelId === channel
                            ? 'bg-blue-100 text-blue-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        # {channel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'projects' && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Projects</h3>
                  <div className="space-y-2">
                    {['website-redesign', 'api-development', 'mobile-app'].map((project) => (
                      <button
                        key={project}
                        onClick={() => setSelectedProjectId(project)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors truncate ${
                          selectedProjectId === project
                            ? 'bg-blue-100 text-blue-900 font-medium'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        title={project}
                      >
                        {project}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}

          {/* Main Content Area */}
          <section className={activeTab === 'chat' || activeTab === 'projects' ? 'lg:col-span-3' : 'lg:col-span-4'}>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {renderTabContent()}
            </div>
          </section>
        </div>
      </main>

      {/* Footer Stats */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Team Stats Card */}
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">12</p>
              <p className="text-gray-600 text-sm mt-1">Team Members</p>
            </div>

            {/* Projects Card */}
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">8</p>
              <p className="text-gray-600 text-sm mt-1">Active Projects</p>
            </div>

            {/* Tasks Card */}
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">34</p>
              <p className="text-gray-600 text-sm mt-1">Tasks In Progress</p>
            </div>

            {/* Activity Card */}
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">156</p>
              <p className="text-gray-600 text-sm mt-1">Messages Today</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
