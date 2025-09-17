import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, ExternalLink, Link as LinkIcon, Unlink, CheckCircle, Zap } from "lucide-react";

interface ContentVideo {
  id: string;
  video_number: number;
  internal_title: string;
  code_name?: string;
  video_type: 'long-form' | 'short-form';
  en_main_title?: string;
  es_main_title?: string;
  en_thumbnail_url?: string;
  es_thumbnail_url?: string;
  en_status: string;
  es_status: string;
  en_youtube_link?: string;
  es_youtube_link?: string;
  created_at: string;
}

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url?: string | null;
  published_at?: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds?: number | null;
  is_short?: boolean | null;
  content_video_id?: string | null;
  channel_id: string;
  account_id: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string | null;
  topic_id?: string | null;
}

interface VideoLinkingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'content-to-youtube' | 'youtube-to-content';
  sourceVideo: ContentVideo | YouTubeVideo | null;
  accountId: string;
  onLinkUpdate: () => void;
  language?: 'en' | 'es'; // Language filter for content-to-youtube mode
}

export function VideoLinkingModal({ 
  open, 
  onOpenChange, 
  mode, 
  sourceVideo, 
  accountId,
  onLinkUpdate,
  language
}: VideoLinkingModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [videos, setVideos] = useState<(ContentVideo | YouTubeVideo)[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [autoLinking, setAutoLinking] = useState(false);
  const [channelLanguage, setChannelLanguage] = useState<'en' | 'es'>('en');
  const { toast } = useToast();

  useEffect(() => {
    if (open && sourceVideo) {
      loadVideos();
    }
  }, [open, sourceVideo, mode]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      // For YouTube → Content mode, get the channel language first
      if (mode === 'youtube-to-content' && sourceVideo) {
        const youtubeVideo = sourceVideo as YouTubeVideo;
        const { data: channelData, error: channelError } = await supabase
          .from('youtube_channels')
          .select('language')
          .eq('channel_id', youtubeVideo.channel_id)
          .eq('account_id', accountId)
          .single();

        if (!channelError && channelData) {
          setChannelLanguage(channelData.language as 'en' | 'es');
        }
      }

      if (mode === 'content-to-youtube') {
        // Load YouTube videos for linking from content video, filtered by language
        const { data: channelsData, error: channelsError } = await supabase
          .from('youtube_channels')
          .select('channel_id')
          .eq('account_id', accountId)
          .eq('language', language || 'en');

        if (channelsError) throw channelsError;

        const channelIds = (channelsData || []).map(c => c.channel_id);
        
        if (channelIds.length === 0) {
          setVideos([]);
          return;
        }

        const { data, error } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('account_id', accountId)
          .in('channel_id', channelIds)
          .is('content_video_id', null) // Only show unlinked videos
          .order('published_at', { ascending: false })
          .limit(100); // Limit for performance

        if (error) throw error;
        setVideos(data || []);
      } else {
        // Load content videos for linking from YouTube video
        // Only show content videos that don't already link to this YouTube video
        const { data, error } = await supabase
          .from('content_videos')
          .select('*')
          .eq('account_id', accountId)
          .order('video_number', { ascending: false })
          .limit(100); // Limit for performance

        if (error) throw error;
        
        // Transform data to match interface
        const formattedVideos = (data || []).map(video => ({
          ...video,
          video_type: video.video_type as 'long-form' | 'short-form',
          en_status: video.en_status as string,
          es_status: video.es_status as string,
        }));
        
        setVideos(formattedVideos);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (targetVideo: ContentVideo | YouTubeVideo) => {
    if (!sourceVideo) return;
    
    setLinking(true);
    try {
      if (mode === 'content-to-youtube') {
        const contentVideo = sourceVideo as ContentVideo;
        const youtubeVideo = targetVideo as YouTubeVideo;
        
        // Update both directions
        const updateData: any = {};
        updateData[`${language}_youtube_link`] = `https://youtube.com/watch?v=${youtubeVideo.video_id}`;

        await Promise.all([
          // Update youtube_videos table
          supabase
            .from('youtube_videos')
            .update({ content_video_id: contentVideo.id })
            .eq('id', youtubeVideo.id),
          
          // Update content_videos table based on selected language
          supabase
            .from('content_videos')
            .update(updateData)
            .eq('id', contentVideo.id)
        ]);
        
      } else {
        const youtubeVideo = sourceVideo as YouTubeVideo;
        const contentVideo = targetVideo as ContentVideo;
        
        // Get the channel language to determine which field to update
        const { data: channelData, error: channelError } = await supabase
          .from('youtube_channels')
          .select('language')
          .eq('channel_id', youtubeVideo.channel_id)
          .eq('account_id', accountId)
          .single();

        if (channelError) {
          console.error('Error fetching channel language:', channelError);
          throw channelError;
        }
        
        const channelLanguage = channelData?.language || 'en'; // Default to English if not found
        
        // Update both directions with correct language field
        const updateData: any = {};
        updateData[`${channelLanguage}_youtube_link`] = `https://youtube.com/watch?v=${youtubeVideo.video_id}`;
        
        await Promise.all([
          // Update youtube_videos table
          supabase
            .from('youtube_videos')
            .update({ content_video_id: contentVideo.id })
            .eq('id', youtubeVideo.id),
          
          // Update content_videos table
          supabase
            .from('content_videos')
            .update(updateData)
            .eq('id', contentVideo.id)
        ]);
      }

      toast({
        title: "Success",
        description: "Videos linked successfully",
      });

      onLinkUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error linking videos:', error);
      toast({
        title: "Error",
        description: "Failed to link videos",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (targetVideo: ContentVideo | YouTubeVideo) => {
    if (!sourceVideo) return;
    
    setLinking(true);
    try {
      if (mode === 'content-to-youtube') {
        const youtubeVideo = targetVideo as YouTubeVideo;
        
        // Remove links from both directions
        const updateData: any = {};
        updateData[`${language}_youtube_link`] = null;

        await Promise.all([
          // Update youtube_videos table
          supabase
            .from('youtube_videos')
            .update({ content_video_id: null })
            .eq('id', youtubeVideo.id),
          
          // Update content_videos table for the specific language
          supabase
            .from('content_videos')
            .update(updateData)
            .eq('id', (sourceVideo as ContentVideo).id)
        ]);
        
      } else {
        const youtubeVideo = sourceVideo as YouTubeVideo;
        
        // Remove links from both directions - remove all links when unlinking from YouTube side
        await Promise.all([
          // Update youtube_videos table
          supabase
            .from('youtube_videos')
            .update({ content_video_id: null })
            .eq('id', youtubeVideo.id),
          
          // Update content_videos table - remove both EN and ES links
          supabase
            .from('content_videos')
            .update({ 
              en_youtube_link: null,
              es_youtube_link: null
            })
            .eq('id', (targetVideo as ContentVideo).id)
        ]);
      }

      toast({
        title: "Success",
        description: "Videos unlinked successfully",
      });

      onLinkUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error('Error unlinking videos:', error);
      toast({
        title: "Error",
        description: "Failed to unlink videos",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    if (mode === 'content-to-youtube') {
      const youtubeVideo = video as YouTubeVideo;
      const searchLower = searchTerm.toLowerCase();
      // Determine desired type from the source content video
      const desiredShort = (sourceVideo as ContentVideo)?.video_type === 'short-form';
      // Compute whether the YouTube video is a short, preferring explicit flag, falling back to duration
      const computedIsShort =
        youtubeVideo.is_short !== null && youtubeVideo.is_short !== undefined
          ? youtubeVideo.is_short
          : (youtubeVideo.duration_seconds !== null && youtubeVideo.duration_seconds !== undefined
              ? youtubeVideo.duration_seconds <= 60
              : null);
      // Only include videos that confidently match the desired type
      const matchesType = desiredShort ? computedIsShort === true : computedIsShort === false;

      const matchesSearch =
        youtubeVideo.title.toLowerCase().includes(searchLower) ||
        youtubeVideo.video_id.toLowerCase().includes(searchLower);

      return matchesType && matchesSearch;
    } else {
      const contentVideo = video as ContentVideo;
      const searchLower = searchTerm.toLowerCase();
      return (
        contentVideo.internal_title.toLowerCase().includes(searchLower) ||
        contentVideo.code_name?.toLowerCase().includes(searchLower) ||
        (contentVideo.en_main_title && contentVideo.en_main_title.toLowerCase().includes(searchLower)) ||
        (contentVideo.es_main_title && contentVideo.es_main_title.toLowerCase().includes(searchLower))
      );
    }
  });

  const isLinked = (video: ContentVideo | YouTubeVideo) => {
    if (mode === 'content-to-youtube') {
      const youtubeVideo = video as YouTubeVideo;
      const contentVideo = sourceVideo as ContentVideo;
      
      // Check if this YouTube video is already linked to this content video
      return youtubeVideo.content_video_id === contentVideo.id;
    } else {
      const contentVideo = video as ContentVideo;
      const youtubeVideo = sourceVideo as YouTubeVideo;
      
      // Check if this content video is already linked to this YouTube video
      return contentVideo.en_youtube_link?.includes(youtubeVideo.video_id) || 
             contentVideo.es_youtube_link?.includes(youtubeVideo.video_id);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  // Auto-link function for content-to-youtube mode
  const handleAutoLink = async () => {
    if (mode !== 'content-to-youtube' || !sourceVideo) return;
    
    setAutoLinking(true);
    try {
      const contentVideo = sourceVideo as ContentVideo;
      const languageField = language === 'es' ? 'es_status' : 'en_status';
      const youtubeLinkField = language === 'es' ? 'es_youtube_link' : 'en_youtube_link';

      // Get channel ID for the selected language
      const { data: channelData, error: channelError } = await supabase
        .from('youtube_channels')
        .select('channel_id')
        .eq('account_id', accountId)
        .eq('language', language || 'en')
        .single();

      if (channelError || !channelData) {
        throw new Error('No YouTube channel found for the selected language');
      }

      // Find unlinked YouTube videos for this channel
      const { data: youtubeVideos, error: videosError } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('account_id', accountId)
        .eq('channel_id', channelData.channel_id)
        .is('content_video_id', null)
        .order('published_at', { ascending: false })
        .limit(50);

      if (videosError) throw videosError;

      if (!youtubeVideos || youtubeVideos.length === 0) {
        toast({
          title: "No videos found",
          description: "No unlinked YouTube videos found for auto-linking",
          variant: "destructive",
        });
        return;
      }

      // Find best match using title similarity
      let bestMatch = null;
      let bestScore = 0;
      const contentTitle = language === 'es' ? contentVideo.es_main_title : contentVideo.en_main_title;

      for (const youtubeVideo of youtubeVideos) {
        const similarity = calculateSimilarity(
          contentTitle?.toLowerCase() || '', 
          youtubeVideo.title.toLowerCase()
        );
        
        if (similarity > bestScore && similarity > 0.6) { // Lower threshold for manual auto-link
          bestScore = similarity;
          bestMatch = youtubeVideo;
        }
      }

      if (bestMatch && bestScore > 0.6) {
        // Auto-link with confidence
        await Promise.all([
          supabase
            .from('youtube_videos')
            .update({ content_video_id: contentVideo.id })
            .eq('id', bestMatch.id),
          
          supabase
            .from('content_videos')
            .update({ 
              [youtubeLinkField]: `https://youtube.com/watch?v=${bestMatch.video_id}`
            })
            .eq('id', contentVideo.id)
        ]);

        toast({
          title: "Auto-link successful",
          description: `Linked to "${bestMatch.title}" (${(bestScore * 100).toFixed(0)}% match)`,
        });

        onLinkUpdate();
        onOpenChange(false);
      } else {
        toast({
          title: "No suitable match found",
          description: "No YouTube videos found with sufficient title similarity for auto-linking",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in auto-link:', error);
      toast({
        title: "Auto-link failed",
        description: error instanceof Error ? error.message : "Failed to auto-link videos",
        variant: "destructive",
      });
    } finally {
      setAutoLinking(false);
    }
  };

  // Auto-link function for youtube-to-content mode
  const handleAutoLinkYouTubeToContent = async () => {
    if (mode !== 'youtube-to-content' || !sourceVideo) return;
    
    setAutoLinking(true);
    try {
      const youtubeVideo = sourceVideo as YouTubeVideo;
      
      // First, get the channel information to determine the language
      const { data: channelData, error: channelError } = await supabase
        .from('youtube_channels')
        .select('language')
        .eq('channel_id', youtubeVideo.channel_id)
        .eq('account_id', accountId)
        .single();

      if (channelError) throw channelError;
      
      const channelLanguage = channelData?.language || 'en'; // Default to English if not found
      
      // Get all content videos for this account
      const { data: contentVideos, error: contentError } = await supabase
        .from('content_videos')
        .select('*')
        .eq('account_id', accountId)
        .order('video_number', { ascending: false });

      if (contentError) throw contentError;

      if (!contentVideos || contentVideos.length === 0) {
        toast({
          title: "No content videos found",
          description: "No content videos found for auto-linking",
          variant: "destructive",
        });
        return;
      }

      // Find the best match based on title similarity
      let bestMatch: ContentVideo | null = null;
      let bestScore = 0;

      for (const contentVideo of contentVideos) {
        // Check both English and Spanish titles
        const enTitle = contentVideo.en_main_title;
        const esTitle = contentVideo.es_main_title;
        
        const enSimilarity = enTitle ? calculateSimilarity(
          youtubeVideo.title.toLowerCase(), 
          enTitle.toLowerCase()
        ) : 0;
        
        const esSimilarity = esTitle ? calculateSimilarity(
          youtubeVideo.title.toLowerCase(), 
          esTitle.toLowerCase()
        ) : 0;
        
        const maxSimilarity = Math.max(enSimilarity, esSimilarity);
        
        if (maxSimilarity > bestScore && maxSimilarity > 0.6) { // Lower threshold for manual auto-link
          bestScore = maxSimilarity;
          bestMatch = {
            ...contentVideo,
            video_type: contentVideo.video_type as 'long-form' | 'short-form',
            en_status: contentVideo.en_status as string,
            es_status: contentVideo.es_status as string,
          };
        }
      }

      if (bestMatch && bestScore > 0.6) {
        // Auto-link with confidence - use the correct language field
        const updateData: any = {};
        updateData[`${channelLanguage}_youtube_link`] = `https://youtube.com/watch?v=${youtubeVideo.video_id}`;
        
        await Promise.all([
          supabase
            .from('youtube_videos')
            .update({ content_video_id: bestMatch.id })
            .eq('id', youtubeVideo.id),
          
          supabase
            .from('content_videos')
            .update(updateData)
            .eq('id', bestMatch.id)
        ]);

        const matchedTitle = channelLanguage === 'en' 
          ? bestMatch.en_main_title || bestMatch.internal_title
          : bestMatch.es_main_title || bestMatch.internal_title;
          
        toast({
          title: "Auto-link successful",
          description: `Linked to "${matchedTitle}" (${channelLanguage.toUpperCase()}, ${(bestScore * 100).toFixed(0)}% match)`,
        });

        onLinkUpdate();
        onOpenChange(false);
      } else {
        toast({
          title: "No suitable match found",
          description: "No content videos found with sufficient title similarity for auto-linking",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error in auto-link:', error);
      toast({
        title: "Auto-link failed",
        description: error instanceof Error ? error.message : "Failed to auto-link videos",
        variant: "destructive",
      });
    } finally {
      setAutoLinking(false);
    }
  };

  // Simple string similarity calculation (Jaccard similarity)
  const calculateSimilarity = (str1: string, str2: string): number => {
    if (!str1 || !str2) return 0;
    
    const words1 = new Set(str1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(str2.split(/\s+/).filter(w => w.length > 2));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'content-to-youtube' 
              ? `Link to ${language?.toUpperCase()} YouTube Video` 
              : 'Link to Content Video'
            }
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col flex-1 min-h-0">
          {/* Source video info */}
          <div className="bg-muted/30 p-4 rounded-lg mb-4">
            <h3 className="font-medium mb-2">
              {mode === 'content-to-youtube' 
                ? `Content Video (${language?.toUpperCase()} version):` 
                : 'YouTube Video:'
              }
            </h3>
            <div className="flex gap-3">
              {mode === 'content-to-youtube' ? (
                <>
                  <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                    <span className="text-xs">#{(sourceVideo as ContentVideo)?.video_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{(sourceVideo as ContentVideo)?.internal_title}</div>
                    <div className="text-sm text-muted-foreground">
                      {(sourceVideo as ContentVideo)?.en_main_title || (sourceVideo as ContentVideo)?.es_main_title}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <img
                    src={(sourceVideo as YouTubeVideo)?.thumbnail_url || ''}
                    alt="YouTube thumbnail"
                    className="w-16 h-10 object-cover rounded"
                  />
                  <div>
                    <div className="font-medium">{(sourceVideo as YouTubeVideo)?.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatNumber((sourceVideo as YouTubeVideo)?.view_count || 0)} views
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search and Auto-link */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={mode === 'content-to-youtube' 
                  ? `Search ${language?.toUpperCase()} YouTube videos...` 
                  : "Search content videos..."
                }
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={mode === 'content-to-youtube' ? handleAutoLink : handleAutoLinkYouTubeToContent}
              disabled={autoLinking || linking}
              className="gap-2"
            >
              <Zap className="h-4 w-4" />
              {autoLinking ? 'Auto-linking...' : 'Auto-link'}
            </Button>
          </div>

          {/* Videos list */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3 p-3 rounded-lg border">
                    <div className="w-16 h-10 bg-muted rounded"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              filteredVideos.map((video) => {
                const linked = isLinked(video);
                
                return (
                  <div 
                    key={video.id} 
                    className={`flex gap-3 p-3 rounded-lg border transition-colors ${
                      linked ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {mode === 'content-to-youtube' ? (
                        <img
                          src={(video as YouTubeVideo).thumbnail_url || ''}
                          alt="YouTube thumbnail"
                          className="w-16 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                          <span className="text-xs">#{(video as ContentVideo).video_number}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm line-clamp-2 mb-1">
                            {mode === 'content-to-youtube' 
                              ? (video as YouTubeVideo).title
                              : (video as ContentVideo).internal_title
                            }
                          </h4>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {mode === 'content-to-youtube' ? (
                              <>
                                <span>{formatDate((video as YouTubeVideo).published_at)}</span>
                                <span>•</span>
                                <span>{formatNumber((video as YouTubeVideo).view_count)} views</span>
                                <span>•</span>
                                <span>{formatNumber((video as YouTubeVideo).like_count)} likes</span>
                                {(video as YouTubeVideo).is_short && (
                                  <>
                                    <span>•</span>
                                    <Badge variant="outline" className="text-xs">Short</Badge>
                                  </>
                                )}
                              </>
                            ) : (
                              <>
                                <span>Type: {(video as ContentVideo).video_type}</span>
                                <span>•</span>
                                <span>EN: {(video as ContentVideo).en_status}</span>
                                <span>•</span>
                                <span>ES: {(video as ContentVideo).es_status}</span>
                              </>
                            )}
                          </div>

                          {mode === 'youtube-to-content' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {channelLanguage === 'en' 
                                ? (video as ContentVideo).en_main_title || (video as ContentVideo).es_main_title
                                : (video as ContentVideo).es_main_title || (video as ContentVideo).en_main_title
                              }
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {linked && (
                            <CheckCircle className="h-4 w-4 text-primary" />
                          )}
                          
                          {mode === 'content-to-youtube' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                            >
                              <a
                                href={`https://youtube.com/watch?v=${(video as YouTubeVideo).video_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}

                          <Button
                            variant={linked ? "outline" : "default"}
                            size="sm"
                            onClick={() => linked ? handleUnlink(video) : handleLink(video)}
                            disabled={linking}
                            className="gap-1"
                          >
                            {linked ? (
                              <>
                                <Unlink className="h-3 w-3" />
                                Unlink
                              </>
                            ) : (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                Link
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {!loading && filteredVideos.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No available videos found.</p>
                {searchTerm ? (
                  <p className="text-sm">Try adjusting your search term.</p>
                ) : mode === 'content-to-youtube' ? (
                  <p className="text-sm">All YouTube videos are already linked or no videos match the selected language.</p>
                ) : (
                  <p className="text-sm">All content videos are already linked to this YouTube video.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}