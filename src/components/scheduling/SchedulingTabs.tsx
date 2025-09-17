import { useState } from "react";
import { Calendar, ListPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarView } from "./CalendarView";
import { PlannerView } from "./PlannerView";

interface YouTubeChannel {
  id: string;
  channel_id: string;
  channel_title: string;
  channel_url: string;
  language: string;
}

interface SchedulingTabsProps {
  channel: YouTubeChannel;
}

export function SchedulingTabs({ channel }: SchedulingTabsProps) {
  const [activeTab, setActiveTab] = useState("calendar");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Content Scheduling - {channel.channel_title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="planner" className="flex items-center gap-2">
              <ListPlus className="h-4 w-4" />
              Planner View
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="calendar" className="mt-6">
            <CalendarView channel={channel} />
          </TabsContent>
          
          <TabsContent value="planner" className="mt-6">
            <PlannerView channel={channel} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}