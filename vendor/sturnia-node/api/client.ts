// BiblioClient — the one seam between the sturnia-node pages and a backend.
//
// `HttpBiblioClient` speaks BIBLIO-CONTRACT.md §3/§10 against `baseUrl`
// (default "" → relative "api/biblio/..." so pages work behind any prefix).
// `FixtureBiblioClient` reads the static JSON under `fixtures/` so every page
// renders with no backend at all. `withFallback()` chains them: real API
// first, fixtures when it is unreachable or `?fixture=1` is set — that is the
// default every page uses.
import type {
  ChatEvent,
  ChatSource,
  ChatTurn,
  DataProblem,
  Doc,
  DataProblemsPayload,
  GraphLayer,
  GraphPayload,
  Keyword,
  Knowledge,
  ThemeCount,
} from "./types";

export interface DocumentQuery {
  search?: string;
  theme?: string;
  /** Rank/filter by embedding similarity (coco-biblio's `chat` feature,
   *  `GET /api/biblio/documents/semantic`) instead of a literal substring —
   *  the "search in the LLM" toggle. Ignored when `search` is empty. */
  semantic?: boolean;
}

export interface BiblioClient {
  themes(): Promise<ThemeCount[]>;
  documents(q?: DocumentQuery): Promise<Doc[]>;
  document(id: string): Promise<Doc | null>;
  /** URL of the viewable file for a document (for <a href>/<iframe src>). */
  fileUrl(id: string): string;
  graph(layers?: GraphLayer[]): Promise<GraphPayload>;
  dataProblems(layers?: GraphLayer[]): Promise<DataProblemsPayload>;
  knowledge(entId: string): Promise<Knowledge | null>;
  keywords(): Promise<Keyword[]>;
  /** SSE-over-POST chat; yields parsed events until `done`/`error`. */
  chat(message: string, history: ChatTurn[], signal?: AbortSignal): AsyncIterable<ChatEvent>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public url: string,
  ) {
    super(`${status} ${url}`);
  }
}

function join(base: string, path: string): string {
  if (!base) return path;
  return base.replace(/\/+$/, "") + "/" + path.replace(/^\/+/, "");
}

function findFixtureDataProblems(graph: GraphPayload): DataProblemsPayload {
  const problems: DataProblem[] = [];
  const ids = new Map<string, number>();
  const labels = new Map<string, string[]>();
  const connected = new Set<string>();
  const seenLinks = new Map<string, number>();

  for (const node of graph.nodes) {
    ids.set(node.id, (ids.get(node.id) ?? 0) + 1);
    const label = node.label.trim();
    if (!label) {
      problems.push({
        type: "missing_label",
        severity: "warning",
        nodeIds: [node.id],
        detail: `${node.type} node has no label`,
      });
    } else {
      const key = `${node.type}\u0000${label.toLowerCase()}`;
      labels.set(key, [...(labels.get(key) ?? []), node.id]);
    }
  }
  for (const [id, count] of ids) {
    if (count > 1) {
      problems.push({
        type: "duplicate_id",
        severity: "error",
        nodeIds: Array<string>(count).fill(id),
        detail: `node id appears ${count} times`,
      });
    }
  }
  for (const [key, nodeIds] of labels) {
    const unique = [...new Set(nodeIds)];
    if (unique.length > 1) {
      const [kind, label] = key.split("\u0000");
      problems.push({
        type: "duplicate_label",
        severity: "warning",
        nodeIds: unique,
        detail: `${nodeIds.length} ${kind} nodes share the label ${JSON.stringify(label)}`,
      });
    }
  }
  graph.links.forEach((link, linkIndex) => {
    const missing = [link.source, link.target].filter((id) => !ids.has(id));
    if (missing.length) {
      problems.push({
        type: "dangling_link",
        severity: "error",
        nodeIds: missing,
        linkIndex,
        detail: "link points to a node that is not present",
      });
    } else {
      connected.add(link.source);
      connected.add(link.target);
    }
    if (link.source === link.target) {
      problems.push({
        type: "self_link",
        severity: "warning",
        nodeIds: [link.source],
        linkIndex,
        detail: "link connects a node to itself",
      });
    }
    const key = `${link.source}\u0000${link.target}\u0000${link.type}`;
    const firstIndex = seenLinks.get(key);
    if (firstIndex !== undefined) {
      problems.push({
        type: "duplicate_link",
        severity: "warning",
        nodeIds: [link.source, link.target],
        linkIndex,
        detail: `duplicates link at index ${firstIndex}`,
      });
    }
    seenLinks.set(key, linkIndex);
  });
  for (const id of ids.keys()) {
    if (!connected.has(id)) {
      problems.push({
        type: "isolated_node",
        severity: "warning",
        nodeIds: [id],
        detail: "node has no links",
      });
    }
  }
  const errors = problems.filter((problem) => problem.severity === "error").length;
  return {
    summary: {
      total: problems.length,
      errors,
      warnings: problems.length - errors,
    },
    problems,
  };
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new ApiError(res.status, url);
  return (await res.json()) as T;
}

