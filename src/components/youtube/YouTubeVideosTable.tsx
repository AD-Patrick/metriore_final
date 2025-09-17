import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, RefreshCw, Search, ArrowUpDown, Link as LinkIcon, CheckCircle, Unlink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoLinkingModal } from "@/components/video-linking/VideoLinkingModal";

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
}

interface YouTubeVideosTableProps {
  accountId: string;
  channelId: string;
}

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  published_at: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration_seconds: number | null;
  is_short?: boolean | null;
  topic_id: string | null;
  last_synced_at: string | null;
  content_video_id?: string | null;
  channel_id: string;
  account_id: string;
}

interface Topic {
  id: string;
  name: string;
  color: string;
}

export function YouTubeVideosTable({ accountId, channelId }: YouTubeVideosTableProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [channelInfo, setChannelInfo] = useState<YouTubeChannel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"long-form" | "shorts">("long-form");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"published_at" | "view_count" | "like_count" | "comment_count">("published_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [itemsPerPage] = useState(20);
  const [linkingModalOpen, setLinkingModalOpen] = useState(false);
  const [linkingVideo, setLinkingVideo] = useState<YouTubeVideo | null>(null);
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const { toast } = useToast();

  // TODO: this component is getting big, maybe split it?
  console.log('YouTubeVideosTable loaded for channel:', channelId, '🎬');

  // Function to validate and clean up orphaned content_video_id references
  // TODO: optimize queries
  const validateContentVideoReferences = async (videosWithContentId: YouTubeVideo[]) => {
    try {
      const contentVideoIds = videosWithContentId.map(v => v.content_video_id).filter(Boolean);
      
      if (contentVideoIds.length === 0) return;
      
      console.log('Validating refs:', contentVideoIds.length, 'videos 🎬');
      
      // Check if these content videos exist in the current organization
      const { data: existingContentVideos, error } = await supabase
        .from('content_videos')
        .select('id, internal_title, en_main_title, es_main_title')
        .eq('account_id', accountId)
        .in('id', contentVideoIds);
      
      if (error) {
        console.error('Error checking refs:', error, '🦆');
        return;
      }
      
      const existingIds = new Set(existingContentVideos?.map(cv => cv.id) || []);
      const orphanedVideos = videosWithContentId.filter(v => 
        v.content_video_id && !existingIds.has(v.content_video_id)
      );
      
      // Also check for videos that are linked but shouldn't be (contextual mismatch)
      const contextuallyMismatchedVideos = videosWithContentId.filter(video => {
        if (!video.content_video_id) return false;
        
        const contentVideo = existingContentVideos?.find(cv => cv.id === video.content_video_id);
        if (!contentVideo) return false;
        
        // Check if the YouTube video title has any similarity to the content video titles
        const youtubeTitle = video.title.toLowerCase();
        const contentEnTitle = contentVideo.en_main_title?.toLowerCase() || '';
        const contentEsTitle = contentVideo.es_main_title?.toLowerCase() || '';
        const contentInternalTitle = contentVideo.internal_title?.toLowerCase() || '';
        
        // If there's no meaningful similarity, it's likely a wrong link
        const hasSimilarity = 
          youtubeTitle.includes(contentEnTitle) || contentEnTitle.includes(youtubeTitle) ||
          youtubeTitle.includes(contentEsTitle) || contentEsTitle.includes(youtubeTitle) ||
          youtubeTitle.includes(contentInternalTitle) || contentInternalTitle.includes(youtubeTitle);
        
        return !hasSimilarity;
      });
      
      const allVideosToUnlink = [...orphanedVideos, ...contextuallyMismatchedVideos];
      
      if (allVideosToUnlink.length > 0) {
        // Clean up all videos that need unlinking
        const videoIdsToUnlink = allVideosToUnlink.map(v => v.id);
        
        const { error: updateError } = await supabase
          .from('youtube_videos')
          .update({ content_video_id: null })
          .in('id', videoIdsToUnlink);
        
        if (updateError) {
          console.error('Error cleaning up video references:', updateError);
        } else {
          // Reload data to reflect the changes
          loadData();
        }
      }
    } catch (error) {
      console.error('Error validating content video references:', error);
    }
  };

  const handleUnlinkVideo = async (video: YouTubeVideo) => {
    if (!video.content_video_id) return;
    
    try {
      // Remove links from both directions
      await Promise.all([
        // Update youtube_videos table
        supabase
          .from('youtube_videos')
          .update({ content_video_id: null })
          .eq('id', video.id),
        
        // Update content_videos table - remove both EN and ES links
        supabase
          .from('content_videos')
          .update({ 
            en_youtube_link: null,
            es_youtube_link: null
          })
          .eq('id', video.content_video_id)
      ]);

      toast({
        title: "Success",
        description: "Video unlinked successfully",
      });

      loadData();
    } catch (error) {
      console.error('Error unlinking video:', error);
      toast({
        title: "Error",
        description: "Failed to unlink video",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId, channelId]);

  // TODO: this function name is confusing, should be loadVideos or something
  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading videos... this might take a sec 🐌');
      console.log('Params:', { accountId, channelId });

      // First, let's check if there are any videos at all for this account
      const { data: allVideos, error: allVideosError } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('account_id', accountId);
      

      // Load videos, topics, and channel info in parallel
      const [videosResult, topicsResult, channelResult] = await Promise.all([
        supabase
          .from('youtube_videos')
          .select('*')
          .eq('account_id', accountId)
          .eq('channel_id', channelId),
        supabase
          .from('topics')
          .select('id, name, color')
          .eq('account_id', accountId),
        supabase
          .from('youtube_channels')
          .select('id, channel_id, channel_title, channel_url, language, subscriber_count, view_count, video_count')
          .eq('account_id', accountId)
          .eq('channel_id', channelId)
          .maybeSingle()
      ]);

      if (videosResult.data) {
        // Check for orphaned content_video_id references
        const videosWithContentId = videosResult.data.filter(v => v.content_video_id);
        if (videosWithContentId.length > 0) {
          await validateContentVideoReferences(videosWithContentId);
        }
        
        setVideos(videosResult.data);
      }
      
      if (topicsResult.data) {
        setTopics(topicsResult.data);
      }
      
      if (channelResult.data) {
        setChannelInfo(channelResult.data);
      }

    } catch (error) {
      console.error('Error loading YouTube data:', error);
      toast({
        title: "Error",
        description: "Failed to load YouTube data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    try {
      setRefreshing(true);
      
      // Call the sync function
      const { error } = await supabase.functions.invoke('youtube-sync', {
        body: { accountId }
      });

      if (error) throw error;
      
      // Reload data
      await loadData();
      
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

  // Filter videos based on search term only (for tab counts)
  const searchFilteredVideos = videos.filter(video => {
    return video.title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Filter videos based on search term and tab selection
  const filteredVideos = searchFilteredVideos.filter(video => {
    // Use the is_short field if available (from URL detection), otherwise fall back to duration
    const isShort = video.is_short !== null && video.is_short !== undefined 
      ? video.is_short 
      : video.duration_seconds && video.duration_seconds <= 60;
    
    const matchesTab = activeTab === "shorts" ? isShort : !isShort;
    return matchesTab;
  });

  // Sort videos
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case "view_count":
        aValue = a.view_count || 0;
        bValue = b.view_count || 0;
        break;
      case "like_count":
        aValue = a.like_count || 0;
        bValue = b.like_count || 0;
        break;
      case "comment_count":
        aValue = a.comment_count || 0;
        bValue = b.comment_count || 0;
        break;
      case "published_at":
      default:
        aValue = new Date(a.published_at || 0).getTime();
        bValue = new Date(b.published_at || 0).getTime();
        break;
    }
    
    return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
  });

  // Pagination
  const totalPages = Math.ceil(sortedVideos.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVideos = sortedVideos.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "desc" ? "asc" : "desc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "long-form" | "shorts");
    setCurrentPage(1);
  };

  const getTopicBadge = (topicId: string | null) => {
    if (!topicId) return null;
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return null;

    return (
      <Badge 
        variant="secondary" 
        style={{ 
          backgroundColor: `${topic.color}20`,
          color: topic.color,
          borderColor: `${topic.color}40`
        }}
      >
        {topic.name}
      </Badge>
    );
  };

  const formatNumber = (num: number) => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toLocaleString();
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>YouTube Videos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex space-x-4">
                <div className="w-24 h-16 bg-muted rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              YouTube Videos
              {channelInfo && (
                <span className="text-lg font-normal text-muted-foreground">
                  - @{extractHandle(channelInfo.channel_url)} ({channelInfo.channel_title})
                </span>
              )}
            </CardTitle>
            {channelInfo && (
              <div className="flex items-center gap-6 mt-2 text-sm text-muted-foreground">
                <span>{formatNumber(channelInfo.subscriber_count)} subscribers</span>
                <span>•</span>
                <span>{formatNumber(channelInfo.view_count)} total views</span>
                <span>•</span>
                <span>{channelInfo.video_count} videos</span>
                <span>•</span>
                <span className="capitalize">{channelInfo.language === 'en' ? 'English' : 'Spanish'}</span>
              </div>
            )}
          </div>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={sortBy} onValueChange={(value) => handleSort(value as typeof sortBy)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published_at">Published Date</SelectItem>
              <SelectItem value="view_count">Views</SelectItem>
              <SelectItem value="like_count">Likes</SelectItem>
              <SelectItem value="comment_count">Comments</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSort(sortBy)}
            className="gap-2"
          >
            <ArrowUpDown className="h-4 w-4" />
            {sortOrder === "desc" ? "↓" : "↑"}
          </Button>
        </div>

        {/* Tabs for Video Types */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="long-form">Long-form Videos ({searchFilteredVideos.filter(v => {
              const isShort = v.is_short !== null && v.is_short !== undefined 
                ? v.is_short 
                : v.duration_seconds && v.duration_seconds <= 60;
              return !isShort;
            }).length})</TabsTrigger>
            <TabsTrigger value="shorts">Shorts ({searchFilteredVideos.filter(v => {
              const isShort = v.is_short !== null && v.is_short !== undefined 
                ? v.is_short 
                : v.duration_seconds && v.duration_seconds <= 60;
              return isShort;
            }).length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {/* Videos List */}
            <div className="space-y-4">
              {paginatedVideos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {videos.length === 0 ? (
                    <>
                      <p>No YouTube videos found.</p>
                      <p className="text-sm">Add your channel URLs in Settings to start tracking performance.</p>
                    </>
                  ) : (
                    <p>No {activeTab === "shorts" ? "shorts" : "long-form videos"} match your current filters.</p>
                  )}
                </div>
              ) : (
                paginatedVideos.map(video => (
                  <div key={video.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-24 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-24 h-16 bg-muted rounded flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-2">
                            {video.title}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                            <span>Published: {formatDate(video.published_at)}</span>
                            <span>•</span>
                            <span>{formatNumber(video.view_count)} views</span>
                            <span>•</span>
                            <span>{formatNumber(video.like_count)} likes</span>
                            <span>•</span>
                            <span>{formatNumber(video.comment_count)} comments</span>
                            {video.duration_seconds && (
                              <>
                                <span>•</span>
                                <span>{Math.floor(video.duration_seconds / 60)}:{(video.duration_seconds % 60).toString().padStart(2, '0')}</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {getTopicBadge(video.topic_id)}
                            {video.last_synced_at && (
                              <span className="text-xs text-muted-foreground">
                                Updated: {formatDate(video.last_synced_at)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant={
                              video.content_video_id 
                                ? (hoveredButton === video.id ? "delete" : "default")
                                : "outline"
                            }
                            size="sm"
                            onClick={() => {
                              if (video.content_video_id) {
                                handleUnlinkVideo(video);
                              } else {
                                setLinkingVideo(video);
                                setLinkingModalOpen(true);
                              }
                            }}
                            onMouseEnter={() => video.content_video_id && setHoveredButton(video.id)}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="gap-1"
                          >
                            {video.content_video_id ? (
                              hoveredButton === video.id ? (
                                <>
                                  <Unlink className="h-3 w-3" />
                                  Unlink
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  Linked
                                </>
                              )
                            ) : (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                Link
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a
                              href={`https://youtube.com/watch?v=${video.video_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              View
                            </a>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage > 1) setCurrentPage(currentPage - 1);
                        }}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                            }}
                            isActive={currentPage === pageNum}
                            className="cursor-pointer"
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                        }}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
                
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedVideos.length)} of {sortedVideos.length} {activeTab === "shorts" ? "shorts" : "long-form videos"}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Video Linking Modal */}
      <VideoLinkingModal
        open={linkingModalOpen}
        onOpenChange={setLinkingModalOpen}
        mode="youtube-to-content"
        sourceVideo={linkingVideo}
        accountId={accountId}
        onLinkUpdate={loadData}
      />
    </Card>
  );
}