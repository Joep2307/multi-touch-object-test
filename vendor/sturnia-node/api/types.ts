// Wire types for the biblio API — BIBLIO-CONTRACT.md §3 (v1) + §10 (v2).
// These are what a backend must speak for sturnia-node to render it:
// coco-biblio (Rust/axum over a glace store) is the reference
// implementation; sturnus-biblio (Django) can serve the same shapes.

export interface Doc {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  refType: string;
  publisher: string;
  abstract: string;
  keywords: string;
  language: string;
  doi: string;
  isbn: string;
  url: string;
  excerpt: string;
  fileName: string;
  fileMime: string;
  /** "pdf" | "html" | "image" | "text" | "other" | "" (no viewable file) */
  fileKind: string;
  themes: string[];
  /** ISO-8601 — finer-grained than `year`, when known. */
  ts?: string;
  /** Degrees, WGS84 — where the document is about/was published, when known. */
  lat?: number;
  lon?: number;
}

export interface ThemeCount {
  name: string;
  count: number;
  description?: string;
  source?: string;
}

export type GraphNodeType = "theme" | "document" | "entity" | "keyword" | "chunk";

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  // theme
  description?: string;
  // document
  year?: number | null;
  fileKind?: string;
  file_kind?: string;
  // entity
  etype?: string;
  aliases?: string;
  // keyword
  same_as_ent?: string | null;
  // chunk (spliced client-side from /entity/:id/knowledge)
  doc_id?: string;
  page?: number | null;
  excerpt?: string;
  cnt?: number;
  // temporal ("memory") + geo — documents get both; entities get `ts` (first
  // seen) and, for LOC entities only, `lat`/`lon`. ISO-8601 / WGS84 degrees.
  ts?: string;
  lat?: number;
  lon?: number;
  [extra: string]: unknown;
}

export type GraphLinkType =
  | "has_theme"
  | "mentions"
  | "related"
  | "entity_theme"
  | "has_keyword"
  | "grounded_in"
  | "has_chunk";

export interface GraphLink {
  source: string;
  target: string;
  type: GraphLinkType | string;
  predicate?: string;
  evidence?: string;
  score?: number;
  cnt?: number;
  /** Provenance on semantic entity→entity relationships. */
  docId?: string;
  chunkId?: string;
}

export interface GraphPayload {
  nodes: GraphNode[];
  links: GraphLink[];
  themes: string[];
}

export type GraphLayer = "themes" | "entities" | "keywords" | "documents" | "chunks";

export type DataProblemType =
  | "duplicate_id"
  | "duplicate_label"
  | "isolated_node"
  | "dangling_link"
  | "self_link"
  | "duplicate_link"
  | "missing_label";

export interface DataProblem {
  type: DataProblemType;
  severity: "error" | "warning";
  nodeIds: string[];
  detail: string;
  linkIndex?: number;
}

export interface DataProblemsPayload {
  summary: { total: number; errors: number; warnings: number };
  problems: DataProblem[];
}

export interface KnowledgeChunk {
  chunk_id: string;
  doc_id: string;
  page: number | null;
  excerpt: string;
  cnt: number;
}

export interface Knowledge {
  entity: { id: string; label: string; etype: string; aliases: string };
  themes: { name: string; score: number }[];
  chunks: KnowledgeChunk[];
  total?: number;
  documents: { id: string; title: string; year: number | null; file_kind: string }[];
}

export interface Keyword {
  kw_id: string;
  label: string;
  count: number;
  same_as_ent: string | null;
}

export interface ChatSource {
  chunk_id: string;
  doc_id: string;
  title: string;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type ChatEvent =
  | { event: "sources"; data: ChatSource[] }
  | { event: "token"; data: { text: string } }
  | { event: "done"; data: Record<string, never> }
  | { event: "error"; data: { message?: string; error?: string } };

// Theme management (Django biblio-themes API; themes.html only).
export interface ManagedTheme {
  id: number;
  name: string;
  description: string;
  seed_terms?: string;
  active: boolean;
  order: number;
}
