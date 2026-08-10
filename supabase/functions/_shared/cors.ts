// Public Edge Functions in this repo are called directly from the browser
// (the public site, unauthenticated or with a person's own JWT), so each
// one needs these on every response, including the OPTIONS preflight.
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
