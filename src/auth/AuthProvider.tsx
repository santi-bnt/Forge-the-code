import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseConfigured } from './supabase';

type AuthContextValue = {
  user: User | null; session: Session | null; isLoading: boolean; isAuthenticated: boolean; isOffline: boolean; configured: boolean;
  signIn(email: string, password: string): Promise<void>;
  signUp(email: string, password: string, name: string): Promise<boolean>;
  resendConfirmation(email: string): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setLoading] = useState(supabaseConfigured);
  const [isOffline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const online = () => setOffline(false); const offline = () => setOffline(true);
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    if (!supabase) return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => { setSession(next); setLoading(false); });
    return () => { active = false; subscription.unsubscribe(); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);
  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null, session, isLoading, isAuthenticated: Boolean(session?.user), isOffline, configured: supabaseConfigured,
    async signIn(email, password) { if (!supabase) throw new Error('Configura Supabase para habilitar cuentas.'); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; },
    async signUp(email, password, name) { if (!supabase) throw new Error('Configura Supabase para habilitar cuentas.'); const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${location.origin}/auth/callback` } }); if (error) throw error; return Boolean(data.session); },
    async resendConfirmation(email) { if (!supabase) throw new Error('Configura Supabase para habilitar cuentas.'); const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${location.origin}/auth/callback` } }); if (error) throw error; },
    async signOut() { if (!supabase) { setSession(null); return; } const { error } = await supabase.auth.signOut({ scope: navigator.onLine ? 'global' : 'local' }); if (error) throw error; setSession(null); },
    async resetPassword(email) { if (!supabase) throw new Error('Configura Supabase para habilitar cuentas.'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` }); if (error) throw error; },
    async updatePassword(password) { if (!supabase) throw new Error('Configura Supabase para habilitar cuentas.'); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; },
  }), [session, isLoading, isOffline]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used inside AuthProvider'); return value; }
