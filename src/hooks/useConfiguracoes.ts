import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Configuracao {
  id: string;
  chave: string;
  valor: string;
  descricao: string | null;
}

export function useConfiguracoes() {
  return useQuery({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('configuracoes').select('*');
      if (error) throw error;
      return data as unknown as Configuracao[];
    },
    staleTime: 1000 * 60 * 30, // 30 min cache
  });
}

export function useConfigValue(chave: string) {
  const { data } = useConfiguracoes();
  return data?.find(c => c.chave === chave)?.valor;
}

export function useUpdateConfiguracao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const { error } = await supabase
        .from('configuracoes')
        .update({ valor, atualizado_em: new Date().toISOString() } as any)
        .eq('chave', chave);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracoes'] }),
  });
}
