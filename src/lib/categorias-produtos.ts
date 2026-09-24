export const CATEGORIAS_PRODUTO = [
    "Mesas",
    "Cadeiras",
    "Bancos",
    "Sofás",
    "Poltronas",
    "Camas",
    "Armários",
    "Aparadores",
    "Estantes",
    "Racks",
    "Criados-mudos",
    "Outros",
] as const;

export type CategoriaProduto =
    (typeof CATEGORIAS_PRODUTO)[number];

/**
 * Normaliza categorias antigas cadastradas manualmente.
 *
 * Exemplo:
 * "mesa", "MESAS", "Mesa" → "Mesas"
 */
export function normalizarCategoriaProduto(
    valor: string | null | undefined
): CategoriaProduto {
    const normalizado = (valor || "")
        .trim()
        .toLowerCase();

    const mapa: Record<string, CategoriaProduto> = {
        mesa: "Mesas",
        mesas: "Mesas",

        cadeira: "Cadeiras",
        cadeiras: "Cadeiras",

        banco: "Bancos",
        bancos: "Bancos",

        sofa: "Sofás",
        sofas: "Sofás",
        sofá: "Sofás",
        sofás: "Sofás",

        poltrona: "Poltronas",
        poltronas: "Poltronas",

        cama: "Camas",
        camas: "Camas",

        armario: "Armários",
        armarios: "Armários",
        armário: "Armários",
        armários: "Armários",

        aparador: "Aparadores",
        aparadores: "Aparadores",

        estante: "Estantes",
        estantes: "Estantes",

        rack: "Racks",
        racks: "Racks",

        "criado-mudo": "Criados-mudos",
        "criados-mudos": "Criados-mudos",
        "criado mudo": "Criados-mudos",
        "criados mudos": "Criados-mudos",
    };

    return mapa[normalizado] || "Outros";
}