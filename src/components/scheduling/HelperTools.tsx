import { useState } from "react";
import { Calendar, Target, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { addWeeks, addMonths, format, differenceInDays } from "date-fns";

interface ContentGapAnalysis {
  totalNeeded: number;
  availableDrafts: number;
  shortfall: number;
  breakdown: {
    topic: string;
    topicColor: string;
    longForm: { needed: number; available: number };
    shortForm: { needed: number; available: number };
    language: { needed: number; available: number };
  }[];
}

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
}

interface HelperToolsProps {
  channel: YouTubeChannel;
}

export function HelperTools({ channel }: HelperToolsProps) {
  const { user } = useAuth();
  const { canSchedule } = usePermissions();
  const [targetPeriod, setTargetPeriod] = useState("3-months");
  const [customEndDate, setCustomEndDate] = useState("");
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [analysis, setAnalysis] = useState<ContentGapAnalysis | null>(null);

  const { data: videos = [] } = useQuery({
    queryKey: ['content-videos-analysis', user?.id],
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
          en_status,
          es_status,
          topic_id
        `)
        .eq('account_id', accounts.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: topics = [] } = useQuery({
    queryKey: ['topics-analysis', user?.id],
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

  const calculateTargetDate = () => {
    const now = new Date();
    switch (targetPeriod) {
      case "1-month":
        return addMonths(now, 1);
      case "3-months":
        return addMonths(now, 3);
      case "6-months":
        return addMonths(now, 6);
      case "custom":
        return customEndDate ? new Date(customEndDate) : addMonths(now, 3);
      default:
        return addMonths(now, 3);
    }
  };

  const analyzeContentGap = () => {
    const targetDate = calculateTargetDate();
    const daysUntilTarget = differenceInDays(targetDate, new Date());
    const weeksUntilTarget = Math.ceil(daysUntilTarget / 7);
    const totalNeeded = weeksUntilTarget * postsPerWeek;

    // Count available drafts for the specific language
    const availableDrafts = videos.filter(video => {
      const statusField = channel.language === 'en' ? 'en_status' : 'es_status';
      const publicationField = channel.language === 'en' ? 'en_publication_date' : 'es_publication_date';
      return (video[statusField] === 'draft' || video[statusField] === 'unlisted') && !video[publicationField];
    }).length;

    // Create breakdown by topic
    const topicBreakdown = topics.map(topic => {
      const topicVideos = videos.filter(v => v.topic_id === topic.id);
      const topicDrafts = topicVideos.filter(video => {
        const statusField = channel.language === 'en' ? 'en_status' : 'es_status';
        const publicationField = channel.language === 'en' ? 'en_publication_date' : 'es_publication_date';
        return (video[statusField] === 'draft' || video[statusField] === 'unlisted') && !video[publicationField];
      });

      // Estimate needed per topic (equal distribution)
      const neededPerTopic = Math.ceil(totalNeeded / topics.length);
      
      // Calculate long-form and short-form needs
      const longFormNeeded = Math.ceil(neededPerTopic * 0.6); // Assume 60% long-form
      const shortFormNeeded = Math.ceil(neededPerTopic * 0.4); // Assume 40% short-form
      
      // Count available by type
      const longFormAvailable = topicDrafts.filter(v => v.video_type === 'long-form').length;
      const shortFormAvailable = topicDrafts.filter(v => v.video_type === 'short-form').length;
      
      return {
        topic: topic.name,
        topicColor: topic.color,
        longForm: {
          needed: longFormNeeded,
          available: longFormAvailable
        },
        shortForm: {
          needed: shortFormNeeded,
          available: shortFormAvailable
        },
        language: {
          needed: longFormNeeded + shortFormNeeded, // Sum of long-form + short-form
          available: longFormAvailable + shortFormAvailable // Sum of available
        }
      };
    });

    const newAnalysis: ContentGapAnalysis = {
      totalNeeded,
      availableDrafts,
      shortfall: Math.max(0, totalNeeded - availableDrafts),
      breakdown: topicBreakdown
    };

    setAnalysis(newAnalysis);
  };

  // Don't render Content Gap Analysis for viewers
  if (!canSchedule) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Content Gap Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Target Period</Label>
            <Select value={targetPeriod} onValueChange={setTargetPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-month">1 Month</SelectItem>
                <SelectItem value="3-months">3 Months</SelectItem>
                <SelectItem value="6-months">6 Months</SelectItem>
                <SelectItem value="custom">Custom Date</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {targetPeriod === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customDate">End Date</Label>
              <Input
                id="customDate"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="postsPerWeek">Posts per Week</Label>
            <Input
              id="postsPerWeek"
              type="number"
              min="1"
              max="14"
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(parseInt(e.target.value) || 1)}
            />
          </div>
        </div>

        <Button onClick={analyzeContentGap} className="w-full">
          <BarChart3 className="h-4 w-4 mr-2" />
          Analyze Content Gap
        </Button>

        {/* Results */}
        {analysis && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{analysis.totalNeeded}</div>
                  <div className="text-sm text-muted-foreground">Total Needed</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Until {format(calculateTargetDate(), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{analysis.availableDrafts}</div>
                  <div className="text-sm text-muted-foreground">Available Drafts</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 text-center">
                  <div className={`text-2xl font-bold ${analysis.shortfall > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {analysis.shortfall > 0 ? `+${analysis.shortfall}` : '✓'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {analysis.shortfall > 0 ? 'Need to Create' : 'Ready to Go'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Topic Breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold">Breakdown by Topic</h3>
              {analysis.breakdown.map((topic, index) => (
                <Card key={index}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: topic.topicColor }}
                        />
                        <span className="font-medium">{topic.topic}</span>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Long:</span>
                          <span className="font-medium">{topic.longForm.available}/{topic.longForm.needed}</span>
                          {topic.longForm.available < topic.longForm.needed && (
                            <Badge variant="destructive" className="h-4 px-1 text-xs">
                              +{topic.longForm.needed - topic.longForm.available}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Short:</span>
                          <span className="font-medium">{topic.shortForm.available}/{topic.shortForm.needed}</span>
                          {topic.shortForm.available < topic.shortForm.needed && (
                            <Badge variant="destructive" className="h-4 px-1 text-xs">
                              +{topic.shortForm.needed - topic.shortForm.available}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">Total:</span>
                          <span className="font-medium">{topic.language.available}/{topic.language.needed}</span>
                          {topic.language.available < topic.language.needed && (
                            <Badge variant="destructive" className="h-4 px-1 text-xs">
                              +{topic.language.needed - topic.language.available}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Action Items */}
            {analysis.shortfall > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Recommended Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div>• Create {analysis.shortfall} more video drafts to meet your target</div>
                    <div>• Focus on topics and formats showing red badges above</div>
                    <div>• Consider adjusting your posting frequency or target date</div>
                    <div>• Use the Planner View to auto-schedule existing drafts first</div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}