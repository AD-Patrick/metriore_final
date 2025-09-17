import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Save, X, Trash2 } from "lucide-react";

interface ContentVideo {
  id: string;
  video_number: number;
  internal_title: string;
  code_name?: string;
  video_type: 'long-form' | 'short-form';
  topic_id?: string;
  
  // English version
  en_main_title?: string;
  en_alternative_titles: string[];
  en_script?: string;
  en_thumbnail_url?: string;
  en_status: 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published';
  en_publication_date?: string;
  en_youtube_link?: string;
  
  // Spanish version
  es_main_title?: string;
  es_alternative_titles: string[];
  es_script?: string;
  es_thumbnail_url?: string;
  es_status: 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published';
  es_publication_date?: string;
  es_youtube_link?: string;
  
  created_at: string;
  updated_at: string;
  account_id: string;
}

interface Topic {
  id: string;
  name: string;
  color: string;
}

interface ContentTableEditorProps {
  video: ContentVideo;
  topics: Topic[];
  editingData: Partial<ContentVideo>;
  setEditingData: (data: Partial<ContentVideo>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
  onThumbnailUpload: (event: React.ChangeEvent<HTMLInputElement>, language: 'en' | 'es') => void;
  thumbnailPreviews: { en: string | null; es: string | null };
  removeThumbnailPreview: (language: 'en' | 'es') => void;
  uploadingThumbnails: { en: boolean; es: boolean };
}

const videoTypes = [
  { value: 'long-form', label: 'Long-form' },
  { value: 'short-form', label: 'Short-form' },
];

export const ContentTableEditor = ({
  video,
  topics,
  editingData,
  setEditingData,
  onSave,
  onCancel,
  onDelete,
  onThumbnailUpload,
  thumbnailPreviews,
  removeThumbnailPreview,
  uploadingThumbnails,
}: ContentTableEditorProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Video - {video.internal_title}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4 pb-4 border-b">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Internal Title</Label>
                  <Input 
                    value={editingData.internal_title || ''} 
                    onChange={(e) => setEditingData({...editingData, internal_title: e.target.value})}
                    placeholder="Internal working title..."
                  />
                </div>
                <div>
                  <Label>Code Name</Label>
                  <Input 
                    value={editingData.code_name || ''} 
                    onChange={(e) => setEditingData({...editingData, code_name: e.target.value})}
                    placeholder="Project code name..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Video Type</Label>
                  <Select
                    value={editingData.video_type || ''}
                    onValueChange={(value: 'long-form' | 'short-form') => setEditingData({...editingData, video_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {videoTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Topic</Label>
                  <Select
                    value={editingData.topic_id || 'none'}
                    onValueChange={(value) => setEditingData({...editingData, topic_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Topic</SelectItem>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: topic.color }}
                            />
                            {topic.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Language Versions - Side by Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* English Version */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <div className="w-6 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">EN</span>
                  </div>
                  <h3 className="text-lg font-semibold">English Version</h3>
                </div>
                
                <div>
                  <Label>Main Title</Label>
                  <Input 
                    value={editingData.en_main_title || ''} 
                    onChange={(e) => setEditingData({...editingData, en_main_title: e.target.value})}
                    placeholder="Main public title in English"
                  />
                </div>
                
                <div>
                  <Label>Thumbnail</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onThumbnailUpload(e, 'en')}
                      className="cursor-pointer"
                      disabled={uploadingThumbnails.en}
                    />
                    {(thumbnailPreviews.en || editingData.en_thumbnail_url) && (
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <img
                          src={thumbnailPreviews.en || editingData.en_thumbnail_url || ''}
                          alt="English thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                         <Button
                           variant="delete"
                           size="sm"
                           className="absolute top-2 right-2"
                           onClick={() => removeThumbnailPreview('en')}
                         >
                           <Trash2 className="h-3 w-3" />
                         </Button>
                      </div>
                    )}
                    {uploadingThumbnails.en && (
                      <div className="text-sm text-muted-foreground">Uploading...</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Script</Label>
                  <Textarea 
                    value={editingData.en_script || ''} 
                    onChange={(e) => setEditingData({...editingData, en_script: e.target.value})}
                    placeholder="Video script in English"
                    rows={6}
                    className="resize-none"
                  />
                </div>

                 <div>
                   <Label>Publication Date</Label>
                   <Input 
                     type="date"
                     value={editingData.en_publication_date ? new Date(editingData.en_publication_date).toISOString().split('T')[0] : ''} 
                     onChange={(e) => setEditingData({...editingData, en_publication_date: e.target.value ? new Date(e.target.value).toISOString() : null})}
                   />
                 </div>
                 
                 <div>
                   <Label>Status</Label>
                    <Select
                      value={editingData.en_status || ''}
                      onValueChange={(value) => setEditingData({...editingData, en_status: value as 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">💡 Idea</SelectItem>
                        <SelectItem value="scripted">📝 Scripted</SelectItem>
                        <SelectItem value="recorded">🎥 Recorded</SelectItem>
                        <SelectItem value="edited">✂️ Edited</SelectItem>
                        <SelectItem value="unlisted">🔒 Unlisted</SelectItem>
                        <SelectItem value="published">✅ Published</SelectItem>
                      </SelectContent>
                    </Select>
                 </div>
              </div>

              {/* Spanish Version */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b">
                  <div className="w-6 h-4 bg-red-500 rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-bold">ES</span>
                  </div>
                  <h3 className="text-lg font-semibold">Spanish Version</h3>
                </div>
                
                <div>
                  <Label>Main Title</Label>
                  <Input 
                    value={editingData.es_main_title || ''} 
                    onChange={(e) => setEditingData({...editingData, es_main_title: e.target.value})}
                    placeholder="Main public title in Spanish"
                  />
                </div>
                
                <div>
                  <Label>Thumbnail</Label>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onThumbnailUpload(e, 'es')}
                      className="cursor-pointer"
                      disabled={uploadingThumbnails.es}
                    />
                    {(thumbnailPreviews.es || editingData.es_thumbnail_url) && (
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <img
                          src={thumbnailPreviews.es || editingData.es_thumbnail_url || ''}
                          alt="Spanish thumbnail preview"
                          className="w-full h-full object-cover"
                        />
                         <Button
                           variant="delete"
                           size="sm"
                           className="absolute top-2 right-2"
                           onClick={() => removeThumbnailPreview('es')}
                         >
                           <Trash2 className="h-3 w-3" />
                         </Button>
                      </div>
                    )}
                    {uploadingThumbnails.es && (
                      <div className="text-sm text-muted-foreground">Uploading...</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label>Script</Label>
                  <Textarea 
                    value={editingData.es_script || ''} 
                    onChange={(e) => setEditingData({...editingData, es_script: e.target.value})}
                    placeholder="Video script in Spanish"
                    rows={6}
                    className="resize-none"
                  />
                </div>

                <div>
                  <Label>Publication Date</Label>
                  <Input 
                    type="date"
                    value={editingData.es_publication_date ? new Date(editingData.es_publication_date).toISOString().split('T')[0] : ''} 
                    onChange={(e) => setEditingData({...editingData, es_publication_date: e.target.value ? new Date(e.target.value).toISOString() : null})}
                  />
                </div>
                
                <div>
                  <Label>Status</Label>
                    <Select
                      value={editingData.es_status || ''}
                      onValueChange={(value) => setEditingData({...editingData, es_status: value as 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published'})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">💡 Idea</SelectItem>
                        <SelectItem value="scripted">📝 Scripted</SelectItem>
                        <SelectItem value="recorded">🎥 Recorded</SelectItem>
                        <SelectItem value="edited">✂️ Edited</SelectItem>
                        <SelectItem value="unlisted">🔒 Unlisted</SelectItem>
                        <SelectItem value="published">✅ Published</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="delete"
              onClick={() => {
                if (confirm('Are you sure you want to delete this video?')) {
                  onDelete(video.id);
                  setDialogOpen(false);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Video
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => { onCancel(); setDialogOpen(false); }}>
                Cancel
              </Button>
              <Button onClick={() => { onSave(); setDialogOpen(false); }}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Button
        size="sm"
        variant="outline"
        onClick={() => setDialogOpen(true)}
      >
        Edit
      </Button>
    </>
  );
};