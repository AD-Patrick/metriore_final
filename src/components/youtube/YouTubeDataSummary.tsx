import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedCard, EnhancedCardContent, EnhancedCardHeader, EnhancedCardTitle } from "@/components/ui/enhanced-card";
import { Heart, Trophy, Tag, Calendar, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface YouTubeDataSummaryProps {
  accountId: string;
  channelId: string;
}

interface SummaryStats {
  engagementRate: number;
  topVideoViews: number;
  topVideoTitle: string;
  topicCoverage: number;
  contentVelocity: number;
  changes?: {
    engagementRate: number;
    topVideoViews: number;
    topicCoverage: number;
    contentVelocity: number;
  };
}

type Duration = '28d' | '6m' | '1y' | 'total';

export function YouTubeDataSummary({ accountId, channelId }: YouTubeDataSummaryProps) {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [duration, setDuration] = useState<Duration>('total');

  useEffect(() => {
    loadSummaryStats();
  }, [accountId, channelId, duration]);

  const getDateFilter = (duration: Duration, isPrevious = false) => {
    const now = new Date();
    const multiplier = isPrevious ? 2 : 1;
    
    // FIXME: dates messy
    switch (duration) {
      case '28d':
        const days28 = 28 * 24 * 60 * 60 * 1000;
        return {
          start: new Date(now.getTime() - days28 * multiplier),
          end: new Date(now.getTime() - days28 * (multiplier - 1))
        };
      case '6m':
        return {
          start: new Date(now.getFullYear(), now.getMonth() - 6 * multiplier, now.getDate()),
          end: new Date(now.getFullYear(), now.getMonth() - 6 * (multiplier - 1), now.getDate())
        };
      case '1y':
        return {
          start: new Date(now.getFullYear() - 1 * multiplier, now.getMonth(), now.getDate()),
          end: new Date(now.getFullYear() - 1 * (multiplier - 1), now.getMonth(), now.getDate())
        };
      case 'total':
        return null;
    }
  };

  // TODO: rename this function to something better
  const loadSummaryStats = async () => {
    try {
      setLoading(true);
      
      console.log('Loading stats:', channelId, '📊');
      
      // TODO: maybe cache this data?

      // Get video data for the selected channel
      const { data: allVideos } = await supabase
        .from('youtube_videos')
        .select('view_count, topic_id, like_count, comment_count, title, published_at')
        .eq('account_id', accountId)
        .eq('channel_id', channelId);

      // Filter videos by duration
      const dateFilter = getDateFilter(duration);
      const videos = dateFilter 
        ? allVideos?.filter(video => 
            video.published_at && new Date(video.published_at) >= dateFilter.start
          ) || []
        : allVideos || [];

      // Get previous period data for comparison (only if not 'total')
      let previousVideos: typeof videos = [];
      if (duration !== 'total') {
        const previousDateFilter = getDateFilter(duration, true);
        if (previousDateFilter) {
          previousVideos = allVideos?.filter(video => 
            video.published_at && 
            new Date(video.published_at) >= previousDateFilter.start &&
            new Date(video.published_at) < previousDateFilter.end
          ) || [];
        }
      }

      if (!videos || videos.length === 0) {
        setStats({
          engagementRate: 0,
          topVideoViews: 0,
          topVideoTitle: 'No videos',
          topicCoverage: 0,
          contentVelocity: 0,
        });
        return;
      }

      // Helper function to calculate metrics for a video set
      const calculateMetrics = (videoSet: typeof videos) => {
        if (videoSet.length === 0) return {
          engagementRate: 0,
          topVideoViews: 0,
          topVideoTitle: 'No videos',
          topicCoverage: 0,
          contentVelocity: 0
        };

        const engagementRate = videoSet.reduce((sum, video) => {
          const engagement = (video.like_count || 0) + (video.comment_count || 0);
          const views = video.view_count || 1;
          return sum + (engagement / views) * 100;
        }, 0) / videoSet.length;

        const topVideo = videoSet.reduce((max, video) => 
          (video.view_count || 0) > (max.view_count || 0) ? video : max
        );

        const topicCoverage = (videoSet.filter(v => v.topic_id).length / videoSet.length) * 100;

        const publishedDates = videoSet
          .map(v => v.published_at)
          .filter(Boolean)
          .map(date => new Date(date!));
        
        let contentVelocity = 0;
        if (publishedDates.length > 0) {
          const oldestDate = new Date(Math.min(...publishedDates.map(d => d.getTime())));
          const newestDate = new Date(Math.max(...publishedDates.map(d => d.getTime())));
          const monthsDiff = (newestDate.getFullYear() - oldestDate.getFullYear()) * 12 + 
                            (newestDate.getMonth() - oldestDate.getMonth()) + 1;
          contentVelocity = videoSet.length / Math.max(monthsDiff, 1);
        }

        return {
          engagementRate: Math.round(engagementRate * 100) / 100,
          topVideoViews: topVideo.view_count || 0,
          topVideoTitle: topVideo.title || 'Unknown',
          topicCoverage: Math.round(topicCoverage),
          contentVelocity: Math.round(contentVelocity * 10) / 10
        };
      };

      // Calculate current period metrics
      const currentMetrics = calculateMetrics(videos);
      
      // Calculate previous period metrics and percentage changes
      let changes;
      if (duration !== 'total' && previousVideos.length > 0) {
        const previousMetrics = calculateMetrics(previousVideos);
        
        const calculatePercentageChange = (current: number, previous: number) => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return Math.round(((current - previous) / previous) * 100);
        };

        changes = {
          engagementRate: calculatePercentageChange(currentMetrics.engagementRate, previousMetrics.engagementRate),
          topVideoViews: calculatePercentageChange(currentMetrics.topVideoViews, previousMetrics.topVideoViews),
          topicCoverage: calculatePercentageChange(currentMetrics.topicCoverage, previousMetrics.topicCoverage),
          contentVelocity: calculatePercentageChange(currentMetrics.contentVelocity, previousMetrics.contentVelocity)
        };
      }

      setStats({
        ...currentMetrics,
        changes
      });

    } catch (error) {
      console.error('Error loading summary stats:', error);
    } finally {
      setLoading(false);
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

  const getChangeIndicator = (change: number | undefined) => {
    if (change === undefined) return null;
    const isPositive = change > 0;
    const isNeutral = change === 0;
    return (
      <Badge 
        variant={isNeutral ? "outline" : isPositive ? "default" : "destructive"}
        className="text-xs ml-2"
      >
        {isPositive ? '+' : ''}{change}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <EnhancedCard variant="glass">
        <EnhancedCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg"></div>
              </div>
            ))}
          </div>
        </EnhancedCardContent>
      </EnhancedCard>
    );
  }

  if (!stats) return null;

  return (
    <EnhancedCard variant="enhanced">
      <EnhancedCardHeader className="px-1 pt-1 pb-1">
        <div className="flex items-center justify-between">
          <EnhancedCardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Performance Overview
          </EnhancedCardTitle>
          <div className="flex gap-1">
            {(['28d', '6m', '1y', 'total'] as Duration[]).map((d) => (
              <Badge
                key={d}
                variant={duration === d ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setDuration(d)}
              >
                {d === '28d' ? '28d' : d === '6m' ? '6m' : d === '1y' ? '1y' : 'All'}
              </Badge>
            ))}
          </div>
        </div>
      </EnhancedCardHeader>
      <EnhancedCardContent className="px-1 pb-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <StatCard
              variant="primary"
              title="Engagement Rate"
              value={`${stats.engagementRate}%`}
              description="Likes + comments per view"
              icon={Heart}
            />
            {getChangeIndicator(stats.changes?.engagementRate) && (
              <div className="absolute top-2 right-2">
                {getChangeIndicator(stats.changes?.engagementRate)}
              </div>
            )}
          </div>

          <div className="relative">
            <StatCard
              variant="secondary"
              title="Top Video"
              value={formatNumber(stats.topVideoViews)}
              description={stats.topVideoTitle.length > 30 ? 
                `${stats.topVideoTitle.substring(0, 30)}...` : 
                stats.topVideoTitle}
              icon={Trophy}
            />
            {getChangeIndicator(stats.changes?.topVideoViews) && (
              <div className="absolute top-2 right-2">
                {getChangeIndicator(stats.changes?.topVideoViews)}
              </div>
            )}
          </div>

          {/* Topic Coverage card commented out as requested */}
          {/* <div className="relative">
            <StatCard
              variant="accent"
              title="Topic Coverage"
              value={`${stats.topicCoverage}%`}
              description="Videos with topics assigned"
              icon={Tag}
            />
            {getChangeIndicator(stats.changes?.topicCoverage) && (
              <div className="absolute top-2 right-2">
                {getChangeIndicator(stats.changes?.topicCoverage)}
              </div>
            )}
          </div> */}

          <div className="relative">
            <StatCard
              variant="success"
              title="Content Velocity"
              value={`${stats.contentVelocity}/month`}
              description="Average publishing rate"
              icon={Calendar}
            />
            {getChangeIndicator(stats.changes?.contentVelocity) && (
              <div className="absolute top-2 right-2">
                {getChangeIndicator(stats.changes?.contentVelocity)}
              </div>
            )}
          </div>
        </div>
      </EnhancedCardContent>
    </EnhancedCard>
  );
}