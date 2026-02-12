import { useState, useEffect } from 'react';
import { referralService } from '@/services/referral.service';
import { Heart, MessageCircle, Share2, ThumbsUp, Trophy } from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string;
  tags?: string[];
  likes: number;
  comments: number;
  shares: number;
  created_at: string;
  user?: { name: string; avatar?: string; level?: string };
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  likes: number;
  created_at: string;
  user?: { name: string };
}

export const CommunityFeed: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<{ [key: string]: Comment[] }>({});
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const [newPost, setNewPost] = useState({
    type: 'discussion',
    title: '',
    content: '',
    tags: '',
  });

  const postTypes = [
    { id: 'discussion', label: 'Discussion', icon: '💬', color: 'blue' },
    { id: 'question', label: 'Question', icon: '❓', color: 'yellow' },
    { id: 'resource', label: 'Resource', icon: '📚', color: 'green' },
    { id: 'job-tip', label: 'Job Tip', icon: '💡', color: 'purple' },
    { id: 'success-story', label: 'Success Story', icon: '🎉', color: 'pink' },
  ];

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const postsData = await referralService.getPosts();
      setPosts(postsData || []);

      // Load comments for each post
      const commentsMap: { [key: string]: Comment[] } = {};
      for (const post of postsData || []) {
        const postComments = await referralService.getComments(post.id);
        commentsMap[post.id] = postComments || [];
      }
      setComments(commentsMap);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title || !newPost.content) return;

    try {
      const tags = newPost.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag);

      await referralService.createPost(newPost.type, newPost.title, newPost.content, tags);
      setNewPost({ type: 'discussion', title: '', content: '', tags: '' });
      setShowCreatePost(false);
      await loadPosts();
    } catch (error) {
      console.error('Failed to create post:', error);
    }
  };

  const handleLikePost = async (postId: string) => {
    const isLiked = likedPosts.has(postId);
    try {
      if (isLiked) {
        await referralService.unlikePost(postId);
        likedPosts.delete(postId);
      } else {
        await referralService.likePost(postId);
        likedPosts.add(postId);
      }
      setLikedPosts(new Set(likedPosts));
      await loadPosts();
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedComments(newExpanded);
  };

  const getPostTypeInfo = (type: string) => {
    return postTypes.find((pt) => pt.id === type) || postTypes[0];
  };

  const getBadgeColor = (level?: string) => {
    switch (level) {
      case 'platinum':
        return 'bg-purple-100 text-purple-800';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800';
      case 'silver':
        return 'bg-gray-100 text-gray-800';
      case 'bronze':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-48 bg-gray-200 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Post Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {!showCreatePost ? (
          <button
            onClick={() => setShowCreatePost(true)}
            className="w-full text-left px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            What would you like to share?
          </button>
        ) : (
          <form onSubmit={handleCreatePost} className="space-y-4">
            {/* Post Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Post Type</label>
              <div className="grid grid-cols-5 gap-2">
                {postTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setNewPost({ ...newPost, type: type.id })}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      newPost.type === type.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span className="block text-xs mt-1">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Give your post a title..."
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{newPost.title.length}/200</p>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={newPost.content}
                onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                placeholder="Share your thoughts, ask questions, or tell your story..."
                required
                maxLength={5000}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{newPost.content.length}/5000</p>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                placeholder="Add tags separated by commas (e.g., job-search, networking, career)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Post
              </button>
              <button
                type="button"
                onClick={() => setShowCreatePost(false)}
                className="flex-1 bg-gray-200 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <MessageCircle size={40} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No posts yet</p>
          <p className="text-sm text-gray-500">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const typeInfo = getPostTypeInfo(post.type);
            const postComments = comments[post.id] || [];

            return (
              <div key={post.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Post Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {post.user?.name?.[0] || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{post.user?.name || 'User'}</p>
                          {post.user?.level && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBadgeColor(post.user.level)}`}>
                              <Trophy size={12} className="inline mr-1" />
                              {post.user.level}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`text-lg bg-gray-100 px-3 py-1 rounded-lg`}>{typeInfo.icon}</span>
                  </div>

                  {/* Post Type Badge */}
                  <div className="mb-3">
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {typeInfo.label}
                    </span>
                  </div>
                </div>

                {/* Post Content */}
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{post.title}</h3>
                  <p className="text-gray-700 text-sm line-clamp-3">{post.content}</p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-3">
                      {post.tags.map((tag, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Engagement Stats */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-600 flex gap-4">
                  <span>{post.likes} likes</span>
                  <span>{post.comments} comments</span>
                  <span>{post.shares} shares</span>
                </div>

                {/* Action Buttons */}
                <div className="px-4 py-3 flex gap-4">
                  <button
                    onClick={() => handleLikePost(post.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors font-medium text-sm ${
                      likedPosts.has(post.id)
                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Heart size={18} fill={likedPosts.has(post.id) ? 'currentColor' : 'none'} />
                    Like
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium text-sm"
                  >
                    <MessageCircle size={18} />
                    Comment
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium text-sm">
                    <Share2 size={18} />
                    Share
                  </button>
                </div>

                {/* Comments Section */}
                {expandedComments.has(post.id) && (
                  <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                    {postComments.length === 0 ? (
                      <p className="text-sm text-gray-500">No comments yet. Be the first!</p>
                    ) : (
                      <div className="space-y-3">
                        {postComments.map((comment) => (
                          <div key={comment.id} className="bg-white p-3 rounded-lg">
                            <div className="flex items-start justify-between">
                              <p className="font-medium text-sm text-gray-900">{comment.user?.name || 'User'}</p>
                              <span className="text-xs text-gray-500">{comment.likes} likes</span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Post
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
