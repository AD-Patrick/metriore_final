import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useOrganization } from "@/components/OrganizationProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Video, 
  FileText, 
  Calendar, 
  Target,
  Upload,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Languages,
  Hash,
  Maximize2,
  Minimize2,
  ThumbsUp,
  MessageCircle,
  Eye,
  Columns,
  Columns2,
  Expand,
  Shrink,
  Save,
  X,
  Link as LinkIcon,
  CheckCircle,
  Unlink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VideoLinkingModal } from "@/components/video-linking/VideoLinkingModal";

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

const videoTypes = [
  { value: 'long-form', label: 'Long-form 📹', color: 'text-primary', bgColor: 'bg-primary/10 border-primary' },
  { value: 'short-form', label: 'Short-form 🎬', color: 'text-xanthous', bgColor: 'bg-xanthous/10 border-xanthous' },
];

const statusOptions = [
  { value: 'idea', label: '💡 Idea', color: 'text-slate-600', bgColor: 'bg-slate-100 border-slate-300' },
  { value: 'scripted', label: '📝 Scripted', color: 'text-blue-600', bgColor: 'bg-blue-100 border-blue-300' },
  { value: 'recorded', label: '🎥 Recorded', color: 'text-purple-600', bgColor: 'bg-purple-100 border-purple-300' },
  { value: 'edited', label: '✂️ Edited', color: 'text-orange-600', bgColor: 'bg-orange-100 border-orange-300' },
  { value: 'unlisted', label: '🔒 Unlisted', color: 'text-yellow-600', bgColor: 'bg-yellow-100 border-yellow-300' },
  { value: 'published', label: '✅ Published', color: 'text-green-600', bgColor: 'bg-green-100 border-green-300' },
];

const Content = () => {
  const [videos, setVideos] = useState<ContentVideo[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [editingVideo, setEditingVideo] = useState<string | null>(null);
  const [editViewMode, setEditViewMode] = useState<'columns' | 'single'>('columns');
  const [editingData, setEditingData] = useState<Partial<ContentVideo>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // TODO: this component is getting huge, need to refactor
  console.log('Content page loaded 📝');
  const [newVideo, setNewVideo] = useState({
    internal_title: "",
    code_name: "",
    video_type: "long-form" as 'long-form' | 'short-form',
    topic_id: "",
    en_main_title: "",
    en_alternative_titles: [] as string[],
    en_script: "",
    en_thumbnail_url: "",
    es_main_title: "",
    es_alternative_titles: [] as string[],
    es_script: "",
    es_thumbnail_url: "",
  });
  
  const [thumbnailPreviews, setThumbnailPreviews] = useState({
    en: null as string | null,
    es: null as string | null,
  });
  
  const [uploadingThumbnails, setUploadingThumbnails] = useState({
    en: false,
    es: false,
  });

  // Separate thumbnail states for editing existing videos
  const [editThumbnailPreviews, setEditThumbnailPreviews] = useState({
    en: null as string | null,
    es: null as string | null,
  });
  
  const [editUploadingThumbnails, setEditUploadingThumbnails] = useState({
    en: false,
    es: false,
  });

  // Video linking modal state
  const [linkingModalOpen, setLinkingModalOpen] = useState(false);
  const [linkingVideo, setLinkingVideo] = useState<ContentVideo | null>(null);
  const [linkingLanguage, setLinkingLanguage] = useState<'en' | 'es'>('en');
  
  // Hover state for linked buttons
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const { toast } = useToast();
  const { canEdit, canCreate, canDelete } = usePermissions();

  // Dummy data generation functions
  const generateDummyData = async () => {
    if (!currentOrganization) return;

    try {
      // Fetch all existing topics from the database
      const { data: allTopics, error: topicsError } = await supabase
        .from('topics')
        .select('id')
        .eq('account_id', currentOrganization.id);

      if (topicsError) throw topicsError;

      // Check if there are any topics available
      if (!allTopics || allTopics.length === 0) {
        toast({
          title: "No Topics Available",
          description: "Please create at least one topic before generating dummy data.",
          variant: "destructive",
        });
        return;
      }

      // Word lists for generating titles
      const englishWords = ['science', 'nature', 'music', 'art', 'travel'];
      const spanishWords = ['ciencia', 'naturaleza', 'música', 'arte', 'viaje'];
      
      // Generate random word and number combinations
      const generateRandomTitle = (word: string) => {
        const randomNum = Math.floor(Math.random() * 90) + 10; // 2 digit number 10-99
        return `${word}_${randomNum}`;
      };

      const dummyVideos = [
        {
          internal_title: `TEST_${generateRandomTitle(englishWords[0])}`,
          code_name: `TEST_${englishWords[0].toUpperCase()}-001`,
          video_type: "long-form" as const,
          en_main_title: `TEST_${generateRandomTitle(englishWords[0])}`,
          en_alternative_titles: [`TEST_${englishWords[0]} basics`, `TEST_Learn ${englishWords[0]}`],
          en_script: `Welcome to this comprehensive ${englishWords[0]} tutorial! In this video, we'll explore the fascinating world of ${englishWords[0]} and discover how ${generateRandomTitle(englishWords[0])} can enhance our understanding. We'll cover fundamental concepts, practical applications, and advanced techniques that will help you master this subject.`,
          en_status: "unlisted" as const,
          en_publication_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          es_main_title: `TEST_${generateRandomTitle(spanishWords[0])}`,
          es_alternative_titles: [`TEST_Conceptos básicos de ${spanishWords[0]}`, `TEST_Aprende ${spanishWords[0]}`],
          es_script: `¡Bienvenidos a este tutorial completo de ${spanishWords[0]}! En este video, exploraremos el fascinante mundo de la ${spanishWords[0]} y descubriremos cómo ${generateRandomTitle(spanishWords[0])} puede mejorar nuestra comprensión. Cubriremos conceptos fundamentales, aplicaciones prácticas y técnicas avanzadas que te ayudarán a dominar este tema.`,
          es_status: "unlisted" as const,
        },
        {
          internal_title: `TEST_${generateRandomTitle(englishWords[1])}`,
          code_name: `TEST_${englishWords[1].toUpperCase()}-001`,
          video_type: "short-form" as const,
          en_main_title: `TEST_${generateRandomTitle(englishWords[1])}`,
          en_alternative_titles: [`TEST_${englishWords[1]} insights`, `TEST_Advanced ${englishWords[1]}`],
          en_script: `Here are fascinating insights about ${englishWords[1]} that will change your perspective! From basic principles to complex phenomena, ${generateRandomTitle(englishWords[1])} reveals the intricate patterns and connections that make our world so remarkable.`,
          en_status: "unlisted" as const,
          es_main_title: `TEST_${generateRandomTitle(spanishWords[1])}`,
          es_alternative_titles: [`TEST_Insights de ${spanishWords[1]}`, `TEST_${spanishWords[1]} avanzado`],
          es_script: `¡Aquí tienes insights fascinantes sobre la ${spanishWords[1]} que cambiarán tu perspectiva! Desde principios básicos hasta fenómenos complejos, ${generateRandomTitle(spanishWords[1])} revela los patrones intrincados y conexiones que hacen nuestro mundo tan extraordinario.`,
          es_status: "unlisted" as const,
        },
        {
          internal_title: `TEST_${generateRandomTitle(englishWords[2])}`,
          code_name: `TEST_${englishWords[2].toUpperCase()}-001`,
          video_type: "long-form" as const,
          en_main_title: `TEST_${generateRandomTitle(englishWords[2])}`,
          en_alternative_titles: [`TEST_${englishWords[2]} complete guide`, `TEST_Modern ${englishWords[2]}`],
          en_script: `${englishWords[2]} is one of the most powerful forms of expression available. In this comprehensive guide, we'll explore the fundamentals of ${englishWords[2]} and how ${generateRandomTitle(englishWords[2])} can transform your understanding and appreciation.`,
          en_status: "unlisted" as const,
          en_publication_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          es_main_title: `TEST_${generateRandomTitle(spanishWords[2])}`,
          es_alternative_titles: [`TEST_Guía completa de ${spanishWords[2]}`, `TEST_${spanishWords[2]} moderno`],
          es_script: `La ${spanishWords[2]} es una de las formas de expresión más poderosas disponibles. En esta guía completa, exploraremos los fundamentos de la ${spanishWords[2]} y cómo ${generateRandomTitle(spanishWords[2])} puede transformar tu comprensión y apreciación.`,
          es_status: "unlisted" as const,
        },
        {
          internal_title: `TEST_${generateRandomTitle(englishWords[3])}`,
          code_name: `TEST_${englishWords[3].toUpperCase()}-001`,
          video_type: "long-form" as const,
          en_main_title: `TEST_${generateRandomTitle(englishWords[3])}`,
          en_alternative_titles: [`TEST_${englishWords[3]} tutorial`, `TEST_${englishWords[3]} guide`],
          en_script: `Learn how to create beautiful ${englishWords[3]} using traditional and modern techniques. We'll cover essential principles, creative processes, and how ${generateRandomTitle(englishWords[3])} demonstrates the evolution of artistic expression.`,
          en_status: "unlisted" as const,
          es_main_title: `TEST_${generateRandomTitle(spanishWords[3])}`,
          es_alternative_titles: [`TEST_Tutorial de ${spanishWords[3]}`, `TEST_Guía de ${spanishWords[3]}`],
          es_script: `Aprende cómo crear hermoso ${spanishWords[3]} usando técnicas tradicionales y modernas. Cubriremos principios esenciales, procesos creativos y cómo ${generateRandomTitle(spanishWords[3])} demuestra la evolución de la expresión artística.`,
          es_status: "unlisted" as const,
        },
        {
          internal_title: `TEST_${generateRandomTitle(englishWords[4])}`,
          code_name: `TEST_${englishWords[4].toUpperCase()}-001`,
          video_type: "long-form" as const,
          en_main_title: `TEST_${generateRandomTitle(englishWords[4])}`,
          en_alternative_titles: [`TEST_${englishWords[4]} design`, `TEST_${englishWords[4]} planning`],
          en_script: `Understanding ${englishWords[4]} planning is crucial for creating memorable experiences. This video covers route planning, cultural insights, and how ${generateRandomTitle(englishWords[4])} showcases the best practices for exploring new destinations.`,
          en_status: "unlisted" as const,
          es_main_title: `TEST_${generateRandomTitle(spanishWords[4])}`,
          es_alternative_titles: [`TEST_Diseño de ${spanishWords[4]}`, `TEST_Planificación de ${spanishWords[4]}`],
          es_script: `Entender la planificación de ${spanishWords[4]} es crucial para crear experiencias memorables. Este video cubre planificación de rutas, insights culturales y cómo ${generateRandomTitle(spanishWords[4])} muestra las mejores prácticas para explorar nuevos destinos.`,
          es_status: "unlisted" as const,
        }
      ];

      // Create content videos with random topic assignments
      for (const videoData of dummyVideos) {
        // Randomly assign a topic from available topics (all videos must have a topic)
        const randomTopicId = allTopics && allTopics.length > 0 
          ? allTopics[Math.floor(Math.random() * allTopics.length)].id
          : null;

        await supabase
          .from('content_videos')
          .insert({
            account_id: currentOrganization.id,
            internal_title: videoData.internal_title,
            code_name: videoData.code_name,
            video_type: videoData.video_type,
            topic_id: randomTopicId,
            en_main_title: videoData.en_main_title,
            en_alternative_titles: JSON.stringify(videoData.en_alternative_titles),
            en_script: videoData.en_script,
            en_status: videoData.en_status,
            en_publication_date: videoData.en_publication_date || null,
            es_main_title: videoData.es_main_title,
            es_alternative_titles: JSON.stringify(videoData.es_alternative_titles),
            es_script: videoData.es_script,
            es_status: videoData.es_status,
          } as any);
      }

      toast({
        title: "Success",
        description: "5 dummy content videos with random topics created successfully!",
      });

      fetchVideos();
      fetchTopics(); // Refresh topics list
    } catch (error) {
      console.error('Error creating dummy data:', error);
      toast({
        title: "Error",
        description: "Failed to create dummy data",
        variant: "destructive",
      });
    }
  };

  const deleteAllDummyData = async () => {
    if (!currentOrganization) return;

    if (!confirm('Are you sure you want to delete ALL TEST content videos? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('content_videos')
        .delete()
        .eq('account_id', currentOrganization.id)
        .like('internal_title', 'TEST_%');

      if (error) throw error;

      toast({
        title: "Success",
        description: "All TEST content videos deleted successfully",
      });

      fetchVideos();
    } catch (error) {
      console.error('Error deleting dummy data:', error);
      toast({
        title: "Error",
        description: "Failed to delete TEST content videos",
        variant: "destructive",
      });
    }
  };


  const handleUnlinkVideo = async (video: ContentVideo, language: 'en' | 'es') => {
    try {
      const youtubeLink = language === 'en' ? video.en_youtube_link : video.es_youtube_link;
      
      if (!youtubeLink) {
        toast({
          title: "Error",
          description: "No YouTube link found to unlink",
          variant: "destructive",
        });
        return;
      }

      // Extract video ID from YouTube link
      const videoId = youtubeLink.includes('youtu.be/')
        ? youtubeLink.split('youtu.be/')[1]?.split('?')[0]
        : youtubeLink.includes('watch?v=')
        ? youtubeLink.split('watch?v=')[1]?.split('&')[0]
        : null;

      if (!videoId) {
        toast({
          title: "Error",
          description: "Invalid YouTube link format",
          variant: "destructive",
        });
        return;
      }

      // Update both directions
      const updateData: any = {};
      updateData[`${language}_youtube_link`] = null;

      await Promise.all([
        // Update content_videos table
        supabase
          .from('content_videos')
          .update(updateData)
          .eq('id', video.id),
        
        // Update youtube_videos table
        supabase
          .from('youtube_videos')
          .update({ content_video_id: null })
          .eq('account_id', currentOrganization?.id)
          .eq('video_id', videoId)
      ]);

      toast({
        title: "Success",
        description: `${language.toUpperCase()} video unlinked successfully`,
      });

      fetchVideos();
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
    if (currentOrganization) {
      fetchVideos();
      fetchTopics();
    }
  }, [currentOrganization]);

  const fetchVideos = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('content_videos')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .order('video_number', { ascending: true });

      if (error) throw error;

      const formattedVideos = (data || []).map(video => ({
        ...video,
        video_type: video.video_type as 'long-form' | 'short-form',
        en_status: (video.en_status as 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published') || 'idea',
        es_status: (video.es_status as 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published') || 'idea',
        en_alternative_titles: video.en_alternative_titles as string[] || [],
        es_alternative_titles: video.es_alternative_titles as string[] || [],
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to fetch videos",
        variant: "destructive",
      });
    }
  };

  const fetchTopics = async () => {
    if (!currentOrganization) return;

    try {
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('account_id', currentOrganization.id)
        .order('name');

      if (error) throw error;
      setTopics(data || []);
    } catch (error) {
      console.error('Error fetching topics:', error);
    }
  };

  const handleThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>, language: 'en' | 'es') => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingThumbnails(prev => ({ ...prev, [language]: true }));

      const previewUrl = URL.createObjectURL(file);
      setThumbnailPreviews(prev => ({ ...prev, [language]: previewUrl }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentOrganization.id}/${Date.now()}_${language}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('video-thumbnails')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('video-thumbnails')
        .getPublicUrl(fileName);

      setNewVideo(prev => ({
        ...prev,
        [`${language}_thumbnail_url`]: publicUrl
      }));

      toast({
        title: "Success",
        description: `${language.toUpperCase()} thumbnail uploaded successfully`,
      });

    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${language.toUpperCase()} thumbnail`,
        variant: "destructive",
      });
      
      setThumbnailPreviews(prev => ({ ...prev, [language]: null }));
    } finally {
      setUploadingThumbnails(prev => ({ ...prev, [language]: false }));
    }
  };

  const removeThumbnailPreview = (language: 'en' | 'es') => {
    if (thumbnailPreviews[language]) {
      URL.revokeObjectURL(thumbnailPreviews[language]!);
    }
    
    setThumbnailPreviews(prev => ({ ...prev, [language]: null }));
    setNewVideo(prev => ({
      ...prev,
      [`${language}_thumbnail_url`]: ""
    }));
  };

  const handleEditThumbnailUpload = async (event: React.ChangeEvent<HTMLInputElement>, language: 'en' | 'es') => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setEditUploadingThumbnails(prev => ({ ...prev, [language]: true }));

      const previewUrl = URL.createObjectURL(file);
      setEditThumbnailPreviews(prev => ({ ...prev, [language]: previewUrl }));

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentOrganization.id}/${Date.now()}_${language}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('video-thumbnails')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('video-thumbnails')
        .getPublicUrl(fileName);

      setEditingData(prev => ({
        ...prev,
        [`${language}_thumbnail_url`]: publicUrl
      }));

      toast({
        title: "Success",
        description: `${language.toUpperCase()} thumbnail uploaded successfully`,
      });

    } catch (error) {
      console.error('Error uploading thumbnail:', error);
      toast({
        title: "Error",
        description: `Failed to upload ${language.toUpperCase()} thumbnail`,
        variant: "destructive",
      });
      
      setEditThumbnailPreviews(prev => ({ ...prev, [language]: null }));
    } finally {
      setEditUploadingThumbnails(prev => ({ ...prev, [language]: false }));
    }
  };

  const removeEditThumbnailPreview = (language: 'en' | 'es') => {
    if (editThumbnailPreviews[language]) {
      URL.revokeObjectURL(editThumbnailPreviews[language]!);
    }
    
    setEditThumbnailPreviews(prev => ({ ...prev, [language]: null }));
    setEditingData(prev => ({
      ...prev,
      [`${language}_thumbnail_url`]: ""
    }));
  };

  const handleCreateVideo = async () => {
    if (!currentOrganization || !newVideo.internal_title.trim()) return;

    try {
      console.log('Creating new video for account:', currentOrganization.id);
      console.log('Video data:', newVideo);
      
      const { data, error } = await supabase
        .from('content_videos')
        .insert({
          account_id: currentOrganization.id,
          internal_title: newVideo.internal_title,
          code_name: newVideo.code_name || null,
          video_type: newVideo.video_type,
          topic_id: newVideo.topic_id === "none" ? null : newVideo.topic_id || null,
          en_main_title: newVideo.en_main_title || null,
          en_alternative_titles: JSON.stringify(newVideo.en_alternative_titles),
          en_script: newVideo.en_script || null,
          en_thumbnail_url: newVideo.en_thumbnail_url || null,
          es_main_title: newVideo.es_main_title || null,
          es_alternative_titles: JSON.stringify(newVideo.es_alternative_titles),
          es_script: newVideo.es_script || null,
          es_thumbnail_url: newVideo.es_thumbnail_url || null,
        } as any)
        .select();

      if (error) throw error;
      
      console.log('Video created successfully:', data);

      toast({
        title: "Success",
        description: "Video created successfully",
      });

      setNewVideo({
        internal_title: "",
        code_name: "",
        video_type: "long-form",
        topic_id: "",
        en_main_title: "",
        en_alternative_titles: [],
        en_script: "",
        en_thumbnail_url: "",
        es_main_title: "",
        es_alternative_titles: [],
        es_script: "",
        es_thumbnail_url: "",
      });
      
      Object.values(thumbnailPreviews).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      setThumbnailPreviews({ en: null, es: null });
      
      setDialogOpen(false);
      fetchVideos();
    } catch (error) {
      console.error('Error creating video:', error);
      toast({
        title: "Error",
        description: "Failed to create video",
        variant: "destructive",
      });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingVideo || !editingData) return;

    try {
      const updateData: any = {
        internal_title: editingData.internal_title || null,
        code_name: editingData.code_name || null,
        video_type: editingData.video_type || null,
        topic_id: editingData.topic_id === "none" ? null : editingData.topic_id || null,
        en_main_title: editingData.en_main_title || null,
        en_script: editingData.en_script || null,
        en_thumbnail_url: editingData.en_thumbnail_url || null,
        es_main_title: editingData.es_main_title || null,
        es_script: editingData.es_script || null,
        es_thumbnail_url: editingData.es_thumbnail_url || null,
        en_publication_date: editingData.en_publication_date || null,
        es_publication_date: editingData.es_publication_date || null,
      };

      const { error } = await supabase
        .from('content_videos')
        .update(updateData)
        .eq('id', editingVideo);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video updated successfully",
      });

      setEditingVideo(null);
      setEditingData({});
      
      // Clean up edit thumbnail previews
      Object.values(editThumbnailPreviews).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      setEditThumbnailPreviews({ en: null, es: null });
      
      fetchVideos();
    } catch (error) {
      console.error('Error updating video:', error);
      toast({
        title: "Error",
        description: "Failed to update video",
        variant: "destructive",
      });
    }
  };

  const handleRemoveScheduledDate = async (videoId: string, language: 'en' | 'es') => {
    try {
      const updateData: any = {};
      updateData[`${language}_publication_date`] = null;

      const { error } = await supabase
        .from('content_videos')
        .update(updateData)
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${language.toUpperCase()} scheduled date removed`,
      });

      fetchVideos();
    } catch (error) {
      console.error('Error removing scheduled date:', error);
      toast({
        title: "Error",
        description: "Failed to remove scheduled date",
        variant: "destructive",
      });
    }
  };

  const handleDeleteVideo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_videos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Video deleted successfully",
      });

      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video",
        variant: "destructive",
      });
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.internal_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (video.code_name && video.code_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (video.en_main_title && video.en_main_title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (video.es_main_title && video.es_main_title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || 
                         video.en_status === statusFilter || 
                         video.es_status === statusFilter;
    
    const matchesType = typeFilter === "all" || video.video_type === typeFilter;
    
    const matchesLanguage = languageFilter === "all" ||
                           (languageFilter === "en" && (video.en_main_title || video.en_script)) ||
                           (languageFilter === "es" && (video.es_main_title || video.es_script));
    
    return matchesSearch && matchesStatus && matchesType && matchesLanguage;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.bgColor || 'bg-gray-100 border-gray-300'}>
        <span className={statusConfig?.color || 'text-gray-600'}>
          {statusConfig?.label || status}
        </span>
      </Badge>
    );
  };

  const getVideoTypeBadge = (type: 'long-form' | 'short-form') => {
    const typeConfig = videoTypes.find(t => t.value === type);
    return (
      <Badge 
        variant="outline" 
        className={typeConfig?.bgColor}
        style={{
          color: typeConfig?.color.replace('text-', ''),
          borderColor: typeConfig?.bgColor.includes('border-') ? typeConfig.bgColor.split(' ')[1].replace('border-', '') : undefined
        }}
      >
        {typeConfig?.label || type}
      </Badge>
    );
  };

  const getTopicName = (topicId?: string) => {
    if (!topicId || topicId === "none") return 'No Topic';
    const topic = topics.find(t => t.id === topicId);
    return topic ? topic.name : 'No Topic';
  };

  const getTopicColor = (topicId?: string) => {
    if (!topicId || topicId === "none") return '#6b7280';
    const topic = topics.find(t => t.id === topicId);
    return topic ? topic.color : '#6b7280';
  };

  // Helper functions for calculating useful stats
  const getProgressPercentage = (status: string) => {
    const statusOrder = ['idea', 'scripted', 'recorded', 'edited', 'unlisted', 'published'];
    const currentIndex = statusOrder.indexOf(status);
    return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
  };

  const getDaysSinceCreated = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilPublication = (publicationDate?: string) => {
    if (!publicationDate) return null;
    const pubDate = new Date(publicationDate);
    const now = new Date();
    const diffTime = pubDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getScriptLength = (script?: string) => {
    if (!script) return 0;
    return script.length;
  };

  const getAlternativeTitlesCount = (titles: string[]) => {
    return titles ? titles.length : 0;
  };

  // Function to get YouTube video data for performance stats
  const getYouTubeVideoData = async (youtubeLink: string) => {
    if (!youtubeLink) return null;
    
    try {
      // Extract video ID from YouTube link
      const videoId = youtubeLink.includes('youtube.com/watch?v=') 
        ? youtubeLink.split('v=')[1]?.split('&')[0]
        : youtubeLink.includes('youtu.be/')
        ? youtubeLink.split('youtu.be/')[1]?.split('?')[0]
        : null;
      
      if (!videoId) return null;

      // Query YouTube videos table to get performance data
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('view_count, like_count, comment_count, published_at')
        .eq('account_id', currentOrganization?.id)
        .eq('video_id', videoId)
        .single();

      if (error || !data) return null;
      return data;
    } catch (error) {
      console.error('Error fetching YouTube video data:', error);
      return null;
    }
  };

  // Function to calculate performance stats for published videos
  const getPerformanceStats = async (video: ContentVideo, language: 'en' | 'es') => {
    const youtubeLink = language === 'en' ? video.en_youtube_link : video.es_youtube_link;
    const status = language === 'en' ? video.en_status : video.es_status;
    const publicationDate = language === 'en' ? video.en_publication_date : video.es_publication_date;
    
    // Only show stats for published videos
    if (status !== 'published' || !youtubeLink) {
      return null;
    }

    const youtubeData = await getYouTubeVideoData(youtubeLink);
    if (!youtubeData) return null;

    const now = new Date();
    const published = new Date(youtubeData.published_at);
    const ageInDays = Math.ceil((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24));
    
    const views = youtubeData.view_count || 0;
    const likes = youtubeData.like_count || 0;
    const comments = youtubeData.comment_count || 0;
    
    const engagementRate = views > 0 ? ((likes + comments) / views * 100).toFixed(1) : '0.0';
    const avgViewsPerDay = ageInDays > 0 ? Math.round(views / ageInDays) : views;

    return {
      ageInDays,
      engagementRate: `${engagementRate}%`,
      avgViewsPerDay: avgViewsPerDay.toLocaleString()
    };
  };

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedVideo(null);
      setAllExpanded(false);
    } else {
      setAllExpanded(true);
    }
  };

  const isVideoExpanded = (videoId: string) => {
    return allExpanded || expandedVideo === videoId;
  };

  // Component to display performance stats for published videos
  const PerformanceStats = ({ video, language }: { video: ContentVideo, language: 'en' | 'es' }) => {
    const [stats, setStats] = useState<{ageInDays: number, engagementRate: string, avgViewsPerDay: string} | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchStats = async () => {
        setLoading(true);
        const performanceStats = await getPerformanceStats(video, language);
        setStats(performanceStats);
        setLoading(false);
      };
      
      fetchStats();
    }, [video, language]);

    if (loading) {
      return (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Loading stats...</span>
        </div>
      );
    }

    if (!stats) {
      return null; // No stats for unpublished videos
    }

    return (
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Age: {stats.ageInDays} days</span>
        <span>Engagement: {stats.engagementRate}</span>
        <span>Avg views/day: {stats.avgViewsPerDay}</span>
      </div>
    );
  };

  // Component to display basic video stats (views, likes, comments)
  const VideoStats = ({ video, language }: { video: ContentVideo, language: 'en' | 'es' }) => {
    const [stats, setStats] = useState<{views: number, likes: number, comments: number} | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchStats = async () => {
        setLoading(true);
        const youtubeLink = language === 'en' ? video.en_youtube_link : video.es_youtube_link;
        
        if (!youtubeLink) {
          setStats(null);
          setLoading(false);
          return;
        }

        const youtubeData = await getYouTubeVideoData(youtubeLink);
        if (youtubeData) {
          setStats({
            views: youtubeData.view_count || 0,
            likes: youtubeData.like_count || 0,
            comments: youtubeData.comment_count || 0
          });
        } else {
          setStats(null);
        }
        setLoading(false);
      };
      
      fetchStats();
    }, [video, language]);

    if (loading) {
      return (
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>Loading...</span>
        </div>
      );
    }

    if (!stats) {
      return null; // No stats available
    }

    const formatNumber = (num: number) => {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    };

    return (
      <div className="flex gap-4 text-xs text-muted-foreground mt-1">
        <span>{formatNumber(stats.views)} views</span>
        <span>{formatNumber(stats.likes)} likes</span>
        <span>{formatNumber(stats.comments)} comments</span>
      </div>
    );
  };


  return (
    <div className="p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Content</h1>
            <p className="text-muted-foreground mt-1">
              Manage your video content and production pipeline
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={generateDummyData}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Generate Dummy Data
            </Button>
            {videos.some(video => video.internal_title.startsWith('TEST_')) && (
              <Button
                variant="destructive"
                onClick={deleteAllDummyData}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete All TEST Content
              </Button>
            )}
          </div>
        </div>
        {/* Search and Filters */}
        <div className="w-full mb-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search videos by title, topic, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Controls and Filters */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={toggleAllExpanded}
              >
                {allExpanded ? (
                  <>
                    <Minimize2 className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
              >
                {viewMode === 'cards' ? (
                  <>
                    <Columns className="h-4 w-4 mr-2" />
                    Table View
                  </>
                ) : (
                  <>
                    <Columns2 className="h-4 w-4 mr-2" />
                    Card View
                  </>
                )}
              </Button>
            </div>
            {canCreate && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingVideo(null);
                    setNewVideo({
                      internal_title: "",
                      code_name: "",
                      video_type: "long-form",
                      topic_id: "",
                      en_main_title: "",
                      en_alternative_titles: [],
                      en_script: "",
                      en_thumbnail_url: "",
                      es_main_title: "",
                      es_alternative_titles: [],
                      es_script: "",
                      es_thumbnail_url: "",
                    });
                    
                    Object.values(thumbnailPreviews).forEach(url => {
                      if (url) URL.revokeObjectURL(url);
                    });
                    setThumbnailPreviews({ en: null, es: null });
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Video
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Video</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4 pb-6 border-b">
                    <h3 className="text-lg font-semibold">Basic Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="internal_title">Internal Title *</Label>
                        <Input
                          id="internal_title"
                          value={newVideo.internal_title}
                          onChange={(e) => setNewVideo({ ...newVideo, internal_title: e.target.value })}
                          placeholder="Working name for this video"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="code_name">Code Name</Label>
                        <Input
                          id="code_name"
                          value={newVideo.code_name}
                          onChange={(e) => setNewVideo({ ...newVideo, code_name: e.target.value })}
                          placeholder="Optional project code name"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="video_type">Video Type</Label>
                        <Select
                          value={newVideo.video_type}
                          onValueChange={(value: 'long-form' | 'short-form') => setNewVideo({ ...newVideo, video_type: value })}
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="topic">Topic</Label>
                        <Select
                          value={newVideo.topic_id}
                          onValueChange={(value) => setNewVideo({ ...newVideo, topic_id: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a topic" />
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
                  <div className="grid grid-cols-2 gap-6 pt-6">
                    {/* English Version */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 pb-2 border-b">
                        <div className="w-6 h-4 bg-blue-500 rounded-sm flex items-center justify-center">
                          <span className="text-white text-xs font-bold">EN</span>
                        </div>
                        <h3 className="text-lg font-semibold">English Version</h3>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="en_main_title">Main Title</Label>
                        <Input
                          id="en_main_title"
                          value={newVideo.en_main_title}
                          onChange={(e) => setNewVideo({ ...newVideo, en_main_title: e.target.value })}
                          placeholder="Main public title in English"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="en_thumbnail">Thumbnail</Label>
                        <div className="space-y-2">
                          <Input
                            id="en_thumbnail"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleThumbnailUpload(e, 'en')}
                            className="cursor-pointer"
                          />
                          {thumbnailPreviews.en && (
                            <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                              <img
                                src={thumbnailPreviews.en}
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
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="en_script">Script</Label>
                        <Textarea
                          id="en_script"
                          value={newVideo.en_script}
                          onChange={(e) => setNewVideo({ ...newVideo, en_script: e.target.value })}
                          placeholder="Video script in English"
                          rows={6}
                          className="resize-none"
                        />
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
                      
                      <div className="space-y-2">
                        <Label htmlFor="es_main_title">Main Title</Label>
                        <Input
                          id="es_main_title"
                          value={newVideo.es_main_title}
                          onChange={(e) => setNewVideo({ ...newVideo, es_main_title: e.target.value })}
                          placeholder="Main public title in Spanish"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="es_thumbnail">Thumbnail</Label>
                        <div className="space-y-2">
                          <Input
                            id="es_thumbnail"
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleThumbnailUpload(e, 'es')}
                            className="cursor-pointer"
                          />
                          {thumbnailPreviews.es && (
                            <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                              <img
                                src={thumbnailPreviews.es}
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
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="es_script">Script</Label>
                        <Textarea
                          id="es_script"
                          value={newVideo.es_script}
                          onChange={(e) => setNewVideo({ ...newVideo, es_script: e.target.value })}
                          placeholder="Video script in Spanish"
                          rows={6}
                          className="resize-none"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-6 border-t">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateVideo}>
                      Create Video
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {videoTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Filter by language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Videos List */}
          {filteredVideos.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Video className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No videos yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first video to get started
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'table' ? (
            // Table View
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="p-4 font-medium">#</th>
                        <th className="p-4 font-medium">Title</th>
                        <th className="p-4 font-medium">Type</th>
                        <th className="p-4 font-medium">Topic</th>
                        <th className="p-4 font-medium">EN</th>
                        <th className="p-4 font-medium">ES</th>
                        <th className="p-4 font-medium">Status</th>
                        <th className="p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                     <tbody>
                      {filteredVideos.map((video) => (
                        <tr 
                          key={video.id} 
                          className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setEditingVideo(video.id);
                            setEditingData(video);
                            setEditThumbnailPreviews({
                              en: video.en_thumbnail_url || null,
                              es: video.es_thumbnail_url || null,
                            });
                            setViewMode('cards');
                            setExpandedVideo(video.id);
                          }}
                        >
                          <td className="p-4 text-sm">#{video.video_number}</td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-sm">{video.internal_title}</span>
                              {video.code_name && (
                                <span className="text-xs text-muted-foreground">{video.code_name}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            {getVideoTypeBadge(video.video_type)}
                          </td>
                          <td className="p-4">
                             <Badge 
                               variant="xanthous-subtle"
                               style={{ 
                                 borderColor: `${getTopicColor(video.topic_id)}50`,
                                 color: getTopicColor(video.topic_id),
                                 backgroundColor: `${getTopicColor(video.topic_id)}10`
                               }}
                             >
                               {getTopicName(video.topic_id)}
                             </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {video.en_thumbnail_url && (
                                <img 
                                  src={video.en_thumbnail_url} 
                                  alt="EN" 
                                  className="w-12 h-8 rounded object-cover"
                                />
                              )}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium line-clamp-1">
                                  {video.en_main_title || 'No title'}
                                </span>
                                <Badge 
                                  variant={video.en_status === 'published' ? 'default' : 'secondary'} 
                                  className="text-xs w-fit"
                                >
                                  {video.en_status}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {video.es_thumbnail_url && (
                                <img 
                                  src={video.es_thumbnail_url} 
                                  alt="ES" 
                                  className="w-12 h-8 rounded object-cover"
                                />
                              )}
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-medium line-clamp-1">
                                  {video.es_main_title || 'No title'}
                                </span>
                                <Badge 
                                  variant={video.es_status === 'published' ? 'default' : 'secondary'} 
                                  className="text-xs w-fit"
                                >
                                  {video.es_status}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              {video.en_publication_date && (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">EN</Badge>
                                  <span className="text-xs">
                                    {new Date(video.en_publication_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {video.es_publication_date && (
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs">ES</Badge>
                                  <span className="text-xs">
                                    {new Date(video.es_publication_date).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                           <td className="p-4" onClick={(e) => e.stopPropagation()}>
                             <div className="flex items-center gap-1">
                               {canDelete && (
                                 <Button
                                   size="sm"
                                   variant="delete"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     if (confirm('Are you sure you want to delete this video?')) {
                                       handleDeleteVideo(video.id);
                                     }
                                   }}
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               )}
                             </div>
                           </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="mb-4">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-muted-foreground">#{video.video_number}</span>
                          <Badge 
                            variant="xanthous-subtle"
                            style={{ 
                              borderColor: `${getTopicColor(video.topic_id)}50`,
                              color: getTopicColor(video.topic_id),
                              backgroundColor: `${getTopicColor(video.topic_id)}10`
                            }}
                          >
                            {getTopicName(video.topic_id)}
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{video.internal_title}</h3>
                            {getVideoTypeBadge(video.video_type)}
                          </div>
                          
                          {/* Publication dates and status controls - moved to top */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            {/* English Status */}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">EN</Badge>
                              <Select
                                value={video.en_status}
                                onValueChange={async (value) => {
                                  try {
                                    const { error } = await supabase
                                      .from('content_videos')
                                      .update({ en_status: value })
                                      .eq('id', video.id);
                                    if (error) throw error;
                                    fetchVideos();
                                    toast({
                                      title: "Success",
                                      description: "English status updated",
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update status",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-6 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((status) => (
                                    <SelectItem key={status.value} value={status.value} className="text-xs">
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {video.en_publication_date && (
                                <span className="text-xs">
                                  {new Date(video.en_publication_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>

                            {/* Spanish Status */}
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">ES</Badge>
                              <Select
                                value={video.es_status}
                                onValueChange={async (value) => {
                                  try {
                                    const { error } = await supabase
                                      .from('content_videos')
                                      .update({ es_status: value })
                                      .eq('id', video.id);
                                    if (error) throw error;
                                    fetchVideos();
                                    toast({
                                      title: "Success",
                                      description: "Spanish status updated",
                                    });
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update status",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <SelectTrigger className="h-6 w-32 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((status) => (
                                    <SelectItem key={status.value} value={status.value} className="text-xs">
                                      {status.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {video.es_publication_date && (
                                <span className="text-xs">
                                  {new Date(video.es_publication_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Link Video buttons for EN and ES */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={
                              video.en_youtube_link 
                                ? (hoveredButton === `${video.id}-en` ? "delete" : "default")
                                : "outline"
                            }
                            onClick={() => {
                              if (video.en_youtube_link) {
                                handleUnlinkVideo(video, 'en');
                              } else {
                                setLinkingVideo(video);
                                setLinkingLanguage('en');
                                setLinkingModalOpen(true);
                              }
                            }}
                            onMouseEnter={() => video.en_youtube_link && setHoveredButton(`${video.id}-en`)}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="gap-1"
                          >
                            {video.en_youtube_link ? (
                              hoveredButton === `${video.id}-en` ? (
                                <>
                                  <Unlink className="h-3 w-3" />
                                  Unlink
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  EN
                                </>
                              )
                            ) : (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                EN
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant={
                              video.es_youtube_link 
                                ? (hoveredButton === `${video.id}-es` ? "delete" : "default")
                                : "outline"
                            }
                            onClick={() => {
                              if (video.es_youtube_link) {
                                handleUnlinkVideo(video, 'es');
                              } else {
                                setLinkingVideo(video);
                                setLinkingLanguage('es');
                                setLinkingModalOpen(true);
                              }
                            }}
                            onMouseEnter={() => video.es_youtube_link && setHoveredButton(`${video.id}-es`)}
                            onMouseLeave={() => setHoveredButton(null)}
                            className="gap-1"
                          >
                            {video.es_youtube_link ? (
                              hoveredButton === `${video.id}-es` ? (
                                <>
                                  <Unlink className="h-3 w-3" />
                                  Unlink
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  ES
                                </>
                              )
                            ) : (
                              <>
                                <LinkIcon className="h-3 w-3" />
                                ES
                              </>
                            )}
                          </Button>
                        </div>

                        {/* Show edit button only when not editing */}
                        {editingVideo !== video.id && canEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingVideo(video.id);
                              setEditingData(video);
                              
                              // Initialize edit thumbnail previews with existing URLs
                              setEditThumbnailPreviews({
                                en: video.en_thumbnail_url || null,
                                es: video.es_thumbnail_url || null,
                              });
                              
                              if (!isVideoExpanded(video.id)) {
                                setExpandedVideo(video.id);
                              }
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {/* Delete button */}
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="delete"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this video?')) {
                                handleDeleteVideo(video.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {isVideoExpanded(video.id) && (
                          <div className="flex items-center gap-1">
                            {editingVideo === video.id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditViewMode(editViewMode === 'columns' ? 'single' : 'columns')}
                                >
                                  {editViewMode === 'columns' ? <Columns className="h-4 w-4" /> : <Columns2 className="h-4 w-4" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleSaveEdit}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingVideo(null);
                                    // Clean up edit thumbnail previews when canceling edit
                                    Object.values(editThumbnailPreviews).forEach(url => {
                                      if (url) URL.revokeObjectURL(url);
                                    });
                                    setEditThumbnailPreviews({ en: null, es: null });
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpandedVideo(isVideoExpanded(video.id) ? null : video.id)}
                        >
                          {isVideoExpanded(video.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Compact View - Language Cards */}
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      {/* English Version */}
                      <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">English</Badge>
                            {video.en_status && (
                              <Badge 
                                variant={video.en_status === 'published' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {video.en_status}
                              </Badge>
                            )}
                          </div>
                        <div className="flex gap-3">
                          {video.en_thumbnail_url && (
                            <img 
                              src={video.en_thumbnail_url} 
                              alt="EN Thumbnail" 
                              className={`rounded object-cover ${isVideoExpanded(video.id) ? 'w-24 h-15' : 'w-16 h-10'}`}
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm line-clamp-2">{video.en_main_title || 'No title set'}</div>
                            {video.en_status === 'published' && (
                              <VideoStats video={video} language="en" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Spanish Version */}
                      <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Spanish</Badge>
                            {video.es_status && (
                              <Badge 
                                variant={video.es_status === 'published' ? 'default' : 'secondary'} 
                                className="text-xs"
                              >
                                {video.es_status}
                              </Badge>
                            )}
                          </div>
                        <div className="flex gap-3">
                          {video.es_thumbnail_url && (
                            <img 
                              src={video.es_thumbnail_url} 
                              alt="ES Thumbnail" 
                              className={`rounded object-cover ${isVideoExpanded(video.id) ? 'w-24 h-15' : 'w-16 h-10'}`}
                            />
                          )}
                          <div className="flex-1">
                            <div className="font-medium text-sm line-clamp-2">{video.es_main_title || 'No title set'}</div>
                            {video.es_status === 'published' && (
                              <VideoStats video={video} language="es" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {isVideoExpanded(video.id) && (
                      <div className="border-t pt-4">
                        {editingVideo === video.id ? (
                          // Edit Mode
                          editViewMode === 'columns' ? (
                            // Two Column Edit View
                            <div className="space-y-6">
                              {/* Basic Information Edit */}
                              <div className="space-y-4 pb-4 border-b">
                                <h4 className="font-semibold text-sm">Basic Information</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs">Internal Title</Label>
                                    <Input 
                                      value={editingData.internal_title || ''} 
                                      onChange={(e) => setEditingData({...editingData, internal_title: e.target.value})}
                                      placeholder="Internal working title..."
                                      className="text-sm"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Code Name</Label>
                                    <Input 
                                      value={editingData.code_name || ''} 
                                      onChange={(e) => setEditingData({...editingData, code_name: e.target.value})}
                                      placeholder="Project code name..."
                                      className="text-sm"
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-xs">Video Type</Label>
                                    <Select
                                      value={editingData.video_type || ''}
                                      onValueChange={(value: 'long-form' | 'short-form') => setEditingData({...editingData, video_type: value})}
                                    >
                                      <SelectTrigger className="text-sm">
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
                                    <Label className="text-xs">Topic</Label>
                                    <Select
                                      value={editingData.topic_id || 'none'}
                                      onValueChange={(value) => setEditingData({...editingData, topic_id: value})}
                                    >
                                      <SelectTrigger className="text-sm">
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
                              
                              <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-sm flex items-center gap-2">
                                    <Badge variant="outline">English</Badge>
                                    Edit
                                  </h4>
                                 <div className="space-y-3">
                                   <div>
                                     <Label className="text-xs">Title</Label>
                                     <Input 
                                       value={editingData.en_main_title || ''} 
                                       onChange={(e) => setEditingData({...editingData, en_main_title: e.target.value})}
                                       placeholder="English title..."
                                       className="text-sm"
                                     />
                                   </div>
                                   <div>
                                     <Label className="text-xs">Status</Label>
                                     <Select
                                       value={editingData.en_status || ''}
                                        onValueChange={(value) => setEditingData({...editingData, en_status: value as 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published'})}
                                     >
                                       <SelectTrigger className="text-sm">
                                         <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent>
                                         {statusOptions.map((status) => (
                                           <SelectItem key={status.value} value={status.value}>
                                             {status.label}
                                           </SelectItem>
                                         ))}
                                       </SelectContent>
                                     </Select>
                                   </div>
                                   <div>
                                     <Label className="text-xs">Publication Date</Label>
                                     <Input 
                                       type="date"
                                       value={editingData.en_publication_date ? new Date(editingData.en_publication_date).toISOString().split('T')[0] : ''} 
                                       onChange={(e) => setEditingData({...editingData, en_publication_date: e.target.value ? new Date(e.target.value).toISOString() : null})}
                                       className="text-sm"
                                     />
                                   </div>
                                  <div>
                                    <Label className="text-xs">Thumbnail</Label>
                                    <div className="space-y-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleEditThumbnailUpload(e, 'en')}
                                        className="cursor-pointer text-xs"
                                        disabled={editUploadingThumbnails.en}
                                      />
                                      {(editThumbnailPreviews.en || editingData.en_thumbnail_url) && (
                                        <div className="relative w-full h-20 bg-muted rounded-lg overflow-hidden">
                                          <img
                                            src={editThumbnailPreviews.en || editingData.en_thumbnail_url || ''}
                                            alt="English thumbnail preview"
                                            className="w-full h-full object-cover"
                                          />
                                           <Button
                                             variant="delete"
                                             size="sm"
                                             className="absolute top-1 right-1 h-6 w-6 p-0"
                                             onClick={() => removeEditThumbnailPreview('en')}
                                           >
                                             <Trash2 className="h-3 w-3" />
                                           </Button>
                                        </div>
                                      )}
                                      {editUploadingThumbnails.en && (
                                        <div className="text-xs text-muted-foreground">Uploading...</div>
                                      )}
                                    </div>
                                  </div>
                                   <div>
                                     <Label className="text-xs">Script</Label>
                                     <Textarea 
                                       value={editingData.en_script || ''} 
                                       onChange={(e) => setEditingData({...editingData, en_script: e.target.value})}
                                       placeholder="English script..."
                                       className="text-sm min-h-[120px]"
                                     />
                                   </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                  <Badge variant="outline">Spanish</Badge>
                                  Edit
                                </h4>
                                 <div className="space-y-3">
                                   <div>
                                     <Label className="text-xs">Title</Label>
                                     <Input 
                                       value={editingData.es_main_title || ''} 
                                       onChange={(e) => setEditingData({...editingData, es_main_title: e.target.value})}
                                       placeholder="Spanish title..."
                                       className="text-sm"
                                     />
                                   </div>
                                   <div>
                                     <Label className="text-xs">Status</Label>
                                     <Select
                                       value={editingData.es_status || ''}
                                       onValueChange={(value) => setEditingData({...editingData, es_status: value as 'idea' | 'scripted' | 'recorded' | 'edited' | 'unlisted' | 'published'})}
                                     >
                                       <SelectTrigger className="text-sm">
                                         <SelectValue />
                                       </SelectTrigger>
                                       <SelectContent>
                                         {statusOptions.map((status) => (
                                           <SelectItem key={status.value} value={status.value}>
                                             {status.label}
                                           </SelectItem>
                                         ))}
                                       </SelectContent>
                                     </Select>
                                   </div>
                                   <div>
                                     <Label className="text-xs">Publication Date</Label>
                                     <Input 
                                       type="date"
                                       value={editingData.es_publication_date ? new Date(editingData.es_publication_date).toISOString().split('T')[0] : ''} 
                                       onChange={(e) => setEditingData({...editingData, es_publication_date: e.target.value ? new Date(e.target.value).toISOString() : null})}
                                       className="text-sm"
                                     />
                                   </div>
                                  <div>
                                    <Label className="text-xs">Thumbnail</Label>
                                    <div className="space-y-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleEditThumbnailUpload(e, 'es')}
                                        className="cursor-pointer text-xs"
                                        disabled={editUploadingThumbnails.es}
                                      />
                                      {(editThumbnailPreviews.es || editingData.es_thumbnail_url) && (
                                        <div className="relative w-full h-20 bg-muted rounded-lg overflow-hidden">
                                          <img
                                            src={editThumbnailPreviews.es || editingData.es_thumbnail_url || ''}
                                            alt="Spanish thumbnail preview"
                                            className="w-full h-full object-cover"
                                          />
                                           <Button
                                             variant="delete"
                                             size="sm"
                                             className="absolute top-1 right-1 h-6 w-6 p-0"
                                             onClick={() => removeEditThumbnailPreview('es')}
                                           >
                                             <Trash2 className="h-3 w-3" />
                                           </Button>
                                        </div>
                                      )}
                                      {editUploadingThumbnails.es && (
                                        <div className="text-xs text-muted-foreground">Uploading...</div>
                                      )}
                                    </div>
                                  </div>
                                   <div>
                                     <Label className="text-xs">Script</Label>
                                     <Textarea 
                                       value={editingData.es_script || ''} 
                                       onChange={(e) => setEditingData({...editingData, es_script: e.target.value})}
                                       placeholder="Spanish script..."
                                       className="text-sm min-h-[120px]"
                                     />
                                   </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Single Column Edit View (wider)
                            <div className="space-y-6">
                              {/* Basic Information Edit */}
                              <div className="space-y-4 pb-4 border-b">
                                <h4 className="font-semibold">Basic Information</h4>
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
                              
                              <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Badge variant="outline">English</Badge>
                                  Edit
                                </h4>
                                <div className="grid gap-4">
                                  <div>
                                    <Label>Title</Label>
                                    <Input 
                                      value={editingData.en_main_title || ''} 
                                      onChange={(e) => setEditingData({...editingData, en_main_title: e.target.value})}
                                      placeholder="English title..."
                                    />
                                  </div>
                                  <div>
                                    <Label>Thumbnail</Label>
                                    <div className="space-y-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleEditThumbnailUpload(e, 'en')}
                                        className="cursor-pointer"
                                        disabled={editUploadingThumbnails.en}
                                      />
                                      {(editThumbnailPreviews.en || editingData.en_thumbnail_url) && (
                                        <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                                          <img
                                            src={editThumbnailPreviews.en || editingData.en_thumbnail_url || ''}
                                            alt="English thumbnail preview"
                                            className="w-full h-full object-cover"
                                          />
                                           <Button
                                             variant="delete"
                                             size="sm"
                                             className="absolute top-2 right-2"
                                             onClick={() => removeEditThumbnailPreview('en')}
                                           >
                                             <Trash2 className="h-3 w-3" />
                                           </Button>
                                        </div>
                                      )}
                                      {editUploadingThumbnails.en && (
                                        <div className="text-sm text-muted-foreground">Uploading...</div>
                                      )}
                                    </div>
                                  </div>
                                   <div>
                                     <Label>Script</Label>
                                     <Textarea 
                                       value={editingData.en_script || ''} 
                                       onChange={(e) => setEditingData({...editingData, en_script: e.target.value})}
                                       placeholder="English script..."
                                       className="min-h-[200px]"
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
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-semibold flex items-center gap-2">
                                  <Badge variant="outline">Spanish</Badge>
                                  Edit
                                </h4>
                                <div className="grid gap-4">
                                  <div>
                                    <Label>Title</Label>
                                    <Input 
                                      value={editingData.es_main_title || ''} 
                                      onChange={(e) => setEditingData({...editingData, es_main_title: e.target.value})}
                                      placeholder="Spanish title..."
                                    />
                                  </div>
                                  <div>
                                    <Label>Thumbnail</Label>
                                    <div className="space-y-2">
                                      <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleEditThumbnailUpload(e, 'es')}
                                        className="cursor-pointer"
                                        disabled={editUploadingThumbnails.es}
                                      />
                                      {(editThumbnailPreviews.es || editingData.es_thumbnail_url) && (
                                        <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                                          <img
                                            src={editThumbnailPreviews.es || editingData.es_thumbnail_url || ''}
                                            alt="Spanish thumbnail preview"
                                            className="w-full h-full object-cover"
                                          />
                                           <Button
                                             variant="delete"
                                             size="sm"
                                             className="absolute top-2 right-2"
                                             onClick={() => removeEditThumbnailPreview('es')}
                                           >
                                             <Trash2 className="h-3 w-3" />
                                           </Button>
                                        </div>
                                      )}
                                      {editUploadingThumbnails.es && (
                                        <div className="text-sm text-muted-foreground">Uploading...</div>
                                      )}
                                    </div>
                                  </div>
                                   <div>
                                     <Label>Script</Label>
                                     <Textarea 
                                       value={editingData.es_script || ''} 
                                       onChange={(e) => setEditingData({...editingData, es_script: e.target.value})}
                                       placeholder="Spanish script..."
                                       className="min-h-[200px]"
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
                                 </div>
                               </div>
                             </div>
                           )
                        ) : (
                          // View Mode
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <h4 className="font-semibold text-sm">
                                Details: English
                              </h4>
                              <div className="space-y-3">
                                {video.en_thumbnail_url && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Thumbnail</Label>
                                    <img 
                                      src={video.en_thumbnail_url} 
                                      alt="English thumbnail" 
                                      className="h-48 w-auto rounded object-contain"
                                    />
                                  </div>
                                )}
                                <div>
                                  <Label className="text-xs text-muted-foreground">Title</Label>
                                  <p className="text-sm">{video.en_main_title || 'Not set'}</p>
                                </div>
                                {video.en_script && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Script</Label>
                                    <div className="text-sm bg-muted/50 rounded p-3 max-h-32 overflow-y-auto">
                                      {video.en_script}
                                    </div>
                                  </div>
                                )}
                                <PerformanceStats video={video} language="en" />
                                <div>
                                  <Label className="text-xs text-muted-foreground">Publication Date</Label>
                                  <p className="text-sm">{video.en_publication_date ? new Date(video.en_publication_date).toLocaleDateString() : 'Not scheduled'}</p>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <h4 className="font-semibold text-sm">
                                Details: Spanish
                              </h4>
                              <div className="space-y-3">
                                {video.es_thumbnail_url && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Thumbnail</Label>
                                    <img 
                                      src={video.es_thumbnail_url} 
                                      alt="Spanish thumbnail" 
                                      className="h-48 w-auto rounded object-contain"
                                    />
                                  </div>
                                )}
                                <div>
                                  <Label className="text-xs text-muted-foreground">Title</Label>
                                  <p className="text-sm">{video.es_main_title || 'Not set'}</p>
                                </div>
                                {video.es_script && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">Script</Label>
                                    <div className="text-sm bg-muted/50 rounded p-3 max-h-32 overflow-y-auto">
                                      {video.es_script}
                                    </div>
                                  </div>
                                )}
                                <PerformanceStats video={video} language="es" />
                                <div>
                                  <Label className="text-xs text-muted-foreground">Publication Date</Label>
                                  <p className="text-sm">{video.es_publication_date ? new Date(video.es_publication_date).toLocaleDateString() : 'Not scheduled'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>

      {/* Video Linking Modal */}
      <VideoLinkingModal
        open={linkingModalOpen}
        onOpenChange={setLinkingModalOpen}
        mode="content-to-youtube"
        sourceVideo={linkingVideo}
        accountId={currentOrganization?.id || ''}
        onLinkUpdate={fetchVideos}
        language={linkingLanguage}
      />
    </div>
  );
};

export default Content;