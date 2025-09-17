import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Palette } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useOrganization } from "@/components/OrganizationProvider";
import { usePermissions } from "@/hooks/usePermissions";

interface Topic {
  id: string;
  name: string;
  keywords: string[];
  color: string;
  account_id: string;
}

const colorOptions = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#f43f5e'
];

export function TopicManager() {
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicColor, setNewTopicColor] = useState(colorOptions[0]);
  const [newTopicKeywords, setNewTopicKeywords] = useState("");

  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();
  const { canEdit, canCreate, canDelete } = usePermissions();

  // TODO: maybe add topic analytics later?
  console.log('TopicManager loaded 🏷️');


  // Fetch topics
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["topics", currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      
      const { data, error } = await supabase
        .from("topics")
        .select("*")
        .eq("account_id", currentOrganization.id)
        .order("name");

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization?.id,
  });

  // Create topic mutation
  const createTopicMutation = useMutation({
    mutationFn: async (newTopic: { name: string; color: string; keywords: string[] }) => {
      const { data, error } = await supabase
        .from("topics")
        .insert({
          account_id: currentOrganization!.id,
          name: newTopic.name,
          color: newTopic.color,
          keywords: newTopic.keywords,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", currentOrganization?.id] });
      setIsCreateOpen(false);
      setNewTopicName("");
      setNewTopicColor(colorOptions[0]);
      setNewTopicKeywords("");
      toast({
        title: "Topic Created",
        description: "Topic has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create topic. Please try again.",
      });
    },
  });

  // Update topic mutation
  const updateTopicMutation = useMutation({
    mutationFn: async (topic: Topic) => {
      const { data, error } = await supabase
        .from("topics")
        .update({
          name: topic.name,
          color: topic.color,
          keywords: topic.keywords,
        })
        .eq("id", topic.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", currentOrganization?.id] });
      setEditingTopic(null);
      toast({
        title: "Topic Updated",
        description: "Topic has been updated successfully.",
      });
    },
  });

  // Delete topic mutation
  const deleteTopicMutation = useMutation({
    mutationFn: async (topicId: string) => {
      const { error } = await supabase
        .from("topics")
        .delete()
        .eq("id", topicId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics", currentOrganization?.id] });
      toast({
        title: "Topic Deleted",
        description: "Topic has been deleted successfully.",
      });
    },
  });

  const handleCreateTopic = () => {
    if (!newTopicName.trim() || !currentOrganization) return;

    createTopicMutation.mutate({
      name: newTopicName.trim(),
      color: newTopicColor,
      keywords: newTopicKeywords.split(',').map(k => k.trim()).filter(k => k),
    });
  };

  const handleUpdateTopic = () => {
    if (!editingTopic) return;
    updateTopicMutation.mutate(editingTopic);
  };

  if (isLoading || !currentOrganization) {
    return <div>Loading topics...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Topics</CardTitle>
          {canCreate && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Topic</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topic-name">Topic Name</Label>
                  <Input
                    id="topic-name"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Enter topic name..."
                  />
                </div>
                <div>
                  <Label>Color</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTopicColor === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTopicColor(color)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={newTopicKeywords}
                    onChange={(e) => setNewTopicKeywords(e.target.value)}
                    placeholder="keyword1, keyword2, keyword3..."
                  />
                </div>
                <Button onClick={handleCreateTopic} className="w-full">
                  Create Topic
                </Button>
              </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topics.length === 0 ? (
            <p className="text-muted-foreground text-sm">No topics created yet.</p>
          ) : (
            topics.map((topic) => (
              <div key={topic.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: topic.color }}
                  />
                  <div>
                    <div className="font-medium">{topic.name}</div>
                    {topic.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {topic.keywords.slice(0, 3).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                        {topic.keywords.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{topic.keywords.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTopic(topic)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTopicMutation.mutate(topic.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit Topic Dialog */}
        {canEdit && (
          <Dialog open={!!editingTopic} onOpenChange={() => setEditingTopic(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Topic</DialogTitle>
              </DialogHeader>
              {editingTopic && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-topic-name">Topic Name</Label>
                    <Input
                      id="edit-topic-name"
                      value={editingTopic.name}
                      onChange={(e) => setEditingTopic({
                        ...editingTopic,
                        name: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          className={`w-8 h-8 rounded-full border-2 ${
                            editingTopic.color === color ? 'border-foreground' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setEditingTopic({
                            ...editingTopic,
                            color
                          })}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="edit-keywords">Keywords (comma-separated)</Label>
                    <Input
                      id="edit-keywords"
                      value={editingTopic.keywords.join(', ')}
                      onChange={(e) => setEditingTopic({
                        ...editingTopic,
                        keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                      })}
                    />
                  </div>
                  <Button onClick={handleUpdateTopic} className="w-full">
                    Update Topic
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}