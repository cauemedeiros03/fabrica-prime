import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, UserPlus, Check } from "lucide-react";
import { type Cliente } from "@/hooks/use-clientes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  value?: string; // selected cliente id
  onSelect: (cliente: Cliente | null) => void;
  onCreateNew?: (nome: string) => void;
  disabled?: boolean;
}

export function ClienteAutocomplete({ value, onSelect, onCreateNew, disabled }: Props) {
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
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch selected client info when value (ID) changes
  useEffect(() => {
    if (!value) {
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
          .eq("id", value!)
          .single();
        if (error) throw error;
        if (active && data) {
          setSelected(data as Cliente);
        }
      } catch (err) {
        console.error("Erro ao buscar cliente selecionado:", err);
      } finally {
        if (active) setLoadingSelected(false);
      }
    }
    fetchSelected();
    return () => {
      active = false;
    };
  }, [value]);

  // Fetch results debounced
  useEffect(() => {
    if (!open || !user?.id) {
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
          .select("id, user_id, nome, telefone, email, cidade, observacoes, cpf, cep, endereco, numero, complemento, bairro, instagram, origem, created_at, updated_at")
          .eq("user_id", user!.id);
        
        if (q) {
          queryBuilder = queryBuilder.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%,email.ilike.%${q}%`);
        }
        
        const { data, error } = await queryBuilder.order("nome").limit(10);
        if (error) throw error;
        if (active) {
          setResults((data || []) as Cliente[]);
        }
      } catch (err) {
        console.error("Erro ao buscar clientes:", err);
      } finally {
        if (active) setLoadingResults(false);
      }
    }
    fetchResults();
    return () => {
      active = false;
    };
  }, [debouncedQuery, open, user?.id]);

  const isLoading = loadingResults || loadingSelected;

  useEffect(() => {
    if (selected && !query) setQuery(selected.nome);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !target.closest('[data-autocomplete-portal="true"]')
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect();
        const dropdownHeight = 280;
        const spaceBelow = window.innerHeight - rect.bottom;
        const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;
        
        setCoords({
          top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  const exactMatch = results.some((c) => c.nome.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium">Cliente *</label>
        {!disabled && onCreateNew && (
          <button
            type="button"
            onClick={() => {
              onCreateNew(query.trim());
              setOpen(false);
            }}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
          >
            <UserPlus className="size-3" />
            + Novo Cliente
          </button>
        )}
      </div>
      <div ref={inputContainerRef} className="mt-1 relative">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={query}
          disabled={disabled}
          placeholder={isLoading ? "Carregando..." : "Buscar por nome, telefone ou email..."}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (selected && e.target.value !== selected.nome) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          className="w-full h-9 pl-9 pr-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />
        {selected && (
          <Check className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-success" />
        )}
      </div>

      {open && !disabled && coords && createPortal(
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
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              Nenhum cliente encontrado
            </div>
          ) : (
            <ul className="py-1">
              {results.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(c);
                      setQuery(c.nome);
                      setOpen(false);
                    }}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      onSelect(c);
                      setQuery(c.nome);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                  >
                    <p className="font-medium truncate">{c.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[c.telefone, c.cidade].filter(Boolean).join(" · ") || c.email || "—"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && !exactMatch && onCreateNew && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onCreateNew(query.trim());
                setOpen(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                onCreateNew(query.trim());
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 border-t hover:bg-accent text-sm flex items-center gap-2 text-primary"
            >
              <UserPlus className="size-4" />
              Cadastrar novo: <span className="font-medium">{query.trim()}</span>
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
