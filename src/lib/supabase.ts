import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('ERRO: Variáveis de ambiente Supabase ausentes!');
  console.log('Verifique se VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão configurados.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
