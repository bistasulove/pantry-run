// Standard Supabase CORS helper. The categorize_item function is called from
// the browser, so it needs to respond to OPTIONS preflights and echo the
// allowed headers on every response.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
