import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { Loader2, Upload, Building2, Phone, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

// Tipos do schema Zod
const configSchema = z.object({
  nome_marcenaria: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  telefone: z.string().min(10, "Telefone inválido."),
  endereco: z.string().min(5, "Endereço deve ter pelo menos 5 caracteres."),
  logo_url: z.string().optional(),
});

type ConfigFormValues = z.infer<typeof configSchema>;

export const Route = createFileRoute("/configuracoes")({
  component: ConfiguracoesPage,
  head: () => ({
    meta: [
      { title: "Configurações · Sua bancada" },
    ],
  }),
});

function ConfiguracoesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      nome_marcenaria: "",
      telefone: "",
      endereco: "",
      logo_url: "",
    },
  });

  useEffect(() => {
    async function loadConfig() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("configuracoes_marcenaria")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          throw error;
        }

        if (data) {
          form.reset({
            nome_marcenaria: data.nome_marcenaria || "",
            telefone: data.telefone || "",
            endereco: data.endereco || "",
            logo_url: data.logo_url || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar configurações:", error);
        toast.error("Não foi possível carregar os dados.");
      } finally {
        setFetching(false);
      }
    }
    loadConfig();
  }, [user, form]);

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath);

      form.setValue('logo_url', data.publicUrl, { shouldDirty: true });
      toast.success('Logo enviada! Salve as alterações para confirmar.');
    } catch (error) {
      console.error('ERRO UPLOAD:', error);
      toast.error('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onSubmit = async (values: ConfigFormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from("configuracoes_marcenaria")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const payload = {
        user_id: user.id,
        nome_marcenaria: values.nome_marcenaria,
        telefone: values.telefone,
        endereco: values.endereco,
        logo_url: values.logo_url,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        const result = await supabase
          .from("configuracoes_marcenaria")
          .update(payload)
          .eq("id", existing.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("configuracoes_marcenaria")
          .insert([payload]);
        error = result.error;
      }

      if (error) throw error;
      toast.success("Configurações salvas com sucesso!");
      window.dispatchEvent(new Event("configuracoes_updated"));
    } catch (error) {
      console.error("ERRO SALVAR:", error);
      toast.error("Erro ao salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="Configurações"
      subtitle="Gerencie os dados da sua marcenaria"
      breadcrumbs={[
        { label: "Painel", to: "/" },
        { label: "Configurações" },
      ]}
    >
      <div className="max-w-2xl">
        {fetching ? (
          <div className="flex justify-center p-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="border bg-card rounded-2xl p-6 shadow-[var(--shadow-soft)] animate-in fade-in duration-300">
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold tracking-tight mb-1">Perfil do Negócio</h3>
                <p className="text-sm text-muted-foreground">
                  Estas informações aparecerão nos seus orçamentos e recibos gerados.
                </p>
              </div>

              <div className="space-y-5">
                {/* Logo Upload Placeholder */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Logo da Empresa</label>
                  <div className="flex items-center gap-4">
                    <div className="size-16 rounded-xl border-2 border-dashed border-input bg-muted/50 grid place-items-center overflow-hidden">
                      {form.watch("logo_url") ? (
                        <img src={form.watch("logo_url")} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="size-6 text-muted-foreground/50" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      className="text-sm font-medium border bg-background px-4 py-2 rounded-lg hover:bg-accent transition inline-flex items-center gap-2 disabled:opacity-50"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Upload className="size-4" />
                      )}
                      {uploading ? "Enviando..." : "Escolher imagem"}
                    </button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <label htmlFor="nome_marcenaria" className="text-sm font-medium flex items-center gap-2">
                    <Building2 className="size-4 text-muted-foreground" /> Nome da Marcenaria
                  </label>
                  <input
                    id="nome_marcenaria"
                    {...form.register("nome_marcenaria")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Ex: Marcenaria Silva"
                  />
                  {form.formState.errors.nome_marcenaria && (
                    <p className="text-xs text-destructive">{form.formState.errors.nome_marcenaria.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="telefone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="size-4 text-muted-foreground" /> Telefone / WhatsApp
                  </label>
                  <input
                    id="telefone"
                    {...form.register("telefone")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="(00) 00000-0000"
                  />
                  {form.formState.errors.telefone && (
                    <p className="text-xs text-destructive">{form.formState.errors.telefone.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <label htmlFor="endereco" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" /> Endereço Completo
                  </label>
                  <textarea
                    id="endereco"
                    {...form.register("endereco")}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Rua das Madeiras, 123 - Centro..."
                  />
                  {form.formState.errors.endereco && (
                    <p className="text-xs text-destructive">{form.formState.errors.endereco.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              >
                {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                Salvar Alterações
              </button>
            </div>
          </form>
        )}
      </div>
    </AppShell>
  );
}
