import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

function normalizeChannelInput(input: string): string {
  // Handle @username format
  if (input.startsWith('@')) {
    return input.substring(1);
  }
  
  // Handle full YouTube URLs
  const urlPatterns = [
    /youtube\.com\/channel\/([^\/\?]+)/,
    /youtube\.com\/c\/([^\/\?]+)/,
    /youtube\.com\/@([^\/\?]+)/,
    /youtube\.com\/user\/([^\/\?]+)/,
  ];
  
  for (const pattern of urlPatterns) {
    const match = input.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  // Return as-is (could be channel ID or username)
  return input;
}

async function getChannelId(channelInput: string): Promise<string | null> {
  const normalized = normalizeChannelInput(channelInput);
  console.log('Normalized input:', normalized);
  
  // If it looks like a channel ID (starts with UC), use it directly
  if (normalized.startsWith('UC') && normalized.length === 24) {
    console.log('Input is already a channel ID');
    return normalized;
  }
  
  // Try channels API with forHandle parameter first
  try {
    console.log('Trying forHandle API...');
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${normalized}&key=${YOUTUBE_API_KEY}`;                                                                                
    console.log('API URL:', channelsUrl.replace(YOUTUBE_API_KEY || '', 'API_KEY_HIDDEN'));
    
    const response = await fetch(channelsUrl);
    const data = await response.json();
    
    console.log('forHandle response status:', response.status);
    console.log('forHandle response data:', data);
    
    if (data.items && data.items.length > 0) {
      console.log('Found channel via forHandle:', data.items[0].id);
      return data.items[0].id;
    }
  } catch (error) {
    console.error('Error fetching channel by handle:', error);
  }
  
  // Search by handle/username as fallback
  try {
    console.log('Trying search API...');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(normalized)}&key=${YOUTUBE_API_KEY}`;                                                              
    console.log('Search API URL:', searchUrl.replace(YOUTUBE_API_KEY || '', 'API_KEY_HIDDEN'));
    
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    console.log('Search response status:', response.status);
    console.log('Search response data:', data);
    
    if (data.items && data.items.length > 0) {
      console.log('Found channel via search:', data.items[0].id.channelId);
      return data.items[0].id.channelId;
    }
  } catch (error) {
    console.error('Error searching for channel:', error);
  }
  
  console.log('No channel found');
  return null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Function called');
    console.log('YouTube API Key exists:', !!YOUTUBE_API_KEY);
    console.log('YouTube API Key length:', YOUTUBE_API_KEY?.length || 0);
    
    if (!YOUTUBE_API_KEY) {
      console.error('YouTube API key not configured');
      throw new Error('YouTube API key not configured');
    }

    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (jsonError) {
      console.error('Failed to parse JSON:', jsonError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { channelInput } = body;
    
    if (!channelInput) {
      throw new Error('Channel input is required');
    }

    console.log('Looking up channel:', channelInput);

    // Get channel ID
    const channelId = await getChannelId(channelInput);
    
    if (!channelId) {
      throw new Error('Channel not found');
    }

    console.log('Successfully found channel ID:', channelId);

    // Get basic channel info to verify it exists
    let channelResponse;
    let channelData;
    
    try {
      channelResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`                                                                                                 
      );
      
      console.log('Channel verification response status:', channelResponse.status);
      console.log('Channel verification response ok:', channelResponse.ok);
      
      if (!channelResponse.ok) {
        const errorText = await channelResponse.text();
        console.error('Channel verification failed:', channelResponse.status, channelResponse.statusText, errorText);                                                                                                   
        throw new Error(`Failed to verify channel: ${channelResponse.status} ${channelResponse.statusText}`);                                                                                                           
      }
      
      channelData = await channelResponse.json();
      console.log('Channel verification response:', channelData);
    } catch (fetchError) {
      console.error('Error during channel verification:', fetchError);
      throw new Error(`Channel verification error: ${fetchError.message}`);
    }
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error('Channel not found after verification');
    }
    
    const channel = channelData.items[0];

    return new Response(
      JSON.stringify({ 
        channel: {
          title: channel.snippet.title,
          id: channelId,
          statistics: channel.statistics
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in youtube-channel-id-lookup function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
