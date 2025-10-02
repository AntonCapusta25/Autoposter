import { useState, useEffect } from 'react';
import { Upload, Send, Instagram, Youtube, Activity } from 'lucide-react';

// Configuration
const SUPABASE_URL = 'https://gfwflqqudlgnjjnyrofr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdmd2ZscXF1ZGxnbmpqbnlyb2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MzA0MTcsImV4cCI6MjA3NDIwNjQxN30.H3vLpkT_YjSAEUP0hv8EmiPSKAF1SidPEuNrEqjVFYM';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/upload-video`;

interface Post {
  id: string;
  video_url: string;
  video_name: string;
  title: string;
  caption: string;
  hashtags: string;
  platforms: string[];
  status: string;
  platform_links?: {
    youtube?: string;
    tiktok?: string;
    instagram?: string;
  };
  created_at: string;
  processed_at?: string;
  error_message?: string;
}

interface Platforms {
  tiktok: boolean;
  instagram: boolean;
  youtube: boolean;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [platforms, setPlatforms] = useState<Platforms>({
    tiktok: false,
    instagram: false,
    youtube: true
  });
  const [posts, setPosts] = useState<Post[]>([]);
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

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
    }
  };

  const handlePlatformToggle = (platform: keyof Platforms) => {
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

    const selectedPlatforms = (Object.keys(platforms) as Array<keyof Platforms>)
      .filter(p => platforms[p]);
    
    if (selectedPlatforms.length === 0) {
      alert('Please select at least one platform');
      return;
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
        const error = await uploadResponse.json();
        throw new Error(error.message || 'Failed to upload to storage');
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/videos/${fileName}`;

      setUploadStatus('Processing video...');

      // Call Supabase Edge Function
      const response = await fetch(EDGE_FUNCTION_URL, {
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
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      
      setUploadStatus('Processing complete!');
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
      console.error('Upload error:', error);
      setUploadStatus('');
      alert('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
              <p className="text-gray-600">Supabase Edge Functions + Storage</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200">
              <Activity size={18} className="text-green-600" />
              <span className="text-sm text-green-600 font-medium">Serverless Active</span>
            </div>
          </div>
        </header>

        {uploadStatus && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <p className="text-blue-800 font-medium">{uploadStatus}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Upload Video</h2>
            
            <div className="space-y-6">
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
                      <p className="text-xs text-gray-500">Will be uploaded to Supabase Storage</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter video title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Caption / Description</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Write your post caption here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#trending #viral #content"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Platforms</label>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handlePlatformToggle('tiktok')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      platforms.tiktok ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-lg">🎵</span>
                    TikTok
                  </button>
                  
                  <button
                    onClick={() => handlePlatformToggle('instagram')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      platforms.instagram ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Instagram size={18} />
                    Instagram
                  </button>
                  
                  <button
                    onClick={() => handlePlatformToggle('youtube')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      platforms.youtube ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <Youtube size={18} />
                    YouTube
                  </button>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={uploading}
                className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
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
                      {post.video_url && (
                        <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                          <video 
                            src={post.video_url} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            post.status === 'completed' ? 'bg-green-100 text-green-700' :
                            post.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            post.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {post.status === 'completed' ? '✓ Completed' :
                             post.status === 'processing' ? '⟳ Processing' :
                             post.status === 'failed' ? '✗ Failed' :
                             '⏰ Queued'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {post.title && (
                          <h3 className="text-sm font-semibold text-gray-800 mb-1 truncate">{post.title}</h3>
                        )}
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {post.caption || 'No caption'}
                        </p>
                        
                        {post.hashtags && (
                          <p className="text-xs text-blue-600 mb-2 truncate">{post.hashtags}</p>
                        )}
                        
                        {post.error_message && (
                          <p className="text-xs text-red-600 mb-2">{post.error_message}</p>
                        )}
                        
                        <div className="flex gap-2 flex-wrap items-center">
                          {post.platforms?.map((platform) => (
                            <span 
                              key={platform}
                              className="text-xs px-2 py-1 bg-gray-100 rounded-full capitalize"
                            >
                              {platform}
                            </span>
                          ))}
                          
                          {post.video_url && (
                            <a 
                              href={post.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline"
                            >
                              Video →
                            </a>
                          )}
                          
                          {post.platform_links?.youtube && (
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
