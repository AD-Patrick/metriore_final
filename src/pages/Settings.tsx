import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, Youtube, Calendar, Tag, Users } from "lucide-react";
import { TopicManager } from "@/components/TopicManager";
import { YouTubeChannelSettings } from "@/components/youtube/YouTubeChannelSettings";
import { TeamManager } from "@/components/TeamManager";
import { useOrganization } from "@/components/OrganizationProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [publishingDays, setPublishingDays] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("3");
  const [formatMix, setFormatMix] = useState("balanced");
  const { currentOrganization } = useOrganization();
  const { canViewSettings } = usePermissions();
  const { toast } = useToast();

  if (!canViewSettings) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Access Restricted</h1>
          <p className="text-muted-foreground">
            You don't have permission to view settings. Contact your team administrator for access.
          </p>
        </div>
      </div>
    );
  }


  const days = [
    { id: 'monday', label: 'Monday' },
    { id: 'tuesday', label: 'Tuesday' },
    { id: 'wednesday', label: 'Wednesday' },
    { id: 'thursday', label: 'Thursday' },
    { id: 'friday', label: 'Friday' },
    { id: 'saturday', label: 'Saturday' },
    { id: 'sunday', label: 'Sunday' },
  ];

  const handleDayToggle = (dayId: string) => {
    setPublishingDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  // Load settings on component mount



  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center space-x-2 mb-6">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure your channel and publishing preferences
            </p>
          </div>
        </div>

          <Tabs defaultValue="channel" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="channel" className="flex items-center space-x-2">
                <Youtube className="h-4 w-4" />
                <span>Channel</span>
              </TabsTrigger>
              <TabsTrigger value="scheduling" className="flex items-center space-x-2">
                <Calendar className="h-4 w-4" />
                <span>Scheduling</span>
              </TabsTrigger>
              <TabsTrigger value="topics" className="flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Topics</span>
              </TabsTrigger>
              <TabsTrigger value="team" className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Team</span>
              </TabsTrigger>
            </TabsList>

            {/* Channel Settings */}
            <TabsContent value="channel">
              {currentOrganization && <YouTubeChannelSettings accountId={currentOrganization.id} />}
            </TabsContent>

            {/* Scheduling Defaults */}
            <TabsContent value="scheduling">
              <Card>
                <CardHeader>
                  <CardTitle>Scheduling Defaults</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Set your default publishing schedule and preferences
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Publishing Days */}
                  <div className="space-y-3">
                    <Label>Publishing Days</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {days.map((day) => (
                        <div key={day.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={day.id}
                            checked={publishingDays.includes(day.id)}
                            onCheckedChange={() => handleDayToggle(day.id)}
                          />
                          <Label 
                            htmlFor={day.id} 
                            className="text-sm font-normal cursor-pointer"
                          >
                            {day.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Select the days you typically publish content
                    </p>
                  </div>

                  {/* Publishing Frequency */}
                  <div className="space-y-2">
                    <Label>Publishing Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1x per week</SelectItem>
                        <SelectItem value="2">2x per week</SelectItem>
                        <SelectItem value="3">3x per week</SelectItem>
                        <SelectItem value="4">4x per week</SelectItem>
                        <SelectItem value="5">5x per week</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      How often do you want to publish content?
                    </p>
                  </div>

                  {/* Format Mix Preference */}
                  <div className="space-y-2">
                    <Label>Format Mix Preference</Label>
                    <Select value={formatMix} onValueChange={setFormatMix}>
                      <SelectTrigger className="w-full md:w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long-form">Mostly Long-form</SelectItem>
                        <SelectItem value="balanced">Balanced Mix</SelectItem>
                        <SelectItem value="short-form">Mostly Short-form</SelectItem>
                        <SelectItem value="shorts-only">Shorts Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Your preferred content format distribution
                    </p>
                  </div>


                </CardContent>
              </Card>
            </TabsContent>

            {/* Topics */}
            <TabsContent value="topics">
              <TopicManager />
            </TabsContent>

            {/* Team */}
            <TabsContent value="team">
              <TeamManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
};

export default Settings;