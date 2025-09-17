import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Eye, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

interface ContentVideo {
  id: string;
  internal_title: string;
  video_number: number;
  video_type: string;
  en_publication_date: string | null;
  es_publication_date: string | null;
  en_main_title: string | null;
  es_main_title: string | null;
  topic_id: string | null;
  topics?: {
    name: string;
    color: string;
  } | null;
}

interface VideoWithLanguage extends ContentVideo {
  language: 'en' | 'es';
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
}

interface CalendarViewProps {
  channel: YouTubeChannel;
}

export function CalendarView({ channel }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { user } = useAuth();

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['content-videos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // First get the user's account
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (!accounts?.id) return [];

      const { data, error } = await supabase
        .from('content_videos')
        .select(`
          id,
          internal_title,
          video_number,
          video_type,
          en_publication_date,
          es_publication_date,
          en_main_title,
          es_main_title,
          topic_id
        `)
        .eq('account_id', accounts.id)
        .order('video_number', { ascending: true });

      if (error) throw error;
      
      // Fetch topics separately if we have videos with topic_ids
      const topicIds = [...new Set(data?.filter(v => v.topic_id).map(v => v.topic_id))];
      let topicsMap: Record<string, any> = {};
      
      if (topicIds.length > 0) {
        const { data: topicsData } = await supabase
          .from('topics')
          .select('id, name, color')
          .in('id', topicIds);
          
        if (topicsData) {
          topicsMap = topicsData.reduce((acc, topic) => {
            acc[topic.id] = topic;
            return acc;
          }, {} as Record<string, any>);
        }
      }
      
      // Combine videos with their topics
      const videosWithTopics = data?.map(video => ({
        ...video,
        topics: video.topic_id ? topicsMap[video.topic_id] : null
      }));
      
      return videosWithTopics || [];
    },
    enabled: !!user?.id,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const publishedVideos = useMemo(() => {
    const videosByDate: Record<string, VideoWithLanguage[]> = {};
    
    videos.forEach(video => {
      // Check publication date for the specific language
      const publicationDate = channel.language === 'en' ? video.en_publication_date : video.es_publication_date;
      if (publicationDate) {
        const dateKey = format(new Date(publicationDate), 'yyyy-MM-dd');
        if (!videosByDate[dateKey]) videosByDate[dateKey] = [];
        videosByDate[dateKey].push({ ...video, language: channel.language as 'en' | 'es' });
      }
    });
    
    return videosByDate;
  }, [videos, channel.language]);

  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));

  const getVideoTitle = (video: VideoWithLanguage) => {
    const title = channel.language === 'en' ? video.en_main_title : video.es_main_title;
    return title || video.internal_title;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading calendar...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Publication Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[150px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Header row */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
          {calendarDays.map(day => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayVideos = publishedVideos[dateKey] || [];
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-1 border border-border ${
                  !isCurrentMonth ? 'bg-muted/20' : ''
                } ${isToday ? 'bg-primary/10 border-primary' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${
                  !isCurrentMonth ? 'text-muted-foreground' : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {dayVideos.map((video, index) => (
                    <div
                      key={`${video.id}-${video.language}-${index}`}
                      className="text-xs p-1 rounded bg-primary/10 border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                      title={getVideoTitle(video)}
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <span className="font-medium">#{video.video_number}</span>
                        <Badge variant="outline" className="h-4 px-1 text-xs">
                          {video.language?.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="h-4 px-1 text-xs">
                          {video.video_type === 'long-form' ? 'Long' : 'Short'}
                        </Badge>
                      </div>
                      <div className="truncate font-medium">
                        {getVideoTitle(video)}
                      </div>
                      {video.topics && (
                        <div className="flex items-center gap-1 mt-1">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: video.topics.color }}
                          />
                          <span className="text-xs text-muted-foreground truncate">
                            {video.topics.name}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-primary/10 border border-primary/20" />
            <span>Published Videos</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-4 px-1 text-xs">EN</Badge>
            <span>English</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="h-4 px-1 text-xs">ES</Badge>
            <span>Spanish</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}