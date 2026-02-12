'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Save, Loader, RefreshCw } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'welcome' | 'password-reset' | 'job-alert' | 'application' | 'interview' | 'offer';
}

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  maxJobsPerDay: number;
  maxApplicationsPerDay: number;
  autoExpireJobsDays: number;
  notificationEmail: string;
  maintenanceMode: boolean;
  emailNotificationsEnabled: boolean;
}

export default function SettingsPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [settings, setSettings] = useState<SystemSettings>({
    siteName: 'Job Portal',
    siteDescription: 'Find and post jobs online',
    maxJobsPerDay: 10,
    maxApplicationsPerDay: 50,
    autoExpireJobsDays: 30,
    notificationEmail: 'admin@jobportal.com',
    maintenanceMode: false,
    emailNotificationsEnabled: true,
  });

  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateContent, setTemplateContent] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'settings'>('templates');

  // Fetch email templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await axios.get('/api/admin/email-templates', {
          withCredentials: true,
        });
        setTemplates(response.data.templates || []);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    if (activeTab === 'templates') {
      fetchTemplates();
    }
  }, [activeTab]);

  // Fetch system settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get('/api/admin/settings', {
          withCredentials: true,
        });
        setSettings(response.data.settings || settings);
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to fetch settings');
      }
    };

    if (activeTab === 'settings') {
      fetchSettings();
    }
  }, [activeTab]);

  // Save email template
  const handleSaveTemplate = async (templateId: string) => {
    try {
      setSavingTemplate(true);
      await axios.put(
        `/api/admin/email-templates/${templateId}`,
        {
          subject: templateSubject,
          content: templateContent,
        },
        { withCredentials: true }
      );

      setTemplates(
        templates.map((template) =>
          template.id === templateId
            ? {
                ...template,
                subject: templateSubject,
                content: templateContent,
              }
            : template
        )
      );

      setEditingTemplate(null);
      setTemplateContent('');
      setTemplateSubject('');
      setSuccess('Template saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Save system settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await axios.put(
        '/api/admin/settings',
        settings,
        { withCredentials: true }
      );

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Edit template
  const handleEditTemplate = (template: EmailTemplate) => {
    setEditingTemplate(template.id);
    setTemplateSubject(template.subject);
    setTemplateContent(template.content);
  };

  const templateNames: Record<string, string> = {
    welcome: 'Welcome Email',
    'password-reset': 'Password Reset',
    'job-alert': 'Job Alert',
    application: 'Application Confirmation',
    interview: 'Interview Scheduled',
    offer: 'Job Offer',
  };

  if (activeTab === 'templates' && loadingTemplates) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            System Settings
          </h1>
          <p className="text-gray-600">
            Manage email templates and system configuration
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Success</h3>
              <p className="text-green-800 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('templates')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition ${
                activeTab === 'templates'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Email Templates
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 px-6 py-4 text-center font-semibold transition ${
                activeTab === 'settings'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              System Settings
            </button>
          </div>

          {/* Email Templates Tab */}
          {activeTab === 'templates' && (
            <div className="p-6 space-y-6">
              {templates.length > 0 ? (
                templates.map((template) => (
                  <div
                    key={template.id}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {editingTemplate === template.id ? (
                      <div className="p-6 space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Template Name
                          </label>
                          <div className="text-gray-900 font-medium">
                            {templateNames[template.type] || template.name}
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email Subject
                          </label>
                          <input
                            type="text"
                            value={templateSubject}
                            onChange={(e) =>
                              setTemplateSubject(e.target.value)
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Email Content
                          </label>
                          <textarea
                            value={templateContent}
                            onChange={(e) =>
                              setTemplateContent(e.target.value)
                            }
                            rows={10}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-2">
                            Use {'{{name}}'}, {'{{email}}'}, etc. for
                            dynamic content
                          </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <button
                            onClick={() =>
                              handleSaveTemplate(template.id)
                            }
                            disabled={savingTemplate}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                          >
                            <Save className="w-4 h-4" />
                            {savingTemplate ? 'Saving...' : 'Save Template'}
                          </button>
                          <button
                            onClick={() => {
                              setEditingTemplate(null);
                              setTemplateContent('');
                              setTemplateSubject('');
                            }}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              {templateNames[template.type] ||
                                template.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                              Subject: {template.subject}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                            {template.type}
                          </span>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg mb-4 max-h-[200px] overflow-y-auto">
                          <p className="text-sm text-gray-600 whitespace-pre-wrap font-mono">
                            {template.content}
                          </p>
                        </div>

                        <button
                          onClick={() => handleEditTemplate(template)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Edit Template
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">No email templates found</p>
                </div>
              )}
            </div>
          )}

          {/* System Settings Tab */}
          {activeTab === 'settings' && (
            <div className="p-6">
              <div className="space-y-6">
                {/* Site Information */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Site Information
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={settings.siteName}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            siteName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Site Description
                      </label>
                      <textarea
                        value={settings.siteDescription}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            siteDescription: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notification Email
                      </label>
                      <input
                        type="email"
                        value={settings.notificationEmail}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            notificationEmail: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Limits & Policies */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Limits & Policies
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Jobs Per Day
                      </label>
                      <input
                        type="number"
                        value={settings.maxJobsPerDay}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maxJobsPerDay: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Max Applications Per Day
                      </label>
                      <input
                        type="number"
                        value={settings.maxApplicationsPerDay}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maxApplicationsPerDay: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Auto-Expire Jobs (Days)
                      </label>
                      <input
                        type="number"
                        value={settings.autoExpireJobsDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            autoExpireJobsDays: parseInt(e.target.value),
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">
                    Features
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.maintenanceMode}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maintenanceMode: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-700">Maintenance Mode</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotificationsEnabled}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            emailNotificationsEnabled: e.target.checked,
                          })
                        }
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <span className="text-gray-700">
                        Email Notifications Enabled
                      </span>
                    </label>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-6 border-t border-gray-200">
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
