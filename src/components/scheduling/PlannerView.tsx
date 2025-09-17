import { useState, useMemo } from "react";
import { Wand2, Calendar, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

interface ContentVideo {
  id: string;
  internal_title: string;
  video_number: number;
  video_type: string;
  en_publication_date: string | null;
  es_publication_date: string | null;
  en_main_title: string | null;
  es_main_title: string | null;
  en_status: string | null;
  es_status: string | null;
  topic_id: string | null;
  topics?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface SchedulingPreferences {
  en: {
    daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
    frequency: number; // posts per week
    formatMix: 'balanced' | 'long-form' | 'short-form';
    selectedTopics: string[];
  };
  es: {
    daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
    frequency: number; // posts per week
    formatMix: 'balanced' | 'long-form' | 'short-form';
    selectedTopics: string[];
  };
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
}

interface PlannerViewProps {
  channel: YouTubeChannel;
}

export function PlannerView({ channel }: PlannerViewProps) {
  const { user } = useAuth();
  const { canSchedule } = usePermissions();
  const [generatedSchedule, setGeneratedSchedule] = useState<Record<string, { date: Date; language: 'en' | 'es' }>>({});
  
  const [preferences, setPreferences] = useState<SchedulingPreferences>({
    en: {
      daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      frequency: 3,
      formatMix: 'balanced',
      selectedTopics: []
    },
    es: {
      daysOfWeek: [2, 4, 6], // Tue, Thu, Sat
      frequency: 3,
      formatMix: 'balanced',
      selectedTopics: []
    }
  });

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['content-videos-unpublished', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
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
          en_status,
          es_status,
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

  const { data: topics = [] } = useQuery({
    queryKey: ['topics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: accounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (!accounts?.id) return [];

      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('account_id', accounts.id)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const unpublishedVideos = useMemo(() => {
    return videos.filter(video => {
      // Check if video has unpublished versions (draft or unlisted) for the specific language
      const statusField = channel.language === 'en' ? 'en_status' : 'es_status';
      const publicationField = channel.language === 'en' ? 'en_publication_date' : 'es_publication_date';
      return (video[statusField] === 'draft' || video[statusField] === 'unlisted') && !video[publicationField];
    });
  }, [videos, channel.language]);

  const generateSchedule = () => {
    const schedule: Record<string, { date: Date; language: 'en' | 'es' }> = {};
    const startDate = new Date();
    
    // Schedule videos for the specific language
    const languageVideos = unpublishedVideos.filter(video => {
      const statusField = channel.language === 'en' ? 'en_status' : 'es_status';
      const publicationField = channel.language === 'en' ? 'en_publication_date' : 'es_publication_date';
      const hasUnpublished = (video[statusField] === 'draft' || video[statusField] === 'unlisted') && !video[publicationField];
      if (!hasUnpublished) return false;
      
      // Apply language-specific preferences
      const langPreferences = preferences[channel.language as 'en' | 'es'];
      if (langPreferences.selectedTopics.length > 0) {
        if (!video.topic_id || !langPreferences.selectedTopics.includes(video.topic_id)) {
          return false;
        }
      }
      
      // Apply format mix filter
      if (langPreferences.formatMix !== 'balanced') {
        const targetFormat = langPreferences.formatMix === 'long-form' ? 'long-form' : 'short-form';
        if (video.video_type !== targetFormat) return false;
      }
      
      return true;
    });
    
    // Schedule videos for the specific language
    let videoIndex = 0;
    let weekCount = 0;
    let postsThisWeek = 0;
    let currentDate = new Date(startDate);
    const langPreferences = preferences[channel.language as 'en' | 'es'];
    
    while (videoIndex < languageVideos.length && weekCount < 52) {
      const dayOfWeek = currentDate.getDay();
      
      if (langPreferences.daysOfWeek.includes(dayOfWeek) && postsThisWeek < langPreferences.frequency) {
        const video = languageVideos[videoIndex];
        
        schedule[video.id] = {
          date: new Date(currentDate),
          language: channel.language as 'en' | 'es'
        };
        
        videoIndex++;
        postsThisWeek++;
      }
      
      currentDate = addDays(currentDate, 1);
      
      // Reset weekly counter on Sunday
      if (currentDate.getDay() === 0) {
        postsThisWeek = 0;
        weekCount++;
      }
    }

    setGeneratedSchedule(schedule);
    toast.success(`Generated schedule for ${Object.keys(schedule).length} ${channel.language === 'en' ? 'English' : 'Spanish'} videos`);
  };

  const clearSchedule = () => {
    setGeneratedSchedule({});
    toast.info("Schedule cleared");
  };

  const saveSchedule = async () => {
    try {
      const updates = Object.entries(generatedSchedule).map(([videoId, scheduleInfo]) => {
        const updateData: any = { id: videoId };
        
        if (scheduleInfo.language === 'en') {
          updateData.en_publication_date = scheduleInfo.date.toISOString();
        } else {
          updateData.es_publication_date = scheduleInfo.date.toISOString();
        }
        
        return updateData;
      });

      for (const update of updates) {
        const { error } = await supabase
          .from('content_videos')
          .update(update)
          .eq('id', update.id);
          
        if (error) throw error;
      }

      toast.success("Schedule saved successfully!");
      setGeneratedSchedule({});
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error("Failed to save schedule");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading unpublished videos...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Scheduling Preferences - Hidden for viewers */}
      {canSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Auto-Scheduling Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Channel Settings */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 px-2 text-xs">{channel.language.toUpperCase()}</Badge>
                <h3 className="text-lg font-semibold">{channel.language === 'en' ? 'English' : 'Spanish'} Channel</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Publishing Days</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <div key={day} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${channel.language}-day-${index}`}
                          checked={preferences[channel.language as 'en' | 'es'].daysOfWeek.includes(index)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPreferences(prev => ({
                                ...prev,
                                [channel.language]: {
                                  ...prev[channel.language as 'en' | 'es'],
                                  daysOfWeek: [...prev[channel.language as 'en' | 'es'].daysOfWeek, index]
                                }
                              }));
                            } else {
                              setPreferences(prev => ({
                                ...prev,
                                [channel.language]: {
                                  ...prev[channel.language as 'en' | 'es'],
                                  daysOfWeek: prev[channel.language as 'en' | 'es'].daysOfWeek.filter(d => d !== index)
                                }
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`${channel.language}-day-${index}`} className="text-sm">{day}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`${channel.language}-frequency`}>Posts per Week</Label>
                  <Input
                    id={`${channel.language}-frequency`}
                    type="number"
                    min="1"
                    max="7"
                    value={preferences[channel.language as 'en' | 'es'].frequency}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      [channel.language]: {
                        ...prev[channel.language as 'en' | 'es'],
                        frequency: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Format Mix</Label>
                  <Select
                    value={preferences[channel.language as 'en' | 'es'].formatMix}
                    onValueChange={(value: 'balanced' | 'long-form' | 'short-form') => 
                      setPreferences(prev => ({ 
                        ...prev, 
                        [channel.language]: { ...prev[channel.language as 'en' | 'es'], formatMix: value }
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="long-form">Long-form only</SelectItem>
                      <SelectItem value="short-form">Short-form only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Topics (optional)</Label>
                  <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                    {topics.map(topic => (
                      <div key={topic.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${channel.language}-topic-${topic.id}`}
                          checked={preferences[channel.language as 'en' | 'es'].selectedTopics.includes(topic.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setPreferences(prev => ({
                                ...prev,
                                [channel.language]: {
                                  ...prev[channel.language as 'en' | 'es'],
                                  selectedTopics: [...prev[channel.language as 'en' | 'es'].selectedTopics, topic.id]
                                }
                              }));
                            } else {
                              setPreferences(prev => ({
                                ...prev,
                                [channel.language]: {
                                  ...prev[channel.language as 'en' | 'es'],
                                  selectedTopics: prev[channel.language as 'en' | 'es'].selectedTopics.filter(t => t !== topic.id)
                                }
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`${channel.language}-topic-${topic.id}`} className="text-sm">{topic.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={generateSchedule}>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate Schedule
              </Button>
              {Object.keys(generatedSchedule).length > 0 && (
                <>
                  <Button variant="outline" onClick={clearSchedule}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear Schedule
                  </Button>
                  <Button variant="default" onClick={saveSchedule}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Schedule
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Unpublished Videos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Unpublished Videos ({unpublishedVideos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {unpublishedVideos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No unpublished videos found matching your filters.
              </div>
            ) : (
              unpublishedVideos.map(video => {
                const hasUnpublishedEn = video.en_status === 'draft' && !video.en_publication_date;
                const hasUnpublishedEs = video.es_status === 'draft' && !video.es_publication_date;
                const schedule = generatedSchedule[video.id];
                
                return (
                  <div key={video.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">#{video.video_number}</span>
                      <div>
                        <div className="font-medium">{video.internal_title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {video.video_type === 'long-form' ? 'Long' : 'Short'}
                          </Badge>
                          {hasUnpublishedEn && (
                            <Badge variant="secondary">EN Draft</Badge>
                          )}
                          {hasUnpublishedEs && (
                            <Badge variant="secondary">ES Draft</Badge>
                          )}
                          {video.topics && (
                            <Badge 
                              variant="outline" 
                              style={{ 
                                borderColor: video.topics.color,
                                color: video.topics.color 
                              }}
                            >
                              {video.topics.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {schedule && (
                        <div className="text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4 inline mr-1" />
                          {format(schedule.date, 'MMM d, yyyy')} ({schedule.language.toUpperCase()})
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}