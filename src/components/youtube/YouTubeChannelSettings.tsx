import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface YouTubeChannelSettingsProps {
  accountId: string;
}

export function YouTubeChannelSettings({ accountId }: YouTubeChannelSettingsProps) {
  const [enChannelUrl, setEnChannelUrl] = useState("");
  const [esChannelUrl, setEsChannelUrl] = useState("");
  const [refreshMode, setRefreshMode] = useState("auto");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
    loadChannels();
  }, [accountId]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('youtube_settings')
        .select('*')
        .eq('account_id', accountId)
        .maybeSingle();

      if (data) {
        setRefreshMode(data.refresh_mode);
        setAutoSyncEnabled(data.auto_sync_enabled);
      }
    } catch (error) {
      console.error('Error loading YouTube settings:', error);
    }
  };

  const loadChannels = async () => {
    try {
      const { data } = await supabase
        .from('youtube_channels')
        .select('*')
        .eq('account_id', accountId);

      if (data) {
        const enChannel = data.find(c => c.language === 'en');
        const esChannel = data.find(c => c.language === 'es');
        
        if (enChannel) setEnChannelUrl(enChannel.channel_url);
        if (esChannel) setEsChannelUrl(esChannel.channel_url);
      }
    } catch (error) {
      console.error('Error loading YouTube channels:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Save settings
      await supabase
        .from('youtube_settings')
        .upsert({
          account_id: accountId,
          refresh_mode: refreshMode,
          auto_sync_enabled: autoSyncEnabled,
        }, {
          onConflict: 'account_id'
        });

      // Save channels if URLs are provided
      const channelsToSave = [];
      
      if (enChannelUrl.trim()) {
        const result = await fetchChannelIdFromAPI(enChannelUrl.trim());
        if (!result.channelId) {
          throw new Error(`Could not resolve English channel ID: ${result.error || 'Unknown error'}`);
        }
        channelsToSave.push({
          account_id: accountId,
          channel_url: enChannelUrl.trim(),
          language: 'en',
          channel_id: result.channelId,
        });
      }
      
      if (esChannelUrl.trim()) {
        const result = await fetchChannelIdFromAPI(esChannelUrl.trim());
        if (!result.channelId) {
          throw new Error(`Could not resolve Spanish channel ID: ${result.error || 'Unknown error'}`);
        }
        channelsToSave.push({
          account_id: accountId,
          channel_url: esChannelUrl.trim(),
          language: 'es',
          channel_id: result.channelId,
        });
      }

      if (channelsToSave.length > 0) {
        // With the new constraint (one channel per language per account), 
        // we need to delete existing channels for each language before inserting new ones
        for (const channel of channelsToSave) {
          // Delete existing channel for this language
          await supabase
            .from('youtube_channels')
            .delete()
            .eq('account_id', channel.account_id)
            .eq('language', channel.language);
          
          // Insert the new channel
          await supabase
            .from('youtube_channels')
            .insert(channel);
        }
      }

      toast({
        title: "Settings saved",
        description: "YouTube channel settings have been updated successfully. Any existing channels for the same language have been replaced. Channel IDs resolved via YouTube API.",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelIdFromAPI = async (channelUrl: string): Promise<{ channelId: string | null; error?: string }> => {
    try {
      // console.log('Calling youtube-channel-id-lookup with:', channelUrl);
      
      const { data, error } = await supabase.functions.invoke('youtube-channel-id-lookup', {
        body: { channelInput: channelUrl }
      });

      // console.log('Supabase function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        return { channelId: null, error: `Function call failed: ${error.message || JSON.stringify(error)}` };
      }

      if (data?.error) {
        console.error('API error from function:', data.error);
        return { channelId: null, error: `YouTube API error: ${data.error}` };
      }

      if (!data?.channel?.id) {
        console.error('No channel ID in response:', data);
        return { channelId: null, error: 'No channel ID found in API response' };
      }

      // console.log('Successfully resolved channel ID:', data.channel.id);
      return { channelId: data.channel.id };
    } catch (error) {
      console.error('Error fetching channel ID from API:', error);
      return { channelId: null, error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>YouTube Channel Settings</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure your YouTube channels for data tracking. You can have one English channel and one Spanish channel. Channel IDs will be automatically resolved using the YouTube API.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channel URLs */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="en-channel-url">English Channel URL</Label>
            <Input
              id="en-channel-url"
              placeholder="https://www.youtube.com/@yourchannel"
              value={enChannelUrl}
              onChange={(e) => setEnChannelUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your English YouTube channel URL. Changing this will replace your existing English channel (supports @handle, /channel/ID, /c/name formats)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="es-channel-url">Spanish Channel URL</Label>
            <Input
              id="es-channel-url"
              placeholder="https://www.youtube.com/@yourchannel-es"
              value={esChannelUrl}
              onChange={(e) => setEsChannelUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Enter your Spanish YouTube channel URL. Changing this will replace your existing Spanish channel (optional, supports @handle, /channel/ID, /c/name formats)
            </p>
          </div>
        </div>

        {/* Refresh Settings */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Data Refresh Mode</Label>
            <Select value={refreshMode} onValueChange={setRefreshMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-refresh on page load</SelectItem>
                <SelectItem value="manual">Manual refresh with cache</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how often to fetch fresh data from YouTube
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Sync Enabled</Label>
              <p className="text-xs text-muted-foreground">
                Automatically sync video stats when opening Data tab
              </p>
            </div>
            <Switch
              checked={autoSyncEnabled}
              onCheckedChange={setAutoSyncEnabled}
            />
          </div>
        </div>

        <Button onClick={saveSettings} disabled={loading}>
          {loading ? "Resolving Channel IDs & Saving..." : "Save YouTube Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}