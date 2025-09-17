import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'true',
}

interface ChannelData {
  id: string;
  snippet: {
    title: string;
    thumbnails: { default: { url: string } };
  };
  statistics: {
    subscriberCount: string;
    videoCount: string;
    viewCount: string;
  };
  contentDetails: {
    relatedPlaylists: {
      uploads: string;
    };
  };
}

interface VideoData {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: { medium: { url: string } };
    tags?: string[];
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    commentCount: string;
  };
  contentDetails: {
    duration: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Set a timeout to prevent 504 errors (5 minutes)
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Function timeout')), 5 * 60 * 1000);
  });

  try {
    // Race between the main function and timeout
    return await Promise.race([
      processRequest(req),
      timeoutPromise
    ]) as Response;
  } catch (error) {
    console.error('Error in youtube-sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processRequest(req: Request): Promise<Response> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { accountId } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: 'Account ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get YouTube channels for this account
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('*')
      .eq('account_id', accountId);

    if (channelsError) {
      console.error('Error fetching channels:', channelsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch channels' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channels || channels.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No channels configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalVideosProcessed = 0;

    // Function to resolve channel ID from handle or ID
    const resolveChannelId = async (rawIdOrHandle: string): Promise<string | null> => {
      try {
        const looksLikeChannelId = rawIdOrHandle.startsWith('UC') && rawIdOrHandle.length === 24;
        if (looksLikeChannelId) return rawIdOrHandle;

        // Normalize handle from possible URL forms
        let normalized = rawIdOrHandle.trim();
        try {
          if (normalized.includes('youtube.com')) {
            // Extract @handle or /channel/ID
            const url = new URL(normalized);
            const atIdx = url.pathname.indexOf('@');
            if (atIdx !== -1) {
              normalized = url.pathname.slice(atIdx + 1);
            } else if (url.pathname.includes('/channel/')) {
              const parts = url.pathname.split('/');
              const uc = parts[parts.indexOf('channel') + 1];
              if (uc?.startsWith('UC')) return uc;
            }
          } else if (normalized.startsWith('@')) {
            normalized = normalized.slice(1);
          }
        } catch {}

        // Try forHandle first
        const byHandle = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(normalized)}&key=${YOUTUBE_API_KEY}`                                                                                   
        );
        if (byHandle.ok) {
          const data = await byHandle.json();
          const id = data?.items?.[0]?.id;
          if (id) return id;
        }

        // Fallback: search API
        const bySearch = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(normalized)}&key=${YOUTUBE_API_KEY}`                                                                           
        );
        if (bySearch.ok) {
          const data = await bySearch.json();
          const id = data?.items?.[0]?.id?.channelId;
          if (id) return id;
        }

        return null;
      } catch (e) {
        console.error('resolveChannelId error:', e);
        return null;
      }
    };

    for (const channel of channels) {
      try {
        // Ensure we have a canonical channel ID (UC...) even if we stored a handle
        let effectiveChannelId = channel.channel_id as string;
        const resolved = await resolveChannelId(effectiveChannelId);
        if (resolved && resolved !== effectiveChannelId) {
          effectiveChannelId = resolved;
          await supabase
            .from('youtube_channels')
            .update({ channel_id: effectiveChannelId })
            .eq('id', channel.id);
        }

        // Get channel details
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${effectiveChannelId}&key=${YOUTUBE_API_KEY}`                                                                       
        );

        if (!channelResponse.ok) {
          console.error(`Failed to fetch channel ${channel.channel_id}:`, channelResponse.statusText);
          continue;
        }

        const channelData = await channelResponse.json();
        const channelInfo: ChannelData = channelData.items[0];

        if (!channelInfo) {
          console.error(`Channel not found: ${channel.channel_id}`);
          continue;
        }

        // Update channel info
        await supabase
          .from('youtube_channels')
          .update({
            channel_title: channelInfo.snippet.title,
            thumbnail_url: channelInfo.snippet.thumbnails.default.url,
            subscriber_count: parseInt(channelInfo.statistics.subscriberCount || '0'),
            video_count: parseInt(channelInfo.statistics.videoCount || '0'),
            view_count: parseInt(channelInfo.statistics.viewCount || '0'),
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', channel.id);

        // Get uploads playlist
        const uploadsPlaylistId = channelInfo.contentDetails.relatedPlaylists.uploads;

        // Fetch ALL videos from uploads playlist using pagination
        let allVideoIds: string[] = [];
        let nextPageToken: string | undefined = undefined;
        let pageCount = 0;
        const maxPages = 100; // Safety limit to prevent infinite loops

        do {
          pageCount++;
          if (pageCount > maxPages) {
            console.warn(`Reached maximum page limit (${maxPages}) for channel ${channel.channel_id}`);
            break;
          }

          const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${YOUTUBE_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;                                                                                                         
          
          const playlistResponse = await fetch(playlistUrl);

          if (!playlistResponse.ok) {
            console.error(`Failed to fetch playlist page ${pageCount} for channel ${channel.channel_id}:`, playlistResponse.statusText);                                                                                
            break;
          }

          const playlistData = await playlistResponse.json();
          console.log(`Playlist page ${pageCount} response structure:`, JSON.stringify(playlistData, null, 2));
          
          if (!playlistData.items || playlistData.items.length === 0) {
            console.warn(`No items in playlist page ${pageCount} for channel ${channel.channel_id}`);
            nextPageToken = playlistData.nextPageToken;
            continue;
          }
          
          const pageVideoIds = playlistData.items.map((item: any) => {
            if (!item.snippet || !item.snippet.resourceId || !item.snippet.resourceId.videoId) {
              console.warn(`Invalid playlist item structure:`, item);
              return null;
            }
            return item.snippet.resourceId.videoId;
          }).filter(id => id !== null);
          
          console.log(`Extracted ${pageVideoIds.length} video IDs from page ${pageCount}:`, pageVideoIds.slice(0, 3), pageVideoIds.length > 3 ? `... and ${pageVideoIds.length - 3} more` : '');
          allVideoIds = allVideoIds.concat(pageVideoIds);
          
          nextPageToken = playlistData.nextPageToken;
          
          console.log(`Fetched page ${pageCount} for channel ${channel.channel_id}: ${pageVideoIds.length} videos (total so far: ${allVideoIds.length})`);                                                              
          
          // Small delay to avoid hitting rate limits
          if (nextPageToken) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
        } while (nextPageToken);

        if (allVideoIds.length === 0) {
          console.log(`No videos found for channel ${channel.channel_id}`);
          continue;
        }

        console.log(`>> Total videos to process for channel ${channel.channel_id}: ${allVideoIds.length}`);

        // Process videos in batches of 50 (YouTube API limit for videos endpoint)
        const batchSize = 50;
        const videos: VideoData[] = [];

        for (let i = 0; i < allVideoIds.length; i += batchSize) {
          const batch = allVideoIds.slice(i, i + batchSize);
          const batchNumber = Math.floor(i / batchSize) + 1;
          const totalBatches = Math.ceil(allVideoIds.length / batchSize);
          
          console.log(`Processing video batch ${batchNumber}/${totalBatches} for channel ${channel.channel_id} (${batch.length} videos)`);                                                                              
          console.log(`Video IDs in this batch:`, batch.slice(0, 5), batch.length > 5 ? `... and ${batch.length - 5} more` : '');

          // Get detailed video information for this batch
          const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${batch.join(',')}&key=${YOUTUBE_API_KEY}`;
          console.log(`Fetching video details for batch ${batchNumber}/${totalBatches} with URL: ${videosUrl.replace(YOUTUBE_API_KEY, 'API_KEY_HIDDEN')}`);
          
          const videosResponse = await fetch(videosUrl);

          if (!videosResponse.ok) {
            const errorText = await videosResponse.text();
            console.error(`Failed to fetch video batch ${batchNumber} for channel ${channel.channel_id}:`, videosResponse.status, videosResponse.statusText, errorText);                                                                                  
            continue;
          }

          const videosData = await videosResponse.json();
          console.log(`API Response for batch ${batchNumber}:`, JSON.stringify(videosData, null, 2));
          
          if (!videosData.items || videosData.items.length === 0) {
            console.warn(`No video items returned for batch ${batchNumber} for channel ${channel.channel_id}`);
            continue;
          }
          
          videos.push(...videosData.items);
          console.log(`Successfully fetched ${videosData.items.length} videos from batch ${batchNumber}/${totalBatches} for channel ${channel.channel_id}`);
          
          // Small delay between batches to avoid hitting rate limits
          if (i + batchSize < allVideoIds.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        console.log(`Total videos fetched for channel ${channel.channel_id}: ${videos.length}`);

        // Process each video
        console.log(`Starting to process ${videos.length} videos for channel ${channel.channel_id}`);
        let processedCount = 0;
        for (const video of videos) {
          const parseDuration = (duration: string): number => {
            const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) return 0;
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');
            return hours * 3600 + minutes * 60 + seconds;
          };

          const durationSeconds = parseDuration(video.contentDetails.duration);
          const cleanVideoId = video.id.trim();
          
          // For now, let's use a conservative approach and only check specific videos
          // that are likely to be misclassified (60-180 seconds)
          let videoIsShort = false;
          
          if (durationSeconds <= 60) {
            // Definitely a Short (old rule)
            videoIsShort = true;
          } else if (durationSeconds > 180) {
            // Definitely not a Short
            videoIsShort = false;
          } else {
            // 61-180 seconds: Check with HEAD request for specific cases
            try {
              const shortsUrl = `https://www.youtube.com/shorts/${cleanVideoId}`;
              const response = await fetch(shortsUrl, { 
                method: 'HEAD',
                redirect: 'follow',
                signal: AbortSignal.timeout(10000)
              });
              
              // Check if the final URL still contains "shorts" (meaning it's a Short)
              // or if it redirected to "watch" (meaning it's not a Short)
              const finalUrl = response.url || shortsUrl;
              videoIsShort = finalUrl.includes('/shorts/');
              
            } catch (error) {
              // For videos 61-90 seconds, be more optimistic and assume they might be Shorts
              // For videos 91-180 seconds, be more conservative
              if (durationSeconds <= 90) {
                videoIsShort = true;
              } else {
                videoIsShort = false;
              }
            }
          }
          
          // Check if this video already exists
          const { data: existingVideo } = await supabase
            .from('youtube_videos')
            .select('id, content_video_id, auto_link_attempted')
            .eq('account_id', accountId)
            .eq('video_id', cleanVideoId)
            .single();

          const { error: videoError } = await supabase
            .from('youtube_videos')
            .upsert({
              account_id: accountId,
              channel_id: effectiveChannelId, // Use the resolved channel ID
              video_id: cleanVideoId,
              title: video.snippet.title,
              description: video.snippet.description || null,
              thumbnail_url: video.snippet.thumbnails.medium?.url || null,
              published_at: video.snippet.publishedAt,
              duration_seconds: durationSeconds,
              is_short: videoIsShort,
              view_count: parseInt(video.statistics.viewCount || '0'),
              like_count: parseInt(video.statistics.likeCount || '0'),
              comment_count: parseInt(video.statistics.commentCount || '0'),
              tags: video.snippet.tags || [],
              last_synced_at: new Date().toISOString(),
              // Only set auto_link_attempted to false for new videos
              auto_link_attempted: existingVideo ? existingVideo.auto_link_attempted : false,
            }, {
              onConflict: 'account_id,video_id'
            });

          if (videoError) {
            console.error(`Error upserting video ${cleanVideoId} for channel ${effectiveChannelId}:`, videoError);
          } else {
            processedCount++;
            
            // Note: Auto-linking is now handled manually via the VideoLinkingModal
            // Mark as attempted to prevent future automatic processing
            if (!existingVideo || !existingVideo.auto_link_attempted) {
              await supabase
                .from('youtube_videos')
                .update({ auto_link_attempted: true })
                .eq('account_id', accountId)
                .eq('video_id', cleanVideoId);
            }
            
            if (processedCount % 10 === 0 || processedCount === videos.length) {
              console.log(`Processed ${processedCount}/${videos.length} videos for channel ${channel.channel_id}`);
            }
          }

          totalVideosProcessed++;
        }

      } catch (error) {
        console.error(`Error processing channel ${channel.channel_id}:`, error);
      }
    }

    // Update last sync time
    await supabase
      .from('youtube_settings')
      .upsert({
        account_id: accountId,
        last_full_sync: new Date().toISOString(),
      }, {
        onConflict: 'account_id'
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        videosProcessed: totalVideosProcessed,
        channelsProcessed: channels.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in processRequest:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Note: Auto-linking functionality has been moved to the VideoLinkingModal component
// for manual control by users. The attemptAutoLink function has been removed.