/** Parse an SSE byte stream into {event,data} records. */
export async function* parseSse(body: ReadableStream<Uint8Array>): AsyncGenerator<ChatEvent> {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      let event = "message";
      const dataLines: string[] = [];
      for (const raw of block.split("\n")) {
        const line = raw.replace(/\r$/, "");
        if (line.startsWith("event:")) event = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLines.push(line.slice(5).replace(/^ /, ""));
      }
      if (!dataLines.length) continue;
      let data: unknown = dataLines.join("\n");
      try {
        data = JSON.parse(data as string);
      } catch {
        /* keep raw string */
      }
      yield { event, data } as ChatEvent;
    }
  }
}

export class HttpBiblioClient implements BiblioClient {
  constructor(public readonly baseUrl: string = "") {}

  private url(path: string): string {
    return join(this.baseUrl, path);
  }

  async themes(): Promise<ThemeCount[]> {
    const j = await getJson<{ themes: ThemeCount[] }>(this.url("api/biblio/themes"));
    return j.themes ?? [];
  }

  async documents(q: DocumentQuery = {}): Promise<Doc[]> {
    const p = new URLSearchParams();
    if (q.search) p.set("search", q.search);
    if (q.theme) p.set("theme", q.theme);
    const qs = p.toString();
    // Semantic ranking is a separate endpoint (its own store + embedder
    // handle server-side, see coco-biblio's lib.rs `SemanticState`), not a
    // query flag on the keyword one.
    const path = q.semantic && q.search ? "api/biblio/documents/semantic" : "api/biblio/documents";
    const j = await getJson<{ documents: Doc[] }>(this.url(path + (qs ? "?" + qs : "")));
    return j.documents ?? [];
  }

