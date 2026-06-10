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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assinaturas: {
        Row: {
          id: string
          usuario_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          status: "active" | "past_due" | "unpaid" | "canceled" | null
          data_expiracao: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: "active" | "past_due" | "unpaid" | "canceled" | null
          data_expiracao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          status?: "active" | "past_due" | "unpaid" | "canceled" | null
          data_expiracao?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalogo_produtos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          preco: number | null
          tipo_movel: string | null
          material: string | null
          cor_acabamento: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          preco?: number | null
          tipo_movel?: string | null
          material?: string | null
          cor_acabamento?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          preco?: number | null
          tipo_movel?: string | null
          material?: string | null
          cor_acabamento?: string | null
          criado_em?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          cidade: string | null
          cpf: string | null
          user_id: string
          cep: string | null
          endereco: string | null
          numero: string | null
          complemento: string | null
          bairro: string | null
          instagram: string | null
          origem: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cpf?: string | null
          user_id?: string
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          instagram?: string | null
          origem?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cpf?: string | null
          user_id?: string
          cep?: string | null
          endereco?: string | null
          numero?: string | null
          complemento?: string | null
          bairro?: string | null
          instagram?: string | null
          origem?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      despesas: {
        Row: {
          id: string
          created_at: string
          user_id: string
          descricao: string
          valor: number
          data: string
        }
        Insert: {
          id?: string
          created_at?: string
          user_id?: string
          descricao: string
          valor: number
          data?: string
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          descricao?: string
          valor?: number
          data?: string
        }
        Relationships: []
      }
      configuracoes_marcenaria: {
        Row: {
          endereco: string | null
          id: string
          logo_url: string | null
          nome_marcenaria: string
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_marcenaria: string
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_marcenaria?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      etapas_pedido: {
        Row: {
          autor_id: string | null
          created_at: string
          etapa_anterior: Database["public"]["Enums"]["etapa_producao"] | null
          etapa_nova: Database["public"]["Enums"]["etapa_producao"]
          id: string
          observacao: string | null
          pedido_id: string
        }
        Insert: {
          autor_id?: string | null
          created_at?: string
          etapa_anterior?: Database["public"]["Enums"]["etapa_producao"] | null
          etapa_nova: Database["public"]["Enums"]["etapa_producao"]
          id?: string
          observacao?: string | null
          pedido_id: string
        }
        Update: {
          autor_id?: string | null
          created_at?: string
          etapa_anterior?: Database["public"]["Enums"]["etapa_producao"] | null
          etapa_nova?: Database["public"]["Enums"]["etapa_producao"]
          id?: string
          observacao?: string | null
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etapas_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          forma: string | null
          id: string
          observacao: string | null
          pago_em: string
          pedido_id: string
          valor: number
        }
        Insert: {
          created_at?: string
          forma?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string
          pedido_id: string
          valor: number
        }
        Update: {
          created_at?: string
          forma?: string | null
          id?: string
          observacao?: string | null
          pago_em?: string
          pedido_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          anexos: string[] | null
          cliente_id: string
          cliente_nome: string | null
          cor: string | null
          created_at: string
          desconto: number
          entrega: string | null
          etapa: Database["public"]["Enums"]["etapa_producao"]
          id: string
          material: string | null
          numero: string
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["prioridade_pedido"]
          produto: string
          tipo: string | null
          updated_at: string
          user_id: string
          valor_pago: number
          valor_total: number
        }
        Insert: {
          anexos?: string[] | null
          cliente_id: string
          cliente_nome?: string | null
          cor?: string | null
          created_at?: string
          desconto?: number
          entrega?: string | null
          etapa?: Database["public"]["Enums"]["etapa_producao"]
          id?: string
          material?: string | null
          numero: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_pedido"]
          produto: string
          tipo?: string | null
          updated_at?: string
          user_id?: string
          valor_pago?: number
          valor_total?: number
        }
        Update: {
          anexos?: string[] | null
          cliente_id?: string
          cliente_nome?: string | null
          cor?: string | null
          created_at?: string
          desconto?: number
          entrega?: string | null
          etapa?: Database["public"]["Enums"]["etapa_producao"]
          id?: string
          material?: string | null
          numero?: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["prioridade_pedido"]
          produto?: string
          tipo?: string | null
          updated_at?: string
          user_id?: string
          valor_pago?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string | null
          status_assinatura: string | null
          telefone: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          status_assinatura?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          status_assinatura?: string | null
          telefone?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "producao" | "financeiro" | "vendedor"
      etapa_producao:
        | "pedido-recebido"
        | "separando-madeira"
        | "corte"
        | "montagem"
        | "acabamento"
        | "pintura"
        | "qualidade"
        | "pronto-entrega"
        | "entregue"
      prioridade_pedido: "baixa" | "media" | "alta" | "urgente"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "producao", "financeiro", "vendedor"],
      etapa_producao: [
        "pedido-recebido",
        "separando-madeira",
        "corte",
        "montagem",
        "acabamento",
        "pintura",
        "qualidade",
        "pronto-entrega",
        "entregue",
      ],
      prioridade_pedido: ["baixa", "media", "alta", "urgente"],
    },
  },
} as const
