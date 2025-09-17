import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SchedulingTabs } from "@/components/scheduling/SchedulingTabs";
import { HelperTools } from "@/components/scheduling/HelperTools";
import { usePermissions } from "@/hooks/usePermissions";
import { useOrganization } from "@/components/OrganizationProvider";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "lucide-react";

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
}

const Scheduling = () => {
  const [channels, setChannels] = useState<YouTubeChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { canSchedule } = usePermissions();
  const { currentOrganization } = useOrganization();

  useEffect(() => {
    if (currentOrganization?.id) {
      loadChannels();
      setLoading(false);
    }
  }, [currentOrganization]);

  const loadChannels = async () => {
    if (!currentOrganization?.id) return;

    try {
      const { data: channels, error: channelsError } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('account_id', currentOrganization.id);

      if (channelsError) {
        console.log('❌ Scheduling page: Channels error:', channelsError);
        return;
      }

      setChannels(channels || []);
      
      // Auto-select first channel
      if (channels && channels.length > 0) {
        setSelectedChannelId(channels[0].channel_id);
      }
    } catch (error) {
      console.error('❌ Scheduling page: Error loading channels:', error);
    }
  };

  const extractHandle = (url: string): string => {
    const handleMatch = url.match(/@([^/?]+)/);
    return handleMatch ? `@${handleMatch[1]}` : url;
  };

  const selectedChannel = channels.find(c => c.channel_id === selectedChannelId) || channels[0];

  if (loading || !currentOrganization) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-2"></div>
            <div className="h-4 bg-muted rounded w-96 mb-6"></div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <Calendar className="mr-3 h-8 w-8" />
              Scheduling
            </h1>
            <p className="text-muted-foreground mt-1">
              Plan and schedule your video publications
            </p>
          </div>
          
          <div className="text-center py-12">
            <Calendar className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No YouTube Channels Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your YouTube channel to start scheduling content.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Calendar className="mr-3 h-8 w-8" />
            Scheduling
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan and schedule your video publications
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
            <SchedulingTabs channel={selectedChannel} />
            <HelperTools channel={selectedChannel} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduling;