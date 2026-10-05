// Public Supabase settings. The publishable key is designed to ship inside the app;
// row level security on the database decides what each signed-in user can read and write.
// Never put the secret / service_role key in this file.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://lpfqevtdhedhanmncbov.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_10CYmWQDIji5WWMLh0Jk5g_gN4aW1Y_';
