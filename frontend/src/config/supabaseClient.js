import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obbzgmvrykhlfcziqttj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iYnpnbXZyeWtobGZjemlxdHRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxMTEwMDUsImV4cCI6MjA3NzY4NzAwNX0.O-8TJ0BPn_3A-WIaOFNf4ekQxUrDkxItuWoz0pXl7rM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);