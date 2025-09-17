import { useState, useEffect } from "react";
import { YouTubeDataSummary } from "@/components/youtube/YouTubeDataSummary";
import { YouTubeVideosTable } from "@/components/youtube/YouTubeVideosTable";
import { YouTubeChannelDataCards } from "@/components/youtube/YouTubeChannelDataCards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3 } from "lucide-react";
import { useOrganization } from "@/components/OrganizationProvider";
import { PageDebugger } from "@/components/debug/PageDebugger";

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
}

export default function Data() {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { currentOrganization } = useOrganization();

  // TODO: maybe add data export feature later
  console.log('Data page loaded 📊');

  useEffect(() => {
    if (currentOrganization?.id) {
      loadChannels();
      checkAndAutoSync();
      setLoading(false);
    }
  }, [currentOrganization]);

  // TODO: rename this function to something more descriptive
  const loadChannels = async () => {
    if (!currentOrganization?.id) return;

    try {
      console.log('Loading channels...', currentOrganization.id, '📺');
      
      const { data: channels, error: channelsError } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('account_id', currentOrganization.id);

      if (channelsError) {
        console.log('❌ Data page: Channels error:', channelsError);
        return;
      }

      console.log('Channels found:', channels?.length, '📺');
      setChannels(channels || []);
      
      // TODO: experimental - maybe add channel health check?
      // const healthCheck = await checkChannelHealth(channels);
      
      // Auto-select first channel
      if (channels && channels.length > 0) {
        console.log('🎯 Data page: Auto-selecting first channel:', channels[0].channel_id);
        setSelectedChannelId(channels[0].channel_id);
      } else {
        console.log('⚠️ Data page: No channels found for account:', currentOrganization.id);
      }
    } catch (error) {
      console.error('❌ Data page: Error loading channels:', error);
    }
  };

  const checkAndAutoSync = async () => {
    if (!currentOrganization?.id) return;

    try {
      console.log('🔄 Data page: Checking auto sync settings');
      
      const { data: settings } = await supabase
        .from('youtube_settings')
        .select('auto_sync_enabled')
        .eq('account_id', currentOrganization.id)
        .single();

      if (settings?.auto_sync_enabled) {
        console.log('✅ Data page: Auto sync enabled, starting background sync');
        
        const { error: syncError } = await supabase.functions.invoke('youtube-sync', {
          body: { 
            accountId: currentOrganization.id,
            background: true
          }
        });

        if (syncError) {
          console.error('❌ Data page: Auto sync error:', syncError);
        } else {
          console.log('✅ Data page: Auto sync started');
        }
      } else {
        console.log('ℹ️ Data page: Auto sync disabled');
      }
    } catch (error) {
      console.error('❌ Data page: Error checking auto sync:', error);
    }
  };

  const extractHandle = (url: string): string => {
    const handleMatch = url.match(/@([^/?]+)/);
    return handleMatch ? `@${handleMatch[1]}` : url;
  };

  if (loading || !currentOrganization) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-64 bg-muted rounded"></div>
              </div>
              <div className="h-96 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">No Organization</h1>
          <p className="text-muted-foreground">No organization selected</p>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center">
                <BarChart3 className="mr-3 h-8 w-8" />
                Data Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                View performance metrics and insights for your YouTube content
              </p>
            </div>
          </div>
          
          <div className="text-center py-12">
            <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No YouTube Channels Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your YouTube channel to start viewing analytics and performance data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const selectedChannel = channels.find(c => c.channel_id === selectedChannelId) || channels[0];

  return (
    <div className="p-6">
      {/* TEMP: Debug component */}
      {/* <PageDebugger pageName="Data" data={{ channels, selectedChannelId, loading }} showMetrics /> */}
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <BarChart3 className="mr-3 h-8 w-8" />
            Data Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            View performance metrics and insights for your YouTube content
          </p>
          
          {/* Channel Selector */}
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium">Channel:</label>
            <Select value={selectedChannelId || ""} onValueChange={setSelectedChannelId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a channel" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((channel) => (
                  <SelectItem key={channel.channel_id} value={channel.channel_id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{channel.channel_title}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        {extractHandle(channel.channel_url)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        {selectedChannel && (
          <div className="space-y-6">
            {/* YouTube Channel Data Cards - Now horizontal at the top */}
            <YouTubeChannelDataCards 
              channelId={selectedChannel.channel_id}
              accountId={currentOrganization.id}
            />
            
            {/* Summary & Videos */}
            <div className="space-y-6">
              <YouTubeDataSummary 
                channelId={selectedChannel.channel_id}
                accountId={currentOrganization.id}
              />
              
              <YouTubeVideosTable 
                channelId={selectedChannel.channel_id}
                accountId={currentOrganization.id}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}