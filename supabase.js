const SUPABASE_URL = "https://sjjalreowdizgybuospd.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3AZZ7jNCm5A9jqk_qxZHiQ_M2UyAZkg";

const { createClient } = supabase;

const carzaSupabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
