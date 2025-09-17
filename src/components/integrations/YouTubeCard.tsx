import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Youtube, Play, RefreshCw } from "lucide-react";

interface YouTubeCardProps {
  onRefresh: () => void;
}

export const YouTubeCard = ({ onRefresh }: YouTubeCardProps) => {
  const [publicLookupOpen, setPublicLookupOpen] = useState(false);
  const [publicChannelInput, setPublicChannelInput] = useState("");
  const [publicResults, setPublicResults] = useState<any[]>([]);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const { toast } = useToast();

  const handlePublicLookup = async () => {
    if (!publicChannelInput.trim()) return;

    setIsLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('youtube-public-lookup', {
        body: { channelInput: publicChannelInput.trim() }
      });

      if (error) throw error;

      setPublicResults(data.videos || []);
      
      toast({
        title: "Public Data Loaded",
        description: `Found ${data.videos?.length || 0} recent videos`
      });

    } catch (error: any) {
      console.error('Public lookup error:', error);
      toast({
        title: "Lookup Failed",
        description: error.message || "Failed to fetch public data",
        variant: "destructive"
      });
    } finally {
      setIsLookingUp(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          YouTube Public Lookup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use public lookup to get quick stats for any YouTube channel using the YouTube Data API v3.
        </p>

        <Dialog open={publicLookupOpen} onOpenChange={setPublicLookupOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <Play className="h-4 w-4 mr-2" />
              Lookup Channel Data
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>YouTube Public Lookup</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-input">Channel URL, Handle, or ID</Label>
                <Input
                  id="channel-input"
                  placeholder="@mychannel, https://youtube.com/@mychannel, or UC..."
                  value={publicChannelInput}
                  onChange={(e) => setPublicChannelInput(e.target.value)}
                />
              </div>
              <Button 
                onClick={handlePublicLookup} 
                disabled={isLookingUp}
                className="w-full"
              >
                {isLookingUp ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Fetch Public Data
              </Button>
              
              {publicResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Recent Videos</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {publicResults.map((video, idx) => (
                      <div key={idx} className="p-2 border rounded text-sm">
                        <div className="font-medium truncate">{video.title}</div>
                        <div className="text-muted-foreground">
                          Views: {video.view_count?.toLocaleString() || 'N/A'} • 
                          Likes: {video.like_count?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};