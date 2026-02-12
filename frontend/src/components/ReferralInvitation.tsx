import { useState } from 'react';
import { referralService } from '@/services/referral.service';
import { Mail, Share2, Upload, Users } from 'lucide-react';

export const ReferralInvitation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'email' | 'social' | 'bulk'>('email');
  const [formData, setFormData] = useState({
    emails: '',
    subject: 'Join our Amazing Job Portal!',
    message: '',
  });
  const [bulkEmails, setBulkEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const emailList = formData.emails
        .split(',')
        .map((email) => email.trim())
        .filter((email) => email);

      // Call API to send referral invitations
      await Promise.all(
        emailList.map((email) =>
          fetch('/api/referral/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              subject: formData.subject,
              message: formData.message,
            }),
          })
        )
      );

      setSuccess(true);
      setFormData({ emails: '', subject: 'Join our Amazing Job Portal!', message: '' });
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to send invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const emails = text
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && line.includes('@'));
        setBulkEmails(emails);
      };
      reader.readAsText(file);
    }
  };

  const handleBulkSend = async () => {
    if (bulkEmails.length === 0) return;

    try {
      setLoading(true);
      await Promise.all(
        bulkEmails.map((email) =>
          fetch('/api/referral/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              subject: formData.subject,
              message: formData.message || 'Check out this amazing job platform!',
            }),
          })
        )
      );

      setSuccess(true);
      setBulkEmails([]);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to send bulk invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invite Friends & Colleagues</h2>
        <p className="text-gray-600">
          Grow your network and earn rewards by inviting others to join the Job Portal
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <div className="w-2 h-2 bg-green-600 rounded-full" />
          <p className="text-green-800 font-medium">Invitations sent successfully!</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('email')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'email'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Mail size={18} />
            Email Invite
          </span>
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'bulk'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users size={18} />
            Bulk Upload
          </span>
        </button>
        <button
          onClick={() => setActiveTab('social')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'social'
              ? 'text-blue-600 border-blue-600'
              : 'text-gray-600 border-transparent hover:text-gray-900'
          }`}
        >
          <span className="flex items-center gap-2">
            <Share2 size={18} />
            Social Share
          </span>
        </button>
      </div>

      {/* Email Invite Tab */}
      {activeTab === 'email' && (
        <form onSubmit={handleSendEmail} className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Addresses</label>
            <textarea
              value={formData.emails}
              onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
              placeholder="Enter emails separated by commas&#10;e.g., john@example.com, jane@example.com"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Personal Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Add a personal message (optional)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !formData.emails}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
          >
            {loading ? 'Sending...' : 'Send Invitations'}
          </button>
        </form>
      )}

      {/* Bulk Upload Tab */}
      {activeTab === 'bulk' && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors">
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleBulkUpload}
              className="hidden"
              id="bulk-upload"
            />
            <label htmlFor="bulk-upload" className="cursor-pointer">
              <Upload className="text-gray-400 mx-auto mb-2" size={32} />
              <p className="text-gray-600 font-medium">Click to upload or drag and drop</p>
              <p className="text-sm text-gray-500">CSV or TXT file with one email per line</p>
            </label>
          </div>

          {bulkEmails.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">
                {bulkEmails.length} emails ready to send
              </h3>

              <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto mb-4">
                <div className="space-y-1">
                  {bulkEmails.slice(0, 10).map((email, i) => (
                    <p key={i} className="text-sm text-gray-700 font-mono">
                      {email}
                    </p>
                  ))}
                  {bulkEmails.length > 10 && (
                    <p className="text-sm text-gray-500">
                      +{bulkEmails.length - 10} more...
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={handleBulkSend}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
              >
                {loading ? 'Sending...' : `Send to ${bulkEmails.length} Contacts`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Social Share Tab */}
      {activeTab === 'social' && (
        <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
          <p className="text-gray-600">Share your referral link on social media</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'LinkedIn', icon: '💼', color: 'bg-blue-700' },
              { name: 'Twitter', icon: '𝕏', color: 'bg-black' },
              { name: 'Facebook', icon: 'f', color: 'bg-blue-600' },
              { name: 'WhatsApp', icon: '💬', color: 'bg-green-500' },
            ].map((platform) => (
              <button
                key={platform.name}
                className={`${platform.color} text-white px-4 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity`}
              >
                <span className="flex items-center justify-center gap-2">
                  {platform.icon} {platform.name}
                </span>
              </button>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-600 mb-3">Share this message:</p>
            <p className="bg-white p-3 rounded border border-gray-200 text-sm text-gray-700 italic">
              "Just discovered an amazing job portal that's helping thousands find their dream jobs. 
              Join me and get exclusive benefits! {'{Your Referral Link}'}"
            </p>
          </div>
        </div>
      )}

      {/* Tips Card */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for Success</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ Personalize your invitations - mention specific reasons why you like the platform</li>
          <li>✓ Follow up with interested contacts after a few days</li>
          <li>✓ Share success stories from your network</li>
          <li>✓ Use multiple channels to reach different audiences</li>
        </ul>
      </div>
    </div>
  );
};
