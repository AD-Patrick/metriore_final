import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Eye, 
  Video, 
  TrendingUp, 
  Calendar,
  Clock,
  ThumbsUp,
  MessageCircle,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface YouTubeChannelDataCardsProps {
  accountId: string;
  channelId: string;
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
  thumbnail_url: string | null;
  subscriber_count: number;
  video_count: number;
  view_count: number;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export function YouTubeChannelDataCards({ accountId, channelId }: YouTubeChannelDataCardsProps) {
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    console.log('YoutubeChannelDataCards: Component mounted with props:', { accountId, channelId });
    if (accountId && channelId) {
      loadChannelData();
    } else {
      console.log('YoutubeChannelDataCards: Missing accountId or channelId:', { accountId, channelId });
    }
  }, [accountId, channelId]);

  const loadChannelData = async () => {
    try {
      setLoading(true);
      console.log('YoutubeChannelDataCards: Loading channel data for:', { accountId, channelId });

      // Load channel data from youtube_channels table
      const { data: channelData, error } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('account_id', accountId)
        .eq('channel_id', channelId)
        .maybeSingle();

      if (error) {
        console.error('YoutubeChannelDataCards: Error loading channel data:', error);
        toast({
          title: "Error",
          description: "Failed to load channel data",
          variant: "destructive",
        });
        return;
      }

      console.log('YoutubeChannelDataCards: Channel data loaded:', channelData);

      if (channelData) {
        setChannel(channelData);
        console.log('YoutubeChannelDataCards: Channel loaded successfully:', channelData);
        console.log('YoutubeChannelDataCards: Channel metrics:', {
          title: channelData.channel_title,
          subscribers: channelData.subscriber_count,
          views: channelData.view_count,
          videos: channelData.video_count,
          thumbnail: channelData.thumbnail_url
        });
      } else {
        console.log('YoutubeChannelDataCards: No channel data found in any table');
        setChannel(null);
      }

    } catch (error) {
      console.error('YoutubeChannelDataCards: Error loading channel data:', error);
      toast({
        title: "Error",
        description: "Failed to load channel data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      
      const { data: syncResult, error } = await supabase.functions.invoke('youtube-sync', {
        body: { accountId }
      });

      console.log('YoutubeChannelDataCards: Sync result:', syncResult);
      console.log('YoutubeChannelDataCards: Sync error:', error);

      // If there is an error, log it
      if (error) {
        console.error('YouTube sync error:', error);
      }

      // Reload data after sync
      await loadChannelData();
      
      toast({
        title: "Data refreshed",
        description: "YouTube data has been updated successfully.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const extractHandle = (channelUrl: string) => {
    try {
      if (channelUrl.includes('@')) {
        return channelUrl.split('@')[1] || '';
      }
      return '';
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No channel data found.</p>
        <p className="text-sm">Make sure you have connected your YouTube channel in Settings.</p>
        <div className="mt-4 p-4 bg-muted rounded text-left text-xs">
          <p><strong>Debug Info:</strong></p>
          <p>Account ID: {accountId || 'Not provided'}</p>
          <p>Channel ID: {channelId || 'Not provided'}</p>
          <p>Check browser console for detailed logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">YouTube Channel Data</h2>
          <p className="text-muted-foreground">Real-time metrics for your channel</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Last synced: {formatDate(channel?.last_synced_at)}
          </p>
        </div>
      </div>

      {/* Channel Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            {channel.thumbnail_url && (
              <img
                src={channel.thumbnail_url}
                alt={channel.channel_title}
                className="w-16 h-16 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{channel.channel_title || 'Unknown Channel'}</h3>
                <Badge variant="secondary" className="capitalize">
                  {channel.language === 'en' ? 'English' : 'Spanish'}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span>@{extractHandle(channel.channel_url)}</span>
                <span>•</span>
                <span>Channel ID: {channel.channel_id}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={channel.channel_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Channel
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Subscribers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(channel.subscriber_count || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total audience
            </p>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(channel.view_count || 0)}</div>
            <p className="text-xs text-muted-foreground">
              All-time views
            </p>
          </CardContent>
        </Card>

        {/* Total Videos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(channel.video_count || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Published content
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
