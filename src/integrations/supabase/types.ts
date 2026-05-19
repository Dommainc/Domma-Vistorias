export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agendamentos: {
        Row: {
          atualizado_em: string | null
          cancelado_em: string | null
          cancelado_por_tipo: string | null
          cliente_id: string
          confirmado_em: string | null
          criado_em: string | null
          data_hora: string
          id: string
          motivo_cancelamento: string | null
          observacoes: string | null
          realizado_em: string | null
          status: string | null
          unidade_id: string
        }
        Insert: {
          atualizado_em?: string | null
          cancelado_em?: string | null
          cancelado_por_tipo?: string | null
          cliente_id: string
          confirmado_em?: string | null
          criado_em?: string | null
          data_hora: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          realizado_em?: string | null
          status?: string | null
          unidade_id: string
        }
        Update: {
          atualizado_em?: string | null
          cancelado_em?: string | null
          cancelado_por_tipo?: string | null
          cliente_id?: string
          confirmado_em?: string | null
          criado_em?: string | null
          data_hora?: string
          id?: string
          motivo_cancelamento?: string | null
          observacoes?: string | null
          realizado_em?: string | null
          status?: string | null
          unidade_id?: string
        }
        Relationships: [
          { foreignKeyName: "agendamentos_cliente_id_fkey"; columns: ["cliente_id"]; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "agendamentos_unidade_id_fkey"; columns: ["unidade_id"]; referencedRelation: "unidades"; referencedColumns: ["id"] }
        ]
      }
      clientes: {
        Row: {
          cpf: string
          criado_em: string | null
          criado_por: string | null
          data_nascimento: string
          email: string
          id: string
          link_enviado_em: string | null
          link_enviado_por: string | null
          nome_completo: string
          telefone: string | null
          token_agendamento: string | null
          token_expira_em: string | null
          token_usado: boolean | null
          unidade_id: string
        }
        Insert: {
          cpf: string
          criado_em?: string | null
          criado_por?: string | null
          data_nascimento: string
          email: string
          id?: string
          link_enviado_em?: string | null
          link_enviado_por?: string | null
          nome_completo: string
          telefone?: string | null
          token_agendamento?: string | null
          token_expira_em?: string | null
          token_usado?: boolean | null
          unidade_id: string
        }
        Update: {
          cpf?: string
          criado_em?: string | null
          criado_por?: string | null
          data_nascimento?: string
          email?: string
          id?: string
          link_enviado_em?: string | null
          link_enviado_por?: string | null
          nome_completo?: string
          telefone?: string | null
          token_agendamento?: string | null
          token_expira_em?: string | null
          token_usado?: boolean | null
          unidade_id?: string
        }
        Relationships: [
          { foreignKeyName: "clientes_unidade_id_fkey"; columns: ["unidade_id"]; referencedRelation: "unidades"; referencedColumns: ["id"] },
          { foreignKeyName: "clientes_criado_por_fkey"; columns: ["criado_por"]; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "clientes_link_enviado_por_fkey"; columns: ["link_enviado_por"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      configuracoes: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          chave: string
          descricao: string | null
          id: string
          valor: string
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          chave: string
          descricao?: string | null
          id?: string
          valor: string
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          chave?: string
          descricao?: string | null
          id?: string
          valor?: string
        }
        Relationships: [
          { foreignKeyName: "configuracoes_atualizado_por_fkey"; columns: ["atualizado_por"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      disponibilidade: {
        Row: {
          ativo: boolean | null
          data: string
          empreendimento_id: string | null
          hora_fim: string
          hora_inicio: string
          id: string
          intervalo_minutos: number | null
          vagas_por_horario: number | null
        }
        Insert: {
          ativo?: boolean | null
          data: string
          empreendimento_id?: string | null
          hora_fim: string
          hora_inicio: string
          id?: string
          intervalo_minutos?: number | null
          vagas_por_horario?: number | null
        }
        Update: {
          ativo?: boolean | null
          data?: string
          empreendimento_id?: string | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          intervalo_minutos?: number | null
          vagas_por_horario?: number | null
        }
        Relationships: [
          { foreignKeyName: "disponibilidade_empreendimento_id_fkey"; columns: ["empreendimento_id"]; referencedRelation: "empreendimentos"; referencedColumns: ["id"] }
        ]
      }
      documentos: {
        Row: {
          arquivo_url: string
          cliente_id: string
          criado_em: string | null
          enviado_por: string | null
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_documento: string | null
        }
        Insert: {
          arquivo_url: string
          cliente_id: string
          criado_em?: string | null
          enviado_por?: string | null
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
        }
        Update: {
          arquivo_url?: string
          cliente_id?: string
          criado_em?: string | null
          enviado_por?: string | null
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_documento?: string | null
        }
        Relationships: [
          { foreignKeyName: "documentos_cliente_id_fkey"; columns: ["cliente_id"]; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "documentos_enviado_por_fkey"; columns: ["enviado_por"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      empreendimentos: {
        Row: {
          aceita_agendamento: boolean | null
          ativo: boolean | null
          cidade: string
          criado_em: string | null
          descricao: string | null
          endereco: string
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          aceita_agendamento?: boolean | null
          ativo?: boolean | null
          cidade: string
          criado_em?: string | null
          descricao?: string | null
          endereco: string
          foto_url?: string | null
          id?: string
          nome: string
        }
        Update: {
          aceita_agendamento?: boolean | null
          ativo?: boolean | null
          cidade?: string
          criado_em?: string | null
          descricao?: string | null
          endereco?: string
          foto_url?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      historico_status: {
        Row: {
          alterado_por_id: string | null
          alterado_por_nome: string | null
          alterado_por_tipo: string | null
          criado_em: string | null
          entidade_id: string
          entidade_tipo: string
          id: string
          motivo: string | null
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          alterado_por_id?: string | null
          alterado_por_nome?: string | null
          alterado_por_tipo?: string | null
          criado_em?: string | null
          entidade_id: string
          entidade_tipo: string
          id?: string
          motivo?: string | null
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          alterado_por_id?: string | null
          alterado_por_nome?: string | null
          alterado_por_tipo?: string | null
          criado_em?: string | null
          entidade_id?: string
          entidade_tipo?: string
          id?: string
          motivo?: string | null
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: []
      }
      log_envios_link: {
        Row: {
          cliente_id: string
          email_destino: string
          enviado_em: string | null
          enviado_por: string
          id: string
          sucesso: boolean | null
        }
        Insert: {
          cliente_id: string
          email_destino: string
          enviado_em?: string | null
          enviado_por: string
          id?: string
          sucesso?: boolean | null
        }
        Update: {
          cliente_id?: string
          email_destino?: string
          enviado_em?: string | null
          enviado_por?: string
          id?: string
          sucesso?: boolean | null
        }
        Relationships: [
          { foreignKeyName: "log_envios_link_cliente_id_fkey"; columns: ["cliente_id"]; referencedRelation: "clientes"; referencedColumns: ["id"] },
          { foreignKeyName: "log_envios_link_enviado_por_fkey"; columns: ["enviado_por"]; referencedRelation: "profiles"; referencedColumns: ["id"] }
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          criado_em: string | null
          email: string
          id: string
          nome: string
          perfil: string
        }
        Insert: {
          ativo?: boolean | null
          criado_em?: string | null
          email: string
          id: string
          nome: string
          perfil: string
        }
        Update: {
          ativo?: boolean | null
          criado_em?: string | null
          email?: string
          id?: string
          nome?: string
          perfil?: string
        }
        Relationships: []
      }
      sessoes_cliente: {
        Row: {
          cliente_id: string
          criado_em: string | null
          expira_em: string
          id: string
          token_sessao: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string | null
          expira_em?: string
          id?: string
          token_sessao?: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string | null
          expira_em?: string
          id?: string
          token_sessao?: string
        }
        Relationships: [
          { foreignKeyName: "sessoes_cliente_cliente_id_fkey"; columns: ["cliente_id"]; referencedRelation: "clientes"; referencedColumns: ["id"] }
        ]
      }
      unidades: {
        Row: {
          aceita_agendamento: boolean | null
          andar: string | null
          bloco: string | null
          criado_em: string | null
          disponibilidade_ativa: boolean | null
          disponibilidade_data_fim: string | null
          disponibilidade_data_inicio: string | null
          disponibilidade_dias_semana: number[] | null
          disponibilidade_hora_fim: string | null
          disponibilidade_hora_inicio: string | null
          empreendimento_id: string
          id: string
          numero: string
          status: string | null
          tipo: string | null
        }
        Insert: {
          aceita_agendamento?: boolean | null
          andar?: string | null
          bloco?: string | null
          criado_em?: string | null
          disponibilidade_ativa?: boolean | null
          disponibilidade_data_fim?: string | null
          disponibilidade_data_inicio?: string | null
          disponibilidade_dias_semana?: number[] | null
          disponibilidade_hora_fim?: string | null
          disponibilidade_hora_inicio?: string | null
          empreendimento_id: string
          id?: string
          numero: string
          status?: string | null
          tipo?: string | null
        }
        Update: {
          aceita_agendamento?: boolean | null
          andar?: string | null
          bloco?: string | null
          criado_em?: string | null
          disponibilidade_ativa?: boolean | null
          disponibilidade_data_fim?: string | null
          disponibilidade_data_inicio?: string | null
          disponibilidade_dias_semana?: number[] | null
          disponibilidade_hora_fim?: string | null
          disponibilidade_hora_inicio?: string | null
          empreendimento_id?: string
          id?: string
          numero?: string
          status?: string | null
          tipo?: string | null
        }
        Relationships: [
          { foreignKeyName: "unidades_empreendimento_id_fkey"; columns: ["empreendimento_id"]; referencedRelation: "empreendimentos"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: {}
    Functions: {
      get_user_perfil: {
        Args: { _user_id: string }
        Returns: string
      }
    }
    Enums: {}
    CompositeTypes: {}
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
