import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  RefreshCw, 
  Youtube, 
  Play,
  CheckCircle,
  XCircle
} from "lucide-react";

export const YouTubeDiagnostics = () => {
  const [channelInput, setChannelInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [channelData, setChannelData] = useState<any>(null);
  const [videosData, setVideosData] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { toast } = useToast();

  const testYouTubeApi = async () => {
    if (!channelInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter a channel URL, handle, or ID",
        variant: "destructive"
      });
      return;
    }

    setIsLookingUp(true);
    setApiStatus('unknown');
    setErrorMessage('');
    setChannelData(null);
    setVideosData([]);

    try {
      const { data, error } = await supabase.functions.invoke('youtube-public-lookup', {
        body: { channelInput: channelInput.trim() }
      });

      if (error) {
        throw new Error(error.message);
      }

      setApiStatus('success');
      setChannelData(data.channel);
      setVideosData(data.videos || []);
      
      toast({
        title: "API Test Successful",
        description: `Found channel: ${data.channel?.title || 'Unknown'}`
      });

    } catch (error: any) {
      console.error('YouTube API test error:', error);
      setApiStatus('error');
      setErrorMessage(error.message || 'Failed to test YouTube API');
      
      toast({
        title: "API Test Failed",
        description: error.message || "Failed to test YouTube API",
        variant: "destructive"
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Youtube className="h-8 w-8 text-red-600" />
          <h1 className="text-3xl font-bold">YouTube API v3 Diagnostics</h1>
        </div>

        {/* API Test Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              YouTube Data API v3 Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Test the YouTube Data API v3 by looking up any public channel. This uses only an API key, no OAuth required.
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-input">Channel URL, Handle, or ID</Label>
                <Input
                  id="channel-input"
                  placeholder="@mychannel, https://youtube.com/@mychannel, or UC..."
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                />
              </div>
              
              <Button 
                onClick={testYouTubeApi} 
                disabled={isLookingUp}
                className="w-full"
              >
                {isLookingUp ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Test YouTube API v3
              </Button>
            </div>

            {/* API Status */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <span className="font-medium">API Status:</span>
              {apiStatus === 'success' && (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>Success</span>
                </div>
              )}
              {apiStatus === 'error' && (
                <div className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span>Error</span>
                </div>
              )}
              {apiStatus === 'unknown' && (
                <span className="text-muted-foreground">Not tested</span>
              )}
            </div>

            {errorMessage && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{errorMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Data Results */}
        {channelData && (
          <Card>
            <CardHeader>
              <CardTitle>Channel Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Title</p>
                  <p className="font-medium">{channelData.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Channel ID</p>
                  <p className="font-medium text-xs">{channelData.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscribers</p>
                  <p className="font-medium">
                    {channelData.statistics?.subscriberCount ? 
                      parseInt(channelData.statistics.subscriberCount).toLocaleString() : 
                      'N/A'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="font-medium">
                    {channelData.statistics?.viewCount ? 
                      parseInt(channelData.statistics.viewCount).toLocaleString() : 
                      'N/A'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Videos Data Results */}
        {videosData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Videos ({videosData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {videosData.map((video, idx) => (
                  <div key={idx} className="p-3 border rounded-md">
                    <div className="font-medium mb-1">{video.title}</div>
                    <div className="text-sm text-muted-foreground flex gap-4">
                      <span>Views: {video.view_count?.toLocaleString() || 'N/A'}</span>
                      <span>Likes: {video.like_count?.toLocaleString() || 'N/A'}</span>
                      <span>Comments: {video.comment_count?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Published: {video.published_at ? new Date(video.published_at).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>API Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-900">YouTube Data API v3</h4>
                <p className="text-sm text-blue-700">
                  This tool uses the YouTube Data API v3 with an API key to fetch public channel and video data. 
                  No OAuth authentication is required for public data.
                </p>
              </div>
              
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <h4 className="font-medium text-green-900">API Key Authentication</h4>
                <p className="text-sm text-green-700">
                  All requests are made using a server-side API key, which is secure and doesn't require user authorization.
                </p>
              </div>
              
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <h4 className="font-medium text-orange-900">Rate Limits</h4>
                <p className="text-sm text-orange-700">
                  The YouTube Data API v3 has quota limits. Each request consumes quota units based on the operation complexity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};