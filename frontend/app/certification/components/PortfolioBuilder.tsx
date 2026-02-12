/**
 * Portfolio Builder Component
 * Create and manage portfolio items, set visibility, publish portfolio
 */

'use client';

import React, { useState } from 'react';

interface PortfolioItem {
  id?: string;
  type: string;
  title: string;
  description: string;
  skills: string[];
  links?: Record<string, string>;
  startDate?: string;
  endDate?: string;
}

interface PortfolioBuilderProps {
  portfolio: {
    title: string;
    bio: string;
    items: PortfolioItem[];
    published?: boolean;
  };
  onAddItem: (item: PortfolioItem) => void;
  onUpdateItem: (itemId: string, item: Partial<PortfolioItem>) => void;
  onRemoveItem: (itemId: string) => void;
  onPublish: () => void;
  onUpdatePortfolio: (data: any) => void;
}

export const PortfolioBuilder: React.FC<PortfolioBuilderProps> = ({
  portfolio,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
  onPublish,
  onUpdatePortfolio,
}) => {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<PortfolioItem>>({
    type: 'project',
    title: '',
    description: '',
    skills: [],
    links: {},
  });

  const [portfolioData, setPortfolioData] = useState({
    title: portfolio.title,
    bio: portfolio.bio,
  });

  const itemTypeLabels: Record<string, string> = {
    project: '🚀 Project',
    certification: '🏆 Certification',
    achievement: '⭐ Achievement',
    contribution: '🤝 Contribution',
  };

  const skillOptions = [
    'React',
    'TypeScript',
    'Node.js',
    'Python',
    'AWS',
    'Docker',
    'SQL',
    'MongoDB',
  ];

  const handleAddItem = () => {
    if (
      formData.title &&
      formData.description &&
      formData.skills?.length
    ) {
      onAddItem(formData as PortfolioItem);
      setFormData({
        type: 'project',
        title: '',
        description: '',
        skills: [],
        links: {},
      });
      setIsAddingItem(false);
    }
  };

  const handleSkillToggle = (skill: string) => {
    const current = formData.skills || [];
    setFormData({
      ...formData,
      skills: current.includes(skill)
        ? current.filter((s) => s !== skill)
        : [...current, skill],
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Portfolio Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Portfolio Information</h3>

        {!isEditingInfo ? (
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Title</p>
              <p className="text-lg font-semibold mt-1">{portfolio.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Bio</p>
              <p className="text-gray-700 mt-1">
                {portfolio.bio || 'No bio added yet'}
              </p>
            </div>
            <button
              onClick={() => setIsEditingInfo(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              ✏️ Edit Info
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio Title
              </label>
              <input
                type="text"
                value={portfolioData.title}
                onChange={(e) =>
                  setPortfolioData({
                    ...portfolioData,
                    title: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={portfolioData.bio}
                onChange={(e) =>
                  setPortfolioData({
                    ...portfolioData,
                    bio: e.target.value,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onUpdatePortfolio(portfolioData);
                  setIsEditingInfo(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Save Changes
              </button>
              <button
                onClick={() => setIsEditingInfo(false)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Items Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Portfolio Items</h3>
          <button
            onClick={() => setIsAddingItem(!isAddingItem)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {isAddingItem ? '✕ Cancel' : '+ Add Item'}
          </button>
        </div>

        {/* Add Item Form */}
        {isAddingItem && (
          <div className="border-t pt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                {Object.entries(itemTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Project or achievement title"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe what you did..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills Used
              </label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <button
                    key={skill}
                    onClick={() => handleSkillToggle(skill)}
                    className={`px-3 py-1 rounded-full font-semibold transition ${
                      formData.skills?.includes(skill)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Links (optional)
              </label>
              <input
                type="url"
                placeholder="Live demo URL"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    links: { ...formData.links, live: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-2"
              />
              <input
                type="url"
                placeholder="GitHub repo URL"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    links: { ...formData.links, github: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <button
              onClick={handleAddItem}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              Add to Portfolio
            </button>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3 mt-4">
          {portfolio.items.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No items yet. Add your first project!
            </p>
          ) : (
            portfolio.items.map((item) => (
              <div
                key={item.id}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {itemTypeLabels[item.type]}
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold mt-1">{item.title}</h4>
                    <p className="text-gray-600 text-sm mt-2">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {item.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-gray-200 text-gray-800 text-xs rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(item.id || '')}
                    className="text-red-600 hover:text-red-800 font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Publish Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-3">Publish Portfolio</h3>
        <p className="text-gray-700 mb-4">
          {portfolio.published
            ? '✅ Your portfolio is published and visible to employers!'
            : 'Ready to share your portfolio with employers? Publish it now!'}
        </p>
        <button
          onClick={onPublish}
          disabled={portfolio.published}
          className={`px-6 py-2 rounded-lg font-semibold transition ${
            portfolio.published
              ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {portfolio.published ? '✓ Published' : '🌐 Publish Portfolio'}
        </button>
      </div>
    </div>
  );
};
