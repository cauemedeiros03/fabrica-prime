import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState, useRef, ChangeEvent } from "react";
import { AppShell } from "@/components/app-shell";
import { toast } from "sonner";
import { Loader2, Upload, Building2, Phone, MapPin, Mail, Key, User } from "lucide-react";
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

const profileSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

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

  // Estados adicionais para abas, perfil e senha
  const [activeTab, setActiveTab] = useState<"negocio" | "conta">("negocio");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const form = useForm<ConfigFormValues>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      nome_marcenaria: "",
      telefone: "",
      endereco: "",
      logo_url: "",
    },
  });

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: "",
    },
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      try {
        setFetching(true);
        // 1. Carregar Configurações do Negócio
        const { data: configData, error: configError } = await supabase
          .from("configuracoes_marcenaria")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (configError) throw configError;

        if (configData) {
          form.reset({
            nome_marcenaria: configData.nome_marcenaria || "",
            telefone: configData.telefone || "",
            endereco: configData.endereco || "",
            logo_url: configData.logo_url || "",
          });
        }

        // 2. Carregar Perfil do Usuário
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("nome")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData) {
          profileForm.reset({
            nome: profileData.nome || "",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Não foi possível carregar os dados.");
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [user, form, profileForm]);

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

  const onProfileSubmit = async (values: ProfileFormValues) => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          nome: values.nome,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error("ERRO SALVAR PERFIL:", error);
      toast.error("Erro ao salvar o perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newPassword !== confirmNewPassword) {
      toast.error("As senhas não coincidem", {
        description: "Certifique-se de que a senha digitada em ambos os campos é idêntica."
      });
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Senha muito curta", {
        description: "A senha deve ter pelo menos 6 caracteres."
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error("Erro ao redefinir a senha", { description: error.message });
        return;
      }

      toast.success("Senha atualizada com sucesso!");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowChangePassword(false);
    } catch (error: any) {
      console.error("ERRO REDEFINIR SENHA:", error);
      toast.error("Erro inesperado ao atualizar a senha.", { description: error.message });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const loginProvider = user?.app_metadata?.provider || user?.app_metadata?.providers?.[0] || 'email';
  const isGoogle = loginProvider === 'google';

  return (
    <AppShell
      title="Configurações"
      subtitle="Gerencie os dados da sua marcenaria e sua conta"
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
          <div className="space-y-6">
            {/* Abas Superiores */}
            <div className="flex border-b border-border gap-2 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab("negocio")}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 -mb-[2px] cursor-pointer ${
                  activeTab === "negocio"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Perfil do Negócio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("conta")}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 -mb-[2px] cursor-pointer ${
                  activeTab === "conta"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                Minha Conta
              </button>
            </div>

            {/* Aba 1: Perfil do Negócio */}
            {activeTab === "negocio" && (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in duration-300">
                <div className="border bg-card rounded-2xl p-6 shadow-[var(--shadow-soft)]">
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
                          className="text-sm font-medium border bg-background px-4 py-2 rounded-lg hover:bg-accent transition inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
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
                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                  >
                    {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}

            {/* Aba 2: Minha Conta */}
            {activeTab === "conta" && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="border bg-card rounded-2xl p-6 shadow-[var(--shadow-soft)]">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold tracking-tight mb-1">Minha Conta</h3>
                      <p className="text-sm text-muted-foreground">
                        Gerencie suas informações pessoais de acesso.
                      </p>
                    </div>

                    <div className="space-y-5">
                      <div className="grid gap-2">
                        <label htmlFor="nome" className="text-sm font-medium flex items-center gap-2">
                          <User className="size-4 text-muted-foreground" /> Nome Completo
                        </label>
                        <input
                          id="nome"
                          {...profileForm.register("nome")}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          placeholder="Seu nome completo"
                        />
                        {profileForm.formState.errors.nome && (
                          <p className="text-xs text-destructive">{profileForm.formState.errors.nome.message}</p>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Mail className="size-4 text-muted-foreground" /> E-mail
                        </label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ""}
                          className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed opacity-80"
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          Tipo de Conta / Login
                        </label>
                        <div className="flex">
                          {isGoogle ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                              </svg>
                              Google
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20">
                              <Mail className="size-3.5" />
                              E-mail e Senha
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer"
                    >
                      {savingProfile && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Salvar Alterações
                    </button>
                  </div>
                </form>

                {/* Seção Gerenciar Senha */}
                <div className="border bg-card rounded-2xl p-6 shadow-[var(--shadow-soft)]">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold tracking-tight mb-1">Gerenciar Senha</h3>
                    <p className="text-sm text-muted-foreground">
                      {isGoogle 
                        ? "Sua conta está vinculada ao Google. Não é necessário gerenciar senha local." 
                        : "Altere sua senha de acesso ao sistema."}
                    </p>
                  </div>

                  {!isGoogle && (
                    <>
                      {!showChangePassword ? (
                        <button
                          type="button"
                          onClick={() => setShowChangePassword(true)}
                          className="text-sm font-medium border bg-background px-4 py-2 rounded-lg hover:bg-accent transition inline-flex items-center gap-2 cursor-pointer"
                        >
                          <Key className="size-4 text-muted-foreground" /> Alterar Senha
                        </button>
                      ) : (
                        <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md animate-in slide-in-from-top-2 duration-200">
                          <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                              Nova Senha
                            </label>
                            <input
                              type="password"
                              placeholder="Mínimo de 6 caracteres"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              required
                              minLength={6}
                            />
                          </div>
                          <div className="grid gap-2">
                            <label className="text-sm font-medium flex items-center gap-1.5">
                              Confirmar Nova Senha
                            </label>
                            <input
                              type="password"
                              placeholder="Repita a nova senha"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="submit"
                              disabled={updatingPassword}
                              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                            >
                              {updatingPassword && <Loader2 className="mr-2 size-3 animate-spin" />}
                              Salvar Nova Senha
                            </button>
                            <button
                              type="button"
                              disabled={updatingPassword}
                              onClick={() => {
                                setShowChangePassword(false);
                                setNewPassword("");
                                setConfirmNewPassword("");
                              }}
                              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
