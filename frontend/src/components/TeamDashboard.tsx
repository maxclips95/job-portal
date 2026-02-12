'use client';

import { useState, useEffect } from 'react';
import { collaborationService } from '@/services/collaboration.service';
import { Users, MessageSquare, CheckCircle, TrendingUp, Plus } from 'lucide-react';

interface TeamDashboardProps {
  teamId: string;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({ teamId }) => {
  const [stats, setStats] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [teamId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, membersData, contributionsData] = await Promise.all([
        collaborationService.getTeamStats(teamId),
        collaborationService.getTeamMembers(teamId),
        collaborationService.getMemberContributions(teamId),
      ]);

      setStats(statsData);
      setMembers(membersData);
      setContributions(contributionsData);
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Members</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.member_count || 0}</p>
            </div>
            <Users className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Channels</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.channel_count || 0}</p>
            </div>
            <MessageSquare className="text-purple-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Projects</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.project_count || 0}</p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Messages</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.message_count || 0}</p>
            </div>
            <TrendingUp className="text-orange-600" size={32} />
          </div>
        </div>
      </div>

      {/* Activity Types */}
      {stats?.activity_types && Object.keys(stats.activity_types).length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.activity_types).map(([type, count]: [string, any]) => (
              <div key={type} className="text-center">
                <p className="text-2xl font-bold text-blue-600">{count}</p>
                <p className="text-sm text-gray-600 capitalize mt-1">{type.replace(/_/g, ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Team Members</h3>
          <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm">
            <Plus size={16} /> Add Member
          </button>
        </div>

        <div className="space-y-3">
          {members.slice(0, 8).map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {member.user.name?.[0] || 'U'}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{member.user.name}</p>
                  <p className="text-xs text-gray-600 capitalize">{member.role}</p>
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  member.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          ))}
        </div>

        {members.length > 8 && (
          <button className="w-full mt-3 text-center text-sm text-blue-600 hover:text-blue-700 py-2 border-t border-gray-200 mt-4">
            View all {members.length} members
          </button>
        )}
      </div>

      {/* Top Contributors */}
      {contributions.length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-4">Top Contributors</h3>
          <div className="space-y-3">
            {contributions.slice(0, 5).map((contrib, idx) => (
              <div key={contrib.user_id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-8">#{idx + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900">{contrib.name}</p>
                    <p className="text-xs text-gray-600">
                      {contrib.messages} messages • {contrib.tasks_created} tasks created •{' '}
                      {contrib.tasks_completed} tasks completed
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{contrib.total_contributions}</p>
                  <p className="text-xs text-gray-600">contributions</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
