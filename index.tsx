import { useState, useEffect } from 'react';
import { Upload, Send, Instagram, Youtube, Activity } from 'lucide-react';

// Configuration - UPDATE THESE VALUES
const SUPABASE_URL = 'https://gfwflqqudlgnjjnyrofr.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'; // Get from Supabase Dashboard → Settings → API
const N8N_WEBHOOK_URL = 'https://n8n-yvct.onrender.com/webhook/post-video';

export default function SocialMediaAutoPoster() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platforms, setPlatforms] = useState({
    tiktok: false,
    instagram: false,
    youtube: true
  });
  const [posts, setPosts] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?select=*&order=created_at.desc&limit=20`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const data = await response.json();
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handlePlatformToggle = (platform) => {
    setPlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  const handleSubmit = async () => {
    if (!videoFile) {
      alert('Please upload a video');
      return;
    }

    const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
    
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
    }

    setUploading(true);
    setUploadStatus('Preparing upload...');

    try {
      // Convert video to base64 for n8n
      const reader = new FileReader();
      const videoBase64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      setUploadStatus('Uploading to Google Drive...');

      // Send everything to n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          video_base64: videoBase64,
          video_name: videoFile.name,
          video_mimetype: videoFile.type,
          title,
          caption,
          hashtags,
          platforms: selectedPlatforms
        })
      });

      if (!response.ok) throw new Error('Upload failed');

      const result = await response.json();
      
      setUploadStatus('Processing complete!');
      
      // Refresh posts
      await fetchPosts();

      // Reset form
      setVideoFile(null);
      setVideoPreview(null);
      setTitle('');
      setCaption('');
      setHashtags('');
      setUploadStatus('');
      
      alert('Video uploaded successfully!');
    } catch (error) {
      setUploadStatus('');
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Social Media Auto-Poster</h1>
              <p className="text-gray-600">Google Drive + n8n + Supabase</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <Activity size={18} className="text-green-600" />
              <span className="text-sm text-green-600 font-medium">n8n Active</span>
            </div>
          </div>
        </header>

        {SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE' && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ Please update SUPABASE_ANON_KEY in the code with your actual Supabase anon key
            </p>
          </div>
        )}

        {uploadStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="text-blue-800 font-medium">{uploadStatus}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Upload Video</h2>
            
            <div className="space-y-6">
              {/* Video Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                  {videoPreview ? (
                    <div className="space-y-4">
                      <video 
                        src={videoPreview} 
                        controls 
                        className="w-full max-h-64 rounded-lg"
                      />
                      <p className="text-sm text-gray-500">{videoFile.name}</p>
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
                      <p className="text-sm text-gray-600 mb-2">
                        Click to upload video
                      </p>
                      <p className="text-xs text-gray-500">Will be uploaded to Google Drive</p>
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

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Video Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Caption / Description
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows="4"
                  placeholder="Write your post caption here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#trending #viral #content"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Platforms
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handlePlatformToggle('tiktok')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      platforms.tiktok
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-lg">🎵</span>
                    TikTok
                  </button>
                  
                  <button
                    onClick={() => handlePlatformToggle('instagram')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      platforms.instagram
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Instagram size={18} />
                    Instagram
                  </button>
                  
                  <button
                    onClick={() => handlePlatformToggle('youtube')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      platforms.youtube
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Youtube size={18} />
                    YouTube
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={uploading}
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  uploading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
                }`}
              >
                {uploading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    Upload & Post
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Posts History */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Recent Posts</h2>
            
            {posts.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No posts yet. Upload your first video!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {posts.map((post) => (
                  <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      {post.google_drive_link && (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.01 1.5L0 20.5h5.99l6.01-10.36L18.01 20.5H24l-12.01-19z"/>
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            post.status === 'posted' ? 'bg-green-100 text-green-700' :
                            post.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            post.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {post.status === 'posted' ? '✓ Posted' :
                             post.status === 'processing' ? '⟳ Processing' :
                             post.status === 'failed' ? '✗ Failed' :
                             '⏰ Queued'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {post.title && (
                          <h3 className="text-sm font-semibold text-gray-800 mb-1">
                            {post.title}
                          </h3>
                        )}
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {post.caption || 'No caption'}
                        </p>
                        
                        {post.hashtags && (
                          <p className="text-xs text-blue-600 mb-2">{post.hashtags}</p>
                        )}
                        
                        <div className="flex gap-2 flex-wrap items-center">
                          {post.platforms && post.platforms.map((platform) => (
                            <span 
                              key={platform}
                              className="text-xs px-2 py-1 bg-gray-100 rounded-full capitalize"
                            >
                              {platform}
                            </span>
                          ))}
                          
                          {post.google_drive_link && (
                            <a 
                              href={post.google_drive_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              View on Drive →
                            </a>
                          )}
                          
                          {post.platform_links && post.platform_links.youtube && (
                            <a 
                              href={post.platform_links.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-red-500 hover:underline"
                            >
                              YouTube →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
