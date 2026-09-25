import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, UserPlus, Check } from "lucide-react";
import { type Cliente } from "@/hooks/use-clientes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  value?: string;
  onSelect: (cliente: Cliente | null) => void;
  onCreateNew?: (nome: string) => void;
  disabled?: boolean;
}

export function ClienteAutocomplete({
  value,
  onSelect,
  onCreateNew,
  disabled,
}: Props) {
  const { user } = useAuth();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Cliente[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [selected, setSelected] = useState<Cliente | null>(null);
  const [loadingSelected, setLoadingSelected] = useState(false);
  const [open, setOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  // ============================================================
  // DEBOUNCE DA BUSCA
  // ============================================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // ============================================================
  // CARREGAR CLIENTE SELECIONADO
  // ============================================================

  useEffect(() => {
    const clienteId = value;

    if (!clienteId) {
      setSelected(null);
      return;
    }

    let active = true;

    async function fetchSelected() {
      setLoadingSelected(true);

      try {
        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", String(clienteId))
          .single();

        if (error) throw error;

        if (active && data) {
          setSelected(data as Cliente);
        }
      } catch (err) {
        console.error("Erro ao buscar cliente selecionado:", err);
      } finally {
        if (active) {
          setLoadingSelected(false);
        }
      }
    }

    fetchSelected();

    return () => {
      active = false;
    };
  }, [value]);

  // ============================================================
  // BUSCAR CLIENTES
  // ============================================================

  useEffect(() => {
    const userId = user?.id;

    if (!open || !userId) {
      setResults([]);
      return;
    }

    let active = true;

    async function fetchResults() {
      setLoadingResults(true);

      try {
        const q = debouncedQuery.trim();

        let queryBuilder = supabase
          .from("clientes")
          .select(
            "id, user_id, nome, telefone, email, cidade, observacoes, cpf, cep, endereco, numero, complemento, bairro, instagram, origem, created_at, updated_at"
          )
          .eq("user_id", String(userId));

        if (q) {
          queryBuilder = queryBuilder.or(
            `nome.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%`
          );
        }

        const { data, error } = await queryBuilder
          .order("nome")
          .limit(10);

        if (error) throw error;

        if (active) {
          setResults((data || []) as Cliente[]);
        }
      } catch (err) {
        console.error("Erro ao buscar clientes:", err);
      } finally {
        if (active) {
          setLoadingResults(false);
        }
      }
    }

    fetchResults();

    return () => {
      active = false;
    };
  }, [debouncedQuery, open, user?.id]);

  const isLoading = loadingResults || loadingSelected;

  // ============================================================
  // POSICIONAMENTO DO DROPDOWN
  // ============================================================

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      if (!inputContainerRef.current) return;

      const rect = inputContainerRef.current.getBoundingClientRect();

      const dropdownHeight = 280;
      const spaceBelow = window.innerHeight - rect.bottom;

      const showAbove =
        spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setCoords({
        top: showAbove
          ? rect.top - dropdownHeight - 4
          : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();

    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  // ============================================================
  // FECHAR AO CLICAR FORA
  // ============================================================

  useEffect(() => {
    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;

      if (!target) return;

      const clickedInsideComponent =
        ref.current?.contains(target);

      const clickedInsidePortal =
        target.closest(
          '[data-autocomplete-portal="true"]'
        );

      if (!clickedInsideComponent && !clickedInsidePortal) {
        setOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      onDocPointerDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        onDocPointerDown
      );
    };
  }, []);

  // ============================================================
  // SELECIONAR CLIENTE
  // ============================================================

  const handleSelectCliente = (cliente: Cliente) => {
    // Atualiza imediatamente o estado visual
    setSelected(cliente);
    setQuery(cliente.nome || "");

    // Fecha o dropdown
    setOpen(false);

    // Envia o cliente completo para o formulário pai
    onSelect(cliente);
  };

  // ============================================================
  // NOVO CLIENTE
  // ============================================================

  const handleCreateNew = () => {
    const nome = query.trim();

    if (!nome || !onCreateNew) return;

    setSelected(null);
    setOpen(false);

    onCreateNew(nome);
  };

  const exactMatch = results.some(
    (c) =>
      c.nome?.toLowerCase() ===
      query.trim().toLowerCase()
  );

  return (
    <div ref={ref} className="relative">
      {/* ======================================================
          CABEÇALHO
      ====================================================== */}

      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">
          Cliente *
        </label>

        {!disabled && onCreateNew && (
          <button
            type="button"
            onClick={handleCreateNew}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
          >
            <UserPlus className="size-3" />
            + Novo Cliente
          </button>
        )}
      </div>

      {/* ======================================================
          INPUT
      ====================================================== */}

      <div
        ref={inputContainerRef}
        className="mt-1 relative"
      >
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />

        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={
            isLoading
              ? "Carregando..."
              : "Buscar por nome, telefone ou email..."
          }
          onChange={(e) => {
            const newValue = e.target.value;

            setQuery(newValue);
            setOpen(true);

            // Se o usuário alterar o texto de um
            // cliente já selecionado, desfaz a seleção.
            if (
              selected &&
              newValue !== selected.nome
            ) {
              setSelected(null);
              onSelect(null);
            }
          }}
          onFocus={() => {
            setOpen(true);
          }}
          className="w-full h-9 pl-9 pr-10 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />

        {selected && (
          <Check className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-success pointer-events-none" />
        )}
      </div>

      {/* ======================================================
          DROPDOWN
      ====================================================== */}

      {open &&
        !disabled &&
        coords &&
        createPortal(
          <div
            data-autocomplete-portal="true"
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              zIndex: 9999,
            }}
            className="rounded-lg border bg-popover shadow-[var(--shadow-elevated)] max-h-72 overflow-y-auto"
          >
            {/* ==================================================
                RESULTADOS
            ================================================== */}

            {results.length === 0 ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">
                {loadingResults
                  ? "Buscando clientes..."
                  : "Nenhum cliente encontrado"}
              </div>
            ) : (
              <ul className="py-1">
                {results.map((cliente) => (
                  <li key={cliente.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-accent active:bg-accent/80 text-sm transition-colors"
                      onPointerDown={(event) => {
                        /*
                         * IMPORTANTE:
                         *
                         * Usamos pointerdown em vez de click.
                         * Assim a seleção acontece antes do input
                         * perder o foco e antes do dropdown ser
                         * fechado pelo evento externo.
                         */
                        event.preventDefault();
                        event.stopPropagation();

                        handleSelectCliente(cliente);
                      }}
                    >
                      <p className="font-medium truncate">
                        {cliente.nome}
                      </p>

                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          cliente.telefone,
                          cliente.cidade,
                        ]
                          .filter(Boolean)
                          .join(" · ") ||
                          cliente.email ||
                          "—"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* ==================================================
                CADASTRAR NOVO
            ================================================== */}

            {query.trim() &&
              !exactMatch &&
              onCreateNew && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 border-t hover:bg-accent active:bg-accent/80 text-sm flex items-center gap-2 text-primary"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    handleCreateNew();
                  }}
                >
                  <UserPlus className="size-4" />

                  Cadastrar novo:

                  <span className="font-medium">
                    {query.trim()}
                  </span>
                </button>
              )}
          </div>,
          document.body
        )}
    </div>
  );
}