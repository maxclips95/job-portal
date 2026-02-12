'use client';

import { useState, useEffect } from 'react';
import { collaborationService } from '@/services/collaboration.service';
import {
  Settings,
  Users,
  Plus,
  Trash2,
  Edit2,
  Lock,
  LogOut,
  Download,
  AlertTriangle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  name?: string;
  email?: string;
  avatar_url?: string;
  joined_at: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  avatar_url?: string;
  status: string;
}

interface TeamSettingsProps {
  teamId: string;
  onTeamUpdate?: () => void;
}

export const TeamSettings: React.FC<TeamSettingsProps> = ({ teamId, onTeamUpdate }) => {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'preferences' | 'danger'>(
    'info'
  );
  const [editTeam, setEditTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: '', description: '', avatar_url: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' });
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    loadTeamData();
  }, [teamId]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const [teamData, membersData] = await Promise.all([
        collaborationService.getTeam(teamId),
        collaborationService.getTeamMembers(teamId),
      ]);
      setTeam(teamData);
      setMembers(membersData || []);
      if (teamData) {
        setTeamForm({
          name: teamData.name,
          description: teamData.description || '',
          avatar_url: teamData.avatar_url || '',
        });
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim()) return;

    try {
      await collaborationService.updateTeam(teamId, {
        name: teamForm.name,
        description: teamForm.description,
        avatar_url: teamForm.avatar_url,
      });
      setEditTeam(false);
      await loadTeamData();
      onTeamUpdate?.();
    } catch (error) {
      console.error('Failed to update team:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) return;

    try {
      setAddingMember(true);
      await collaborationService.addTeamMember(teamId, inviteForm.email, inviteForm.role);
      setInviteForm({ email: '', role: 'member' });
      await loadTeamData();
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName?: string) => {
    if (!confirm(`Remove ${memberName || 'this member'} from the team?`)) return;

    try {
      await collaborationService.removeTeamMember(teamId, memberId);
      await loadTeamData();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleChangeMemberRole = async (memberId: string, newRole: string) => {
    try {
      await collaborationService.updateTeamMember(teamId, memberId, { role: newRole });
      await loadTeamData();
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  };

  const handleExportTeamData = () => {
    const data = {
      team: {
        name: team?.name,
        description: team?.description,
        members_count: members.length,
        status: team?.status,
        created_at: new Date().toISOString(),
      },
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        joined_at: m.joined_at,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-${team?.id}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTeam = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this team? This action cannot be undone and will remove all associated data.'
      )
    ) {
      return;
    }

    try {
      // Call delete endpoint - would need to be added to collaborationService
      // await collaborationService.deleteTeam(teamId);
      console.log('Team deleted');
    } catch (error) {
      console.error('Failed to delete team:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-40 bg-gray-200 rounded-lg" />
        <div className="h-60 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
          {team?.name?.[0] || 'T'}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{team?.name}</h2>
          <p className="text-gray-600">{members.length} members</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        {(['info', 'members', 'preferences', 'danger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'info' && <span className="flex items-center gap-2"><Settings size={18} /> Team Info</span>}
            {tab === 'members' && <span className="flex items-center gap-2"><Users size={18} /> Members</span>}
            {tab === 'preferences' && <span className="flex items-center gap-2"><Lock size={18} /> Preferences</span>}
            {tab === 'danger' && <span className="flex items-center gap-2"><AlertTriangle size={18} /> Danger Zone</span>}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {/* Team Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {!editTeam ? (
              <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Team Name</h3>
                  <p className="text-gray-900 text-lg">{team?.name}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-600">{team?.description || 'No description'}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Status</h3>
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {team?.status || 'active'}
                  </span>
                </div>

                <button
                  onClick={() => setEditTeam(true)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Edit2 size={18} />
                  Edit Team Info
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdateTeam} className="bg-blue-50 rounded-lg p-6 border border-blue-200 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Team Name *</label>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea
                    value={teamForm.description}
                    onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Team description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Avatar URL</label>
                  <input
                    type="url"
                    value={teamForm.avatar_url}
                    onChange={(e) => setTeamForm({ ...teamForm, avatar_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTeam(false)}
                    className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Members Tab */}
        {activeTab === 'members' && (
          <div className="space-y-6">
            {/* Add Member Form */}
            <form onSubmit={handleAddMember} className="bg-blue-50 rounded-lg p-6 border border-blue-200 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Plus size={18} />
                Invite Member
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="Email address"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={addingMember}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-colors font-medium"
              >
                {addingMember ? 'Inviting...' : 'Send Invite'}
              </button>
            </form>

            {/* Members List */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Team Members ({members.length})</h3>

              {members.length === 0 ? (
                <p className="text-gray-600">No members yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {member.name?.[0] || 'U'}
                      </div>

                      <div>
                        <h4 className="font-medium text-gray-900">{member.name}</h4>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeMemberRole(member.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="owner">Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>

                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">Notification Preferences</h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-gray-900">Mention notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-gray-900">Message notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-gray-900">Task notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span className="text-gray-900">Email notifications</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span className="text-gray-900">Push notifications</span>
              </label>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Digest Frequency</label>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="instant">Instant</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="never">Never</option>
              </select>
            </div>

            <button className="w-full mt-6 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Save Preferences
            </button>
          </div>
        )}

        {/* Danger Zone */}
        {activeTab === 'danger' && (
          <div className="bg-red-50 rounded-lg p-6 border border-red-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Danger Zone</h3>
                <p className="text-red-800 text-sm mt-1">These actions cannot be undone</p>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-red-200">
              <button
                onClick={handleExportTeamData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                <Download size={18} />
                Export Team Data
              </button>

              <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-900 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                <LogOut size={18} />
                Leave Team
              </button>

              <button
                onClick={handleDeleteTeam}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Delete Team
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
