"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ArrowLeft,
  ChevronRight,
  CornerDownLeft,
  Leaf,
  Package,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  fetchCatmatClasses,
  fetchCatmatGrupos,
  fetchCatmatItens,
  fetchCatserDivisoes,
  fetchCatserItens,
  fetchCatserSecoes,
  type CatalogItem,
  type CatalogNode,
} from "@/actions/catalog";

export type CatalogMode = "CATMAT" | "CATSER";

export interface CatalogSelection {
  catalogType: CatalogMode;
  code: string;
  description: string;
}

interface CatalogPickerModalProps {
  open: boolean;
  initialMode: CatalogMode;
  onOpenChange: (open: boolean) => void;
  onSelect: (selection: CatalogSelection) => void;
}

type Level = "root" | "mid" | "items";

const MODE_CONFIG: Record<
  CatalogMode,
  {
    label: string;
    shortLabel: string;
    icon: typeof Package;
    accent: string;
    chipText: string;
    rootLabel: string;
    midLabel: string;
    itemsLabel: string;
  }
> = {
  CATMAT: {
    label: "Materiais",
    shortLabel: "CATMAT",
    icon: Package,
    accent: "bg-indigo-500 text-white border-indigo-500",
    chipText: "text-indigo-700 dark:text-indigo-400",
    rootLabel: "Grupo",
    midLabel: "Classe",
    itemsLabel: "Item CATMAT",
  },
  CATSER: {
    label: "Serviços",
    shortLabel: "CATSER",
    icon: Wrench,
    accent: "bg-emerald-600 text-white border-emerald-600",
    chipText: "text-emerald-700 dark:text-emerald-400",
    rootLabel: "Seção",
    midLabel: "Divisão",
    itemsLabel: "Serviço CATSER",
  },
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* ─── Modal shell ───────────────────────────────────────── */

export function CatalogPickerModal({
  open,
  initialMode,
  onOpenChange,
  onSelect,
}: CatalogPickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl h-[min(92vh,760px)] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-lg">Catálogo de Materiais e Serviços</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Navegue pela hierarquia ou busque por código/palavra-chave. Selecione um item para
            preencher o código CATMAT/CATSER.
          </p>
        </DialogHeader>
        {open && (
          <PickerBody
            initialMode={initialMode}
            onPick={(sel) => {
              onSelect(sel);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Top bar (mode toggle + search) ────────────────────── */

function PickerBody({
  initialMode,
  onPick,
}: {
  initialMode: CatalogMode;
  onPick: (selection: CatalogSelection) => void;
}) {
  const [mode, setMode] = useState<CatalogMode>(initialMode);

  return (
    <>
      <ModeSegmented mode={mode} onChange={setMode} />
      <CatalogLevels key={mode} mode={mode} onPick={onPick} />
    </>
  );
}

function ModeSegmented({
  mode,
  onChange,
}: {
  mode: CatalogMode;
  onChange: (next: CatalogMode) => void;
}) {
  return (
    <div className="px-5 pt-4">
      <div className="inline-flex items-center rounded-full border p-1 bg-muted/40">
        {(["CATMAT", "CATSER"] as const).map((key) => {
          const cfg = MODE_CONFIG[key];
          const Icon = cfg.icon;
          const active = mode === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                active ? cfg.accent + " shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span>{cfg.label}</span>
              <span className="text-xs opacity-70 font-mono">{cfg.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Navigation levels ─────────────────────────────────── */

function CatalogLevels({
  mode,
  onPick,
}: {
  mode: CatalogMode;
  onPick: (selection: CatalogSelection) => void;
}) {
  const cfg = MODE_CONFIG[mode];
  const [level, setLevel] = useState<Level>("root");
  const [search, setSearch] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [selectedRoot, setSelectedRoot] = useState<CatalogNode | null>(null);
  const [selectedMid, setSelectedMid] = useState<CatalogNode | null>(null);
  const [roots, setRoots] = useState<CatalogNode[]>([]);
  const [mids, setMids] = useState<CatalogNode[]>([]);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isPending, startTransition] = useTransition();

  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Carga inicial. Remontado via key ao trocar de modo — estado limpo de graça.
  useEffect(() => {
    startTransition(async () => {
      const result = mode === "CATMAT" ? await fetchCatmatGrupos() : await fetchCatserSecoes();
      if (result.success && result.data) {
        setRoots(result.data);
      } else {
        toast.error(result.error ?? "Erro ao carregar catálogo");
      }
    });
    searchInputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const needle = normalize(search.trim());

  const filteredRoots = useMemo(
    () =>
      needle
        ? roots.filter((r) => normalize(r.name).includes(needle) || String(r.code).includes(needle))
        : roots,
    [roots, needle],
  );
  const filteredMids = useMemo(
    () =>
      needle
        ? mids.filter((m) => normalize(m.name).includes(needle) || String(m.code).includes(needle))
        : mids,
    [mids, needle],
  );
  const filteredItems = useMemo(
    () =>
      needle
        ? items.filter((i) => normalize(i.name).includes(needle) || String(i.code).includes(needle))
        : items,
    [items, needle],
  );

  const currentList: Array<CatalogNode | CatalogItem> =
    level === "root" ? filteredRoots : level === "mid" ? filteredMids : filteredItems;

  // Clamp activeIdx quando a lista muda de tamanho.
  useEffect(() => {
    if (activeIdx >= currentList.length) {
      setActiveIdx(Math.max(0, currentList.length - 1));
    }
  }, [currentList.length, activeIdx]);

  // Keep active row in view.
  useEffect(() => {
    if (!listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // Callbacks estáveis (identidade preservada entre renders) — permitem que
  // rows memoizadas evitem re-render quando activeIdx muda.
  const handleHoverIdx = useCallback((i: number) => setActiveIdx(i), []);

  const handlePickNodeRoot = useCallback(
    (node: CatalogNode) => selectRoot(node),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handlePickNodeMid = useCallback(
    (node: CatalogNode) => selectMid(node),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const handlePickItem = useCallback(
    (item: CatalogItem) =>
      onPick({ catalogType: mode, code: String(item.code), description: item.name }),
    [onPick, mode],
  );

  const handleEnter = useCallback(() => {
    const current = currentList[activeIdx];
    if (!current) return;
    if (level === "items") {
      const item = current as CatalogItem;
      onPick({ catalogType: mode, code: String(item.code), description: item.name });
      return;
    }
    const node = current as CatalogNode;
    if (level === "root") {
      selectRoot(node);
    } else {
      selectMid(node);
    }
  }, [currentList, activeIdx, level, mode, onPick]); // eslint-disable-line react-hooks/exhaustive-deps

  function selectRoot(node: CatalogNode) {
    setSelectedRoot(node);
    setSelectedMid(null);
    setItems([]);
    setSearch("");
    setActiveIdx(0);
    setLevel("mid");
    startTransition(async () => {
      const result =
        mode === "CATMAT"
          ? await fetchCatmatClasses(node.code)
          : await fetchCatserDivisoes(node.code);
      if (result.success && result.data) {
        setMids(result.data);
      } else {
        toast.error(result.error ?? "Erro ao carregar");
      }
    });
  }

  function selectMid(node: CatalogNode) {
    setSelectedMid(node);
    setSearch("");
    setActiveIdx(0);
    setLevel("items");
    startTransition(async () => {
      const result =
        mode === "CATMAT"
          ? await fetchCatmatItens(node.code)
          : await fetchCatserItens(selectedRoot!.code, node.code);
      if (result.success && result.data) {
        setItems(result.data);
      } else {
        toast.error(result.error ?? "Erro ao carregar");
      }
    });
  }

  function goBack() {
    if (level === "items") {
      setLevel("mid");
      setSearch("");
      setActiveIdx(0);
    } else if (level === "mid") {
      setLevel("root");
      setSelectedRoot(null);
      setSearch("");
      setActiveIdx(0);
    }
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, currentList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleEnter();
    } else if (e.key === "Backspace" && search === "" && level !== "root") {
      e.preventDefault();
      goBack();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveIdx(currentList.length - 1);
    }
  }

  const rootLabelPlural = mode === "CATMAT" ? "grupos" : "seções";
  const midLabelPlural = mode === "CATMAT" ? "classes" : "divisões";
  const currentListLabel =
    level === "root" ? rootLabelPlural : level === "mid" ? midLabelPlural : "itens";

  return (
    <div className="flex-1 flex flex-col min-h-0" onKeyDown={onKeyDown} role="presentation">
      {/* Search bar sticky */}
      <div className="px-5 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={searchInputRef}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveIdx(0);
            }}
            placeholder={`Buscar ${currentListLabel} por código ou nome…`}
            className="pl-10 pr-9 h-10"
            autoComplete="off"
            spellCheck={false}
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                searchInputRef.current?.focus();
              }}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb + count */}
      <div className="px-5 pb-2 flex items-center gap-2 flex-wrap text-xs">
        <BreadcrumbChip
          label={cfg.rootLabel}
          active={level === "root"}
          onClick={() => {
            setLevel("root");
            setSelectedRoot(null);
            setSelectedMid(null);
            setSearch("");
            setActiveIdx(0);
          }}
        />
        {selectedRoot && (
          <>
            <ChevronRight className="size-3 text-muted-foreground" />
            <BreadcrumbChip
              label={selectedRoot.name}
              code={selectedRoot.code}
              active={level === "mid"}
              tone={cfg.chipText}
              onClick={() => {
                if (level !== "mid") {
                  setLevel("mid");
                  setSelectedMid(null);
                  setSearch("");
                  setActiveIdx(0);
                }
              }}
            />
          </>
        )}
        {selectedMid && (
          <>
            <ChevronRight className="size-3 text-muted-foreground" />
            <BreadcrumbChip
              label={selectedMid.name}
              code={selectedMid.code}
              active
              tone={cfg.chipText}
            />
          </>
        )}
        <span className="ml-auto text-muted-foreground tabular-nums">
          {isPending ? "—" : currentList.length}
          {needle
            ? ` de ${level === "root" ? roots.length : level === "mid" ? mids.length : items.length}`
            : ""}{" "}
          {currentListLabel}
        </span>
      </div>

      {/* Lista — área principal */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-3 scroll-pt-1">
        {isPending ? (
          <ListSkeleton />
        ) : currentList.length === 0 ? (
          <EmptyState
            searching={!!needle}
            onClearFilter={() => setSearch("")}
            onBack={level !== "root" ? goBack : undefined}
            label={currentListLabel}
          />
        ) : level === "items" ? (
          <ItemsGrid
            items={filteredItems}
            mode={mode}
            activeIdx={activeIdx}
            onHoverIdx={handleHoverIdx}
            onPick={handlePickItem}
          />
        ) : (
          <NodeGrid
            nodes={level === "root" ? filteredRoots : filteredMids}
            mode={mode}
            activeIdx={activeIdx}
            onHoverIdx={handleHoverIdx}
            onPick={level === "root" ? handlePickNodeRoot : handlePickNodeMid}
            labelHint={level === "root" ? cfg.rootLabel : cfg.midLabel}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-5 py-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          {level !== "root" ? (
            <Button type="button" size="sm" variant="ghost" onClick={goBack} className="h-7 -ml-2">
              <ArrowLeft className="size-3.5" />
              Voltar
            </Button>
          ) : null}
          <KbdHint />
        </div>
      </div>
    </div>
  );
}

/* ─── Row components ───────────────────────────────────── */

/**
 * NodeGrid/ItemsGrid renderizam listas longas (até 500 rows). As rows são
 * `memo` com props apenas `isActive` + objeto + callbacks estáveis — quando
 * activeIdx muda, só as 2 rows afetadas re-renderizam.
 * `contentVisibility: auto` delega ao browser o render lazy dos rows fora
 * da viewport (wins reais em listas de 300+).
 */

interface NodeRowProps {
  node: CatalogNode;
  idx: number;
  isActive: boolean;
  accentText: string;
  labelHint: string;
  onHoverIdx: (i: number) => void;
  onPick: (n: CatalogNode) => void;
}

const NodeRow = memo(function NodeRow({
  node,
  idx,
  isActive,
  accentText,
  labelHint,
  onHoverIdx,
  onPick,
}: NodeRowProps) {
  return (
    <li style={{ contentVisibility: "auto", containIntrinsicSize: "0 42px" }}>
      <button
        type="button"
        data-idx={idx}
        onMouseEnter={() => onHoverIdx(idx)}
        onClick={() => onPick(node)}
        className={cn(
          "w-full flex items-center gap-3 py-2.5 px-3 rounded-lg text-left transition-colors",
          "focus:outline-none",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[3.5rem] px-2 py-0.5 rounded-md font-mono tabular-nums text-xs",
            "bg-muted border",
            accentText,
          )}
        >
          {node.code}
        </span>
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{node.name}</span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
          {labelHint}
        </span>
        <ChevronRight className="size-4 text-muted-foreground shrink-0" />
      </button>
    </li>
  );
});

function NodeGrid({
  nodes,
  mode,
  activeIdx,
  onHoverIdx,
  onPick,
  labelHint,
}: {
  nodes: CatalogNode[];
  mode: CatalogMode;
  activeIdx: number;
  onHoverIdx: (i: number) => void;
  onPick: (n: CatalogNode) => void;
  labelHint: string;
}) {
  const accentText = MODE_CONFIG[mode].chipText;
  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((n, idx) => (
        <NodeRow
          key={n.code}
          node={n}
          idx={idx}
          isActive={idx === activeIdx}
          accentText={accentText}
          labelHint={labelHint}
          onHoverIdx={onHoverIdx}
          onPick={onPick}
        />
      ))}
    </ul>
  );
}

interface ItemRowProps {
  item: CatalogItem;
  idx: number;
  isActive: boolean;
  mode: CatalogMode;
  accentText: string;
  onHoverIdx: (i: number) => void;
  onPick: (i: CatalogItem) => void;
}

const ItemRow = memo(function ItemRow({
  item,
  idx,
  isActive,
  mode,
  accentText,
  onHoverIdx,
  onPick,
}: ItemRowProps) {
  return (
    <li style={{ contentVisibility: "auto", containIntrinsicSize: "0 58px" }}>
      <button
        type="button"
        data-idx={idx}
        onMouseEnter={() => onHoverIdx(idx)}
        onClick={() => onPick(item)}
        className={cn(
          "w-full flex items-start gap-3 py-2.5 px-3 rounded-lg text-left transition-colors",
          "focus:outline-none",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted/60",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center justify-center min-w-[4.5rem] px-2 py-0.5 rounded-md font-mono tabular-nums text-xs mt-0.5",
            "bg-muted border",
            accentText,
          )}
          title={`Código ${mode}`}
        >
          {item.code}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium leading-snug">{item.name}</span>
          {(item.className || item.sustainable) && (
            <span className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              {item.className && <span className="truncate">{item.className}</span>}
              {item.sustainable && (
                <span className="inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Leaf className="size-3" /> Sustentável
                </span>
              )}
            </span>
          )}
        </span>
        <CornerDownLeft
          className={cn(
            "size-3.5 shrink-0 mt-1.5 transition-opacity",
            isActive ? "opacity-100" : "opacity-0",
          )}
          aria-label="Selecionar"
        />
      </button>
    </li>
  );
});

function ItemsGrid({
  items,
  mode,
  activeIdx,
  onHoverIdx,
  onPick,
}: {
  items: CatalogItem[];
  mode: CatalogMode;
  activeIdx: number;
  onHoverIdx: (i: number) => void;
  onPick: (i: CatalogItem) => void;
}) {
  const accentText = MODE_CONFIG[mode].chipText;
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((item, idx) => (
        <ItemRow
          key={item.code}
          item={item}
          idx={idx}
          isActive={idx === activeIdx}
          mode={mode}
          accentText={accentText}
          onHoverIdx={onHoverIdx}
          onPick={onPick}
        />
      ))}
    </ul>
  );
}

/* ─── Utility subcomponents ─────────────────────────────── */

function BreadcrumbChip({
  label,
  code,
  active,
  onClick,
  tone,
}: {
  label: string;
  code?: number;
  active: boolean;
  onClick?: () => void;
  tone?: string;
}) {
  const inner = (
    <>
      {code !== undefined && (
        <span className="font-mono tabular-nums opacity-80 mr-1.5">{code}</span>
      )}
      <span className="truncate max-w-[220px]">{label}</span>
    </>
  );
  const cls = cn(
    "inline-flex items-center px-2 py-1 rounded-md border text-xs transition-colors",
    active
      ? "bg-foreground text-background border-foreground"
      : "bg-muted/40 border-transparent hover:bg-muted",
    tone,
  );
  if (!onClick || active) {
    return <span className={cls}>{inner}</span>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-0.5">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 py-2.5 px-3">
          <Skeleton className="h-5 w-16 rounded-md" />
          <Skeleton className="h-4 flex-1 rounded" />
          <Skeleton className="h-4 w-4 rounded" />
        </li>
      ))}
    </ul>
  );
}

function EmptyState({
  searching,
  onClearFilter,
  onBack,
  label,
}: {
  searching: boolean;
  onClearFilter: () => void;
  onBack?: () => void;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
      <div className="rounded-full bg-muted p-3">
        <Search className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {searching
            ? `Nenhum resultado para sua busca`
            : `Nenhum ${label.replace(/s$/, "")} encontrado`}
        </p>
        <p className="text-xs text-muted-foreground max-w-sm">
          {searching
            ? "Tente com menos palavras ou use o código do item diretamente."
            : "O catálogo pode estar vazio neste nível. Volte e escolha outro ramo."}
        </p>
      </div>
      <div className="flex gap-2 mt-1">
        {searching && (
          <Button size="sm" variant="outline" onClick={onClearFilter}>
            Limpar busca
          </Button>
        )}
        {onBack && (
          <Button size="sm" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-3.5" /> Voltar
          </Button>
        )}
      </div>
    </div>
  );
}

function KbdHint() {
  return (
    <span className="hidden sm:flex items-center gap-2 text-[11px]">
      <Kbd>↑</Kbd>
      <Kbd>↓</Kbd>
      <span>navegar</span>
      <span className="opacity-30">·</span>
      <Kbd>↵</Kbd>
      <span>selecionar</span>
      <span className="opacity-30">·</span>
      <Kbd>⌫</Kbd>
      <span>voltar</span>
      <span className="opacity-30">·</span>
      <Kbd>Esc</Kbd>
      <span>fechar</span>
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded border bg-muted/70 text-[10px] font-mono text-muted-foreground">
      {children}
    </kbd>
  );
}
