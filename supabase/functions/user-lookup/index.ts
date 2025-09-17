import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UserLookupRequest {
  email?: string;
  user_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, user_id }: UserLookupRequest = await req.json();

    if (!email && !user_id) {
      return new Response(
        JSON.stringify({ error: "Either email or user_id is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create a Supabase client with service role key to access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    let user;

    if (user_id) {
      // Look up user by user_id
      const { data: userData, error } = await supabaseAdmin.auth.admin.getUserById(user_id);
      
      if (error) {
        console.error("Error fetching user by ID:", error);
        return new Response(
          JSON.stringify({ error: "Failed to lookup user" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      user = userData.user;
    } else if (email) {
      // Look up user by email in auth.users
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

      if (error) {
        console.error("Error fetching users:", error);
        return new Response(
          JSON.stringify({ error: "Failed to lookup user" }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      // Find user with matching email
      user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
    }

    if (!user) {
      return new Response(
        JSON.stringify({ exists: false }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Get the user's profile for additional info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({ 
        exists: true, 
        user_id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.user_metadata?.full_name || user.email
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in user-lookup function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);