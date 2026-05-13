import { useState, useMemo, useRef, useEffect } from "react";
import { Search, UserPlus, Check } from "lucide-react";
import { useClientes, type Cliente } from "@/hooks/use-clientes";

interface Props {
  value?: string; // selected cliente id
  onSelect: (cliente: Cliente | null) => void;
  onCreateNew?: (nome: string) => void;
  disabled?: boolean;
}

export function ClienteAutocomplete({ value, onSelect, onCreateNew, disabled }: Props) {
  const { data: clientes = [], isLoading } = useClientes();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = clientes.find((c) => c.id === value);

  useEffect(() => {
    if (selected && !query) setQuery(selected.nome);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes.slice(0, 8);
    return clientes
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(q) ||
          (c.telefone ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q),
      )
      .slice(0, 10);
  }, [clientes, query]);

  const exactMatch = clientes.some((c) => c.nome.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={ref} className="relative">
      <label className="text-xs font-medium">Cliente *</label>
      <div className="mt-1 relative">
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
          className="w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-60"
        />
        {selected && (
          <Check className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-success" />
        )}
      </div>

      {open && !disabled && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border bg-popover shadow-[var(--shadow-elevated)] max-h-72 overflow-y-auto">
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
                    onClick={() => {
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
              onClick={() => {
                onCreateNew(query.trim());
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2.5 border-t hover:bg-accent text-sm flex items-center gap-2 text-primary"
            >
              <UserPlus className="size-4" />
              Cadastrar novo: <span className="font-medium">{query.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
