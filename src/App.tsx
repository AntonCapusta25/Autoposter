import { useState, useEffect } from 'react';
import { Upload, Send, Link2, CheckCircle, XCircle, Loader, Settings } from 'lucide-react';

const SUPABASE_URL = 'https://gfwflqqudlgnjjnyrofr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2ZscXF1ZGxnbmpqbnlyb2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzA0MTcsImV4cCI6MjA3NDIwNjQxN30.H3vLpkT_YjSAEUP0hv8EmiPSKAF1SidPEuNrEqjVFYM';

const platforms = [
  { id: 'youtube', name: 'YouTube', icon: '🎥', color: 'red', needsConfig: false },
  { id: 'pinterest', name: 'Pinterest', icon: '📌', color: 'red', needsConfig: false },
  { id: 'twitter', name: 'X (Twitter)', icon: '🐦', color: 'black', needsConfig: false, isPaid: true },
  { id: 'facebook', name: 'Facebook', icon: '👤', color: 'blue', needsConfig: true, configLabel: 'Page ID' },
  { id: 'reddit', name: 'Reddit', icon: '🤖', color: 'orange', needsConfig: true, configLabel: 'Subreddit' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [configuring, setConfiguring] = useState(null);
  const [configValue, setConfigValue] = useState('');

  useEffect(() => {
    fetchConnections();
    // Check for OAuth callback success/error
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      const platform = params.get('platform');
      alert(`Successfully connected ${platform}!`);
      window.history.replaceState({}, '', window.location.pathname);
      setActiveTab('connections');
    } else if (params.get('error')) {
      alert(`Connection failed: ${params.get('error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const fetchConnections = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/social_connections?select=*&is_active=eq.true`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  const handleConnect = async (platform) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/connect-platform?action=initiate&platform=${platform}`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error('No auth URL returned');
      }
    } catch (error) {
      console.error('Error connecting platform:', error);
      alert('Failed to connect platform: ' + error.message);
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!confirm('Are you sure you want to disconnect this platform?')) return;

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/social_connections?id=eq.${connectionId}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      
      fetchConnections();
    } catch (error) {
      console.error('Error disconnecting platform:', error);
      alert('Failed to disconnect platform');
    }
  };

  const handleConfigurePlatform = async (connection) => {
    if (!configValue.trim()) {
      alert('Please enter a value');
      return;
    }

    try {
      const platform = connection.platform;
      let platformData = connection.platform_data || {};

      if (platform === 'reddit') {
        // Remove 'r/' prefix if user included it
        const subreddit = configValue.replace(/^r\//, '').trim();
        platformData.default_subreddit = subreddit;
      } else if (platform === 'facebook') {
        platformData.page_id = configValue.trim();
      }

      await fetch(
        `${SUPABASE_URL}/rest/v1/social_connections?id=eq.${connection.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            platform_data: platformData
          })
        }
      );

      setConfiguring(null);
      setConfigValue('');
      fetchConnections();
      alert('Configuration saved!');
    } catch (error) {
      console.error('Error configuring platform:', error);
      alert('Failed to save configuration');
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      alert('Please upload a video');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    // Check if platforms are connected
    const unconnectedPlatforms = selectedPlatforms.filter(
      p => !connections.find(c => c.platform === p && c.is_active)
    );

    if (unconnectedPlatforms.length > 0) {
      alert(`Please connect these platforms first: ${unconnectedPlatforms.join(', ')}`);
      return;
    }

    // Check if Reddit is selected and needs subreddit
    const redditConnection = connections.find(c => c.platform === 'reddit' && c.is_active);
    if (selectedPlatforms.includes('reddit') && redditConnection) {
      if (!redditConnection.platform_data?.default_subreddit) {
        alert('Please configure a default subreddit for Reddit in the Connections tab');
        return;
      }
    }

    // Check if Facebook is selected and needs page_id
    const facebookConnection = connections.find(c => c.platform === 'facebook' && c.is_active);
    if (selectedPlatforms.includes('facebook') && facebookConnection) {
      if (!facebookConnection.platform_data?.page_id) {
        alert('Please configure your Facebook Page ID in the Connections tab');
        return;
      }
    }

    setUploading(true);
    setUploadStatus('Uploading to Supabase Storage...');

    try {
      // Upload video to Supabase Storage
      const fileName = `${Date.now()}-${videoFile.name}`;
      const uploadResponse = await fetch(
        `${SUPABASE_URL}/storage/v1/object/videos/${fileName}`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': videoFile.type
          },
          body: videoFile
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video');
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/videos/${fileName}`;

      setUploadStatus('Posting to platforms...');

      // Call posting edge function
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/post-to-platforms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY
          },
          body: JSON.stringify({
            video_url: publicUrl,
            video_name: videoFile.name,
            title,
            caption,
            hashtags,
            platforms: selectedPlatforms
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadStatus('Complete!');
      
      // Reset form
      setVideoFile(null);
      setVideoPreview(null);
      setTitle('');
      setCaption('');
      setHashtags('');
      setSelectedPlatforms([]);
      setUploadStatus('');
      
      alert('Video posted successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('');
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const connectedPlatformIds = connections
    .filter(c => c.is_active)
    .map(c => c.platform);

  const isConfigured = (platform, connection) => {
    if (!platform.needsConfig) return true;
    if (!connection) return false;
    
    if (platform.id === 'reddit') {
      return !!connection.platform_data?.default_subreddit;
    }
    if (platform.id === 'facebook') {
      return !!connection.platform_data?.page_id;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Social Media Auto-Poster</h1>
          <p className="text-gray-600">Multi-platform posting with OAuth</p>
        </header>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'upload'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Upload Video
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'connections'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Link2 size={20} />
            Connections ({connections.filter(c => c.is_active).length})
          </button>
        </div>

        {uploadStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Loader className="animate-spin h-5 w-5 text-blue-600" />
              <p className="text-blue-800 font-medium">{uploadStatus}</p>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">Upload Video</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Video File</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                    {videoPreview ? (
                      <div className="space-y-4">
                        <video src={videoPreview} controls className="w-full max-h-64 rounded-lg" />
                        <p className="text-sm text-gray-500">{videoFile?.name}</p>
                        <button
                          onClick={() => {
                            setVideoFile(null);
                            setVideoPreview(null);
                          }}
                          className="text-sm text-red-500 hover:text-red-700"
                        >
                          Remove video
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-2">Click to upload video</p>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter video title"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={4}
                    placeholder="Write your caption..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    placeholder="#trending #viral"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Platforms ({selectedPlatforms.length} selected)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {platforms.map(platform => {
                      const connection = connections.find(c => c.platform === platform.id && c.is_active);
                      const isConnected = !!connection;
                      const configured = isConfigured(platform, connection);
                      const isSelected = selectedPlatforms.includes(platform.id);
                      
                      return (
                        <div key={platform.id} className="relative">
                          <button
                            onClick={() => isConnected && configured && togglePlatform(platform.id)}
                            disabled={!isConnected || !configured}
                            className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                              !isConnected || !configured
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : isSelected
                                ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                                : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300'
                            }`}
                          >
                            <span className="text-xl">{platform.icon}</span>
                            <span className="flex-1 text-left text-sm">{platform.name}</span>
                            {isConnected && configured ? (
                              <CheckCircle size={16} className="text-green-500" />
                            ) : (
                              <XCircle size={16} />
                            )}
                          </button>
                          {platform.isPaid && (
                            <span className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                              Paid
                            </span>
                          )}
                          {isConnected && !configured && (
                            <p className="text-xs text-orange-600 mt-1">Needs config</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Connect and configure platforms in the Connections tab
                  </p>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={uploading || selectedPlatforms.length === 0}
                  className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                    uploading || selectedPlatforms.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader className="animate-spin h-5 w-5" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Post to {selectedPlatforms.length} Platform{selectedPlatforms.length !== 1 ? 's' : ''}
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">Platform Notes</h2>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🎥</span> YouTube
                  </h3>
                  <p className="text-sm text-red-800">
                    Posts to your connected YouTube channel. Videos are set to public by default.
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🤖</span> Reddit
                  </h3>
                  <p className="text-sm text-orange-800">
                    Posts to your configured subreddit. Configure in Connections tab. Follow subreddit rules!
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">👤</span> Facebook
                  </h3>
                  <p className="text-sm text-blue-800">
                    Requires Facebook Page (not personal profile). Configure Page ID in Connections tab.
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">📌</span> Pinterest
                  </h3>
                  <p className="text-sm text-purple-800">
                    Posts to your first board. Videos up to 2GB and 5 minutes.
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <span className="text-xl">🐦</span> X (Twitter)
                  </h3>
                  <p className="text-sm text-yellow-800">
                    Requires paid API access ($100/month). 280 character limit, 2:20 video max.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connections Tab */}
        {activeTab === 'connections' && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Platform Connections</h2>
            
            {loadingConnections ? (
              <div className="text-center py-12">
                <Loader className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading connections...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {platforms.map(platform => {
                  const connection = connections.find(
                    c => c.platform === platform.id && c.is_active
                  );
                  const configured = isConfigured(platform, connection);
                  
                  return (
                    <div
                      key={platform.id}
                      className={`p-6 rounded-lg border-2 transition-all ${
                        connection
                          ? configured
                            ? 'border-green-200 bg-green-50'
                            : 'border-orange-200 bg-orange-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl">{platform.icon}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{platform.name}</h3>
                          {connection && (
                            <p className="text-sm text-gray-600">@{connection.platform_username}</p>
                          )}
                          {platform.isPaid && (
                            <p className="text-xs text-yellow-700 font-medium">Paid API required</p>
                          )}
                        </div>
                        {connection && configured ? (
                          <CheckCircle size={24} className="text-green-500" />
                        ) : connection && !configured ? (
                          <Settings size={24} className="text-orange-500" />
                        ) : (
                          <XCircle size={24} className="text-gray-400" />
                        )}
                      </div>
                      
                      {connection ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-600">
                            Connected {new Date(connection.connected_at).toLocaleDateString()}
                          </p>
                          
                          {platform.needsConfig && (
                            <div className="space-y-2">
                              {configuring === connection.id ? (
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder={
                                      platform.id === 'reddit' 
                                        ? 'Enter subreddit (e.g., videos)' 
                                        : platform.id === 'facebook'
                                        ? 'Enter Page ID'
                                        : 'Enter value'
                                    }
                                    value={configValue}
                                    onChange={(e) => setConfigValue(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleConfigurePlatform(connection)}
                                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                                    >
                                      Save
                                    </button>
                                    <button
                                      onClick={() => {
                                        setConfiguring(null);
                                        setConfigValue('');
                                      }}
                                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {configured ? (
                                    <div className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">{platform.configLabel}:</span>
                                      <span className="font-medium">
                                        {platform.id === 'reddit' 
                                          ? `r/${connection.platform_data?.default_subreddit}`
                                          : connection.platform_data?.page_id
                                        }
                                      </span>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-orange-700 font-medium">
                                      Configuration required
                                    </p>
                                  )}
                                  <button
                                    onClick={() => {
                                      setConfiguring(connection.id);
                                      setConfigValue(
                                        platform.id === 'reddit'
                                          ? connection.platform_data?.default_subreddit || ''
                                          : connection.platform_data?.page_id || ''
                                      );
                                    }}
                                    className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                                  >
                                    <Settings size={16} />
                                    {configured ? 'Update' : 'Configure'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          <button
                            onClick={() => handleDisconnect(connection.id)}
                            className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                          >
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnect(platform.id)}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