  async document(id: string): Promise<Doc | null> {
    try {
      const j = await getJson<{ document: Doc }>(this.url("api/biblio/document/" + encodeURIComponent(id)));
      return j.document ?? null;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }

  fileUrl(id: string): string {
    return this.url("api/biblio/doc/" + encodeURIComponent(id) + "/file");
  }

  async graph(layers?: GraphLayer[]): Promise<GraphPayload> {
    const qs = layers && layers.length ? "?layers=" + encodeURIComponent(layers.join(",")) : "";
    return getJson<GraphPayload>(this.url("api/biblio/graph" + qs));
  }

  async dataProblems(layers?: GraphLayer[]): Promise<DataProblemsPayload> {
    const qs = layers?.length
      ? "?layers=" + encodeURIComponent(layers.join(","))
      : "";
    return getJson<DataProblemsPayload>(
      this.url("api/biblio/data-problems" + qs),
    );
  }

  async knowledge(entId: string): Promise<Knowledge | null> {
    const bare = entId.startsWith("ent:") ? entId.slice(4) : entId;
    try {
      return await getJson<Knowledge>(this.url("api/biblio/entity/" + encodeURIComponent(bare) + "/knowledge"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  }

  async keywords(): Promise<Keyword[]> {
    const j = await getJson<{ keywords: Keyword[] }>(this.url("api/biblio/keywords"));
    return j.keywords ?? [];
  }

  async *chat(message: string, history: ChatTurn[], signal?: AbortSignal): AsyncIterable<ChatEvent> {
    const res = await fetch(this.url("api/biblio/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message, history }),
      signal,
    });
    if (!res.ok || !res.body) throw new ApiError(res.status, this.url("api/biblio/chat"));
    yield* parseSse(res.body);
  }
}

/** Static fixtures (public/fixtures/*.json) — no backend needed. */
export class FixtureBiblioClient implements BiblioClient {
  constructor(public readonly baseUrl: string = "fixtures") {}

  private url(name: string): string {
    return join(this.baseUrl, name);
  }

  async themes(): Promise<ThemeCount[]> {
    const j = await getJson<{ themes: ThemeCount[] }>(this.url("themes.json"));
    return j.themes ?? [];
  }

  async documents(q: DocumentQuery = {}): Promise<Doc[]> {
    // No embedder in fixture mode — `semantic` degrades to the same
    // substring filter as keyword search rather than erroring.
    const j = await getJson<{ documents: Doc[] }>(this.url("documents.json"));
    let docs = j.documents ?? [];
    if (q.theme) docs = docs.filter((d) => (d.themes ?? []).includes(q.theme!));
    if (q.search) {
      const s = q.search.toLowerCase();
      docs = docs.filter((d) =>
        [d.title, d.authors, d.abstract, d.keywords].some((f) => (f ?? "").toLowerCase().includes(s)),
      );
    }
    return docs;
  }

  async document(id: string): Promise<Doc | null> {
    const docs = await this.documents();
    return docs.find((d) => d.id === id) ?? null;
  }

  fileUrl(id: string): string {
    return this.url("documents/" + encodeURIComponent(id));
  }

  async graph(layers?: GraphLayer[]): Promise<GraphPayload> {
    // graph-v2.json is the layered superset; filter to the requested layers
    // the way the server would (nodes of those types, links among them).
    const full = await getJson<GraphPayload>(this.url("graph-v2.json"));
    if (!layers || !layers.length) return full;
    const want = new Set<string>();
    if (layers.includes("themes")) want.add("theme");
    if (layers.includes("entities")) want.add("entity");
    if (layers.includes("keywords")) want.add("keyword");
    if (layers.includes("documents")) want.add("document");
    if (layers.includes("chunks")) want.add("chunk");
    const nodes = full.nodes.filter((n) => want.has(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    const links = full.links.filter((l) => ids.has(l.source) && ids.has(l.target));
    return { nodes, links, themes: full.themes };
  }

  async dataProblems(layers?: GraphLayer[]): Promise<DataProblemsPayload> {
    return findFixtureDataProblems(await this.graph(layers));
  }

  async knowledge(_entId: string): Promise<Knowledge | null> {
    return getJson<Knowledge>(this.url("knowledge.json"));
  }

  async keywords(): Promise<Keyword[]> {
    // graph-v2.json carries no per-keyword count — derive it from how many
    // links touch each keyword node, the fixture stand-in for "documents
    // mentioning this keyword".
    const full = await this.graph();
    const counts = new Map<string, number>();
    for (const l of full.links) {
      if (l.source.startsWith("kw:")) counts.set(l.source, (counts.get(l.source) ?? 0) + 1);
      if (l.target.startsWith("kw:")) counts.set(l.target, (counts.get(l.target) ?? 0) + 1);
    }
    const g = await this.graph(["keywords"]);
    return g.nodes.map((n) => ({
      kw_id: n.id.replace(/^kw:/, ""),
      label: n.label,
      count: counts.get(n.id) ?? 0,
      same_as_ent: (n.same_as_ent as string | null) ?? null,
    }));
  }

  async *chat(_message: string, _history: ChatTurn[]): AsyncIterable<ChatEvent> {
    // fixtures/chat.txt: a "### SOURCES" section of tab-separated rows
    // (index, chunk_id, doc_id, title, page, excerpt, score) then a
    // "### ANSWER" section of markdown; anything outside is a comment.
    // Replayed as the same event sequence the live SSE endpoint emits.
    const res = await fetch(this.url("chat.txt"));
    if (!res.ok) throw new ApiError(res.status, this.url("chat.txt"));
    const { sources, answer } = parseChatFixture(await res.text());
    yield { event: "sources", data: sources };
    for (const tok of answer.split(/(\s+)/).filter((t) => t.length > 0)) {
      await new Promise((r) => setTimeout(r, 25));
      yield { event: "token", data: { text: tok } };
    }
    yield { event: "done", data: {} };
  }
}

export function parseChatFixture(text: string): { sources: ChatSource[]; answer: string } {
  const sources: ChatSource[] = [];
  const answerLines: string[] = [];
  let mode: "sources" | "answer" | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (trimmed === "### SOURCES") { mode = "sources"; continue; }
    if (trimmed === "### ANSWER") { mode = "answer"; continue; }
    if (mode === "sources") {
      if (!trimmed) continue;
      const p = raw.split("\t");
      sources.push({
        chunk_id: p[1] ?? "",
        doc_id: p[2] ?? "",
        title: p[3] ?? "",
        page: p[4] ? Number(p[4]) : null,
        excerpt: p[5] ?? "",
        score: p[6] ? Number(p[6]) : 0,
      });
    } else if (mode === "answer") {
      answerLines.push(raw);
    }
  }
  return { sources, answer: answerLines.join("\n").trim() };
}

/**
 * Real API first, fixtures when it is unreachable (network error / 4xx / 5xx
 * / missing route) or when the page URL carries `?fixture=1`. Per-call
 * fallback, so a backend that serves documents but not chat still works.
 *
 * `document()`/`knowledge()` treat their own 404 as "legitimately not
 * found" and resolve to `null` before this ever sees it (BIBLIO-CONTRACT
 * single-item lookups) — a 404 that reaches `wrap()` is on a collection
 * endpoint (themes/documents/graph/...), where it can only mean "no such
 * route on this backend", so it falls back like any other failure.
 */
export function withFallback(primary: BiblioClient, fallback: BiblioClient, forceFallback = false): BiblioClient {
  const wrap = <A extends unknown[], R>(p: (...a: A) => Promise<R>, f: (...a: A) => Promise<R>) =>
    async (...a: A): Promise<R> => {
      if (forceFallback) return f(...a);
      try {
        return await p(...a);
      } catch (e) {
        console.warn("[sturnia-node] backend unavailable, using fixtures:", e);
        return f(...a);
      }
    };
  return {
    themes: wrap(primary.themes.bind(primary), fallback.themes.bind(fallback)),
    documents: wrap(primary.documents.bind(primary), fallback.documents.bind(fallback)),
    document: wrap(primary.document.bind(primary), fallback.document.bind(fallback)),
    fileUrl: (id) => (forceFallback ? fallback.fileUrl(id) : primary.fileUrl(id)),
    graph: wrap(primary.graph.bind(primary), fallback.graph.bind(fallback)),
    dataProblems: wrap(
      primary.dataProblems.bind(primary),
      fallback.dataProblems.bind(fallback),
    ),
    knowledge: wrap(primary.knowledge.bind(primary), fallback.knowledge.bind(fallback)),
    keywords: wrap(primary.keywords.bind(primary), fallback.keywords.bind(fallback)),
    async *chat(message, history, signal) {
      if (forceFallback) return yield* fallback.chat(message, history, signal);
      try {
        yield* primary.chat(message, history, signal);
      } catch (e) {
        if (e instanceof ApiError && e.status !== 404 && e.status < 500) throw e;
        console.warn("[sturnia-node] chat backend unavailable, using fixtures:", e);
        yield* fallback.chat(message, history, signal);
      }
    },
  };
}

/** Default client for the bundled pages: env/base-URL aware, fixture fallback. */
export function defaultClient(opts: { baseUrl?: string; fixtures?: string } = {}): BiblioClient {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env ?? {};
  const baseUrl = opts.baseUrl ?? env.VITE_BIBLIO_API ?? "";
  const params = new URLSearchParams(typeof location !== "undefined" ? location.search : "");
  const force = params.get("fixture") === "1";
  return withFallback(new HttpBiblioClient(baseUrl), new FixtureBiblioClient(opts.fixtures ?? "fixtures"), force);
}
