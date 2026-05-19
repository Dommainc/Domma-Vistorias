import { useState, createContext, useContext, ReactNode, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClienteSession {
  token_sessao: string;
  cliente_id: string;
  nome: string;
}

interface ClienteAuthContextType {
  session: ClienteSession | null;
  loading: boolean;
  login: (cpf: string, dataNascimento: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const ClienteAuthContext = createContext<ClienteAuthContextType | undefined>(undefined);

export function ClienteAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ClienteSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('cliente_session');
    if (stored) {
      try {
        setSession(JSON.parse(stored));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  const login = async (cpf: string, dataNascimento: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('authenticate-client', {
        body: { cpf, data_nascimento: dataNascimento },
      });
      if (error) return { error: 'Erro ao autenticar' };
      if (data?.error) return { error: data.error };
      const sess: ClienteSession = {
        token_sessao: data.token_sessao,
        cliente_id: data.cliente_id,
        nome: data.nome,
      };
      sessionStorage.setItem('cliente_session', JSON.stringify(sess));
      setSession(sess);
      return { error: null };
    } catch (e: any) {
      return { error: e.message || 'Erro de conexão' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('cliente_session');
    setSession(null);
  };

  return (
    <ClienteAuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </ClienteAuthContext.Provider>
  );
}

export function useClienteAuth() {
  const ctx = useContext(ClienteAuthContext);
  if (!ctx) throw new Error('useClienteAuth must be used within ClienteAuthProvider');
  return ctx;
}
