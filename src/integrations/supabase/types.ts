export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      auditoria: {
        Row: {
          acao: string
          created_at: string
          dados_antes: Json | null
          dados_depois: Json | null
          id: number
          registro_id: string
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: number
          registro_id: string
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_antes?: Json | null
          dados_depois?: Json | null
          id?: number
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      clientes: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          codigo: number
          complemento: string | null
          cpf_cnpj: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          numero: string | null
          observacoes: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: number
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          codigo?: number
          complemento?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          numero?: string | null
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          cnpj: string | null
          condicoes_garantia: string
          email: string | null
          endereco: string | null
          garantia_padrao_dias: number
          id: number
          nome: string
          slogan: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          cnpj?: string | null
          condicoes_garantia?: string
          email?: string | null
          endereco?: string | null
          garantia_padrao_dias?: number
          id?: number
          nome?: string
          slogan?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          cnpj?: string | null
          condicoes_garantia?: string
          email?: string | null
          endereco?: string | null
          garantia_padrao_dias?: number
          id?: number
          nome?: string
          slogan?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      documentos_servico: {
        Row: {
          arquivo_path: string
          data_emissao: string
          emitido_por: string | null
          id: string
          motivo: string | null
          ordem_servico_id: string
          versao: number
        }
        Insert: {
          arquivo_path: string
          data_emissao?: string
          emitido_por?: string | null
          id?: string
          motivo?: string | null
          ordem_servico_id: string
          versao: number
        }
        Update: {
          arquivo_path?: string
          data_emissao?: string
          emitido_por?: string | null
          id?: string
          motivo?: string | null
          ordem_servico_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "documentos_servico_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      garantias: {
        Row: {
          condicoes: string | null
          created_at: string
          data_inicio: string
          data_vencimento: string | null
          descricao_cobertura: string
          empresa: string
          id: string
          ordem_servico_id: string
          pecas_cobertas: string | null
          prazo_dias: number
          responsavel_tecnico: string | null
        }
        Insert: {
          condicoes?: string | null
          created_at?: string
          data_inicio: string
          data_vencimento?: string | null
          descricao_cobertura: string
          empresa?: string
          id?: string
          ordem_servico_id: string
          pecas_cobertas?: string | null
          prazo_dias: number
          responsavel_tecnico?: string | null
        }
        Update: {
          condicoes?: string | null
          created_at?: string
          data_inicio?: string
          data_vencimento?: string | null
          descricao_cobertura?: string
          empresa?: string
          id?: string
          ordem_servico_id?: string
          pecas_cobertas?: string | null
          prazo_dias?: number
          responsavel_tecnico?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "garantias_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_envios: {
        Row: {
          canal: string
          cliente_id: string | null
          data_envio: string
          destinatario: string | null
          documento_id: string | null
          enviado_por: string | null
          id: string
          mensagem_erro: string | null
          ordem_servico_id: string
          status_envio: string
        }
        Insert: {
          canal: string
          cliente_id?: string | null
          data_envio?: string
          destinatario?: string | null
          documento_id?: string | null
          enviado_por?: string | null
          id?: string
          mensagem_erro?: string | null
          ordem_servico_id: string
          status_envio: string
        }
        Update: {
          canal?: string
          cliente_id?: string | null
          data_envio?: string
          destinatario?: string | null
          documento_id?: string | null
          enviado_por?: string | null
          id?: string
          mensagem_erro?: string | null
          ordem_servico_id?: string
          status_envio?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_envios_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_envios_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_ordem_servico: {
        Row: {
          descricao: string
          id: string
          ordem_servico_id: string
          quantidade: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          descricao: string
          id?: string
          ordem_servico_id: string
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          descricao?: string
          id?: string
          ordem_servico_id?: string
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_ordem_servico_ordem_servico_id_fkey"
            columns: ["ordem_servico_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          acessorios: string | null
          cliente_id: string
          condicoes_garantia: string | null
          created_at: string
          created_by: string | null
          data_atendimento: string | null
          data_conclusao: string | null
          data_pagamento: string | null
          data_solicitacao: string
          desconto: number
          diagnostico: string | null
          estado_conservacao: string | null
          forma_pagamento: string | null
          id: string
          marca: string
          modelo: string
          numero_os: number
          numero_serie: string | null
          observacoes: string | null
          pecas_garantia: string | null
          prazo_garantia_dias: number
          problema_relatado: string
          servico_executado: string | null
          status_pagamento: Database["public"]["Enums"]["status_pagamento"]
          status_servico: Database["public"]["Enums"]["status_servico"]
          tecnico_responsavel_id: string | null
          tipo_equipamento: Database["public"]["Enums"]["tipo_equipamento"]
          updated_at: string
          valor_deslocamento: number
          valor_mao_obra: number
          valor_pecas: number
          valor_recebido: number
          valor_total: number | null
        }
        Insert: {
          acessorios?: string | null
          cliente_id: string
          condicoes_garantia?: string | null
          created_at?: string
          created_by?: string | null
          data_atendimento?: string | null
          data_conclusao?: string | null
          data_pagamento?: string | null
          data_solicitacao?: string
          desconto?: number
          diagnostico?: string | null
          estado_conservacao?: string | null
          forma_pagamento?: string | null
          id?: string
          marca?: string
          modelo?: string
          numero_os?: number
          numero_serie?: string | null
          observacoes?: string | null
          pecas_garantia?: string | null
          prazo_garantia_dias?: number
          problema_relatado?: string
          servico_executado?: string | null
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          status_servico?: Database["public"]["Enums"]["status_servico"]
          tecnico_responsavel_id?: string | null
          tipo_equipamento: Database["public"]["Enums"]["tipo_equipamento"]
          updated_at?: string
          valor_deslocamento?: number
          valor_mao_obra?: number
          valor_pecas?: number
          valor_recebido?: number
          valor_total?: number | null
        }
        Update: {
          acessorios?: string | null
          cliente_id?: string
          condicoes_garantia?: string | null
          created_at?: string
          created_by?: string | null
          data_atendimento?: string | null
          data_conclusao?: string | null
          data_pagamento?: string | null
          data_solicitacao?: string
          desconto?: number
          diagnostico?: string | null
          estado_conservacao?: string | null
          forma_pagamento?: string | null
          id?: string
          marca?: string
          modelo?: string
          numero_os?: number
          numero_serie?: string | null
          observacoes?: string | null
          pecas_garantia?: string | null
          prazo_garantia_dias?: number
          problema_relatado?: string
          servico_executado?: string | null
          status_pagamento?: Database["public"]["Enums"]["status_pagamento"]
          status_servico?: Database["public"]["Enums"]["status_servico"]
          tecnico_responsavel_id?: string | null
          tipo_equipamento?: Database["public"]["Enums"]["tipo_equipamento"]
          updated_at?: string
          valor_deslocamento?: number
          valor_mao_obra?: number
          valor_pecas?: number
          valor_recebido?: number
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_responsavel_id_fkey"
            columns: ["tecnico_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_finance: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "tecnico" | "atendimento"
      status_pagamento: "pendente" | "parcial" | "pago"
      status_servico:
        | "solicitado"
        | "agendado"
        | "em_diagnostico"
        | "aguardando_aprovacao"
        | "aguardando_peca"
        | "em_execucao"
        | "concluido"
        | "cancelado"
      tipo_equipamento: "maquina_lavar" | "lava_seca" | "lava_loucas"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "tecnico", "atendimento"],
      status_pagamento: ["pendente", "parcial", "pago"],
      status_servico: [
        "solicitado",
        "agendado",
        "em_diagnostico",
        "aguardando_aprovacao",
        "aguardando_peca",
        "em_execucao",
        "concluido",
        "cancelado",
      ],
      tipo_equipamento: ["maquina_lavar", "lava_seca", "lava_loucas"],
    },
  },
} as const
