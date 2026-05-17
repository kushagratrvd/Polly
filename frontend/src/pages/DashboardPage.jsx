import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Eye,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  Trash2,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLivePoll } from "@/hooks/useLivePoll";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/auth/useAuth";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;
const TITLE_MAX = 150;
const DESC_MAX  = 500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getPollId = (poll) => poll?._id || poll?.id;

const formatExpiryLabel = (value) =>
  value
    ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
    : "Pick expiry date";

function expiryCountdown(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d left`;
  if (h > 0)   return `${h}h ${m}m left`;
  return `${m}m left`;
}

const emptyQuestion = () => ({
  text: "",
  optional: false,
  options: [{ text: "" }, { text: "" }],
});

const emptyPoll = () => ({
  title: "",
  description: "",
  responseMode: "anonymous",
  expiresAt: "",
  questions: [emptyQuestion()],
});

// ─── Small components ─────────────────────────────────────────────────────────

function StatusBadge({ poll }) {
  const isExpired   = poll.expiresAt && new Date(poll.expiresAt) <= new Date();
  const isPublished = poll.isPublished;
  const countdown   = expiryCountdown(poll.expiresAt);

  if (isPublished) {
    return (
      <span className="rounded-full bg-teal-400/15 px-2 py-0.5 text-xs font-medium text-teal-300">
        Published
      </span>
    );
  }
  if (isExpired) {
    return (
      <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-300">
        Expired
      </span>
    );
  }
  if (countdown) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/55">
        <Clock className="h-3 w-3" />
        {countdown}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/40">
      Active
    </span>
  );
}

function CharCounter({ current, max }) {
  const near = current >= max * 0.85;
  const over = current > max;
  return (
    <span
      className={`ml-auto text-xs tabular-nums ${
        over ? "text-red-400" : near ? "text-amber-400" : "text-white/30"
      }`}
    >
      {current}/{max}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardPage() {
  // ── list & pagination state ──
  const [activeView,  setActiveView]  = useState("all");
  const [polls,       setPolls]       = useState([]);
  const [myPolls,     setMyPolls]     = useState([]);
  const [votedPolls,  setVotedPolls]  = useState([]);
  const [pagination,  setPagination]  = useState(null);   
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");     

  // ── detail & form state ──
  const [selectedPoll,   setSelectedPoll]   = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [detailLoading,  setDetailLoading]  = useState(false);
  const [creatingPoll,   setCreatingPoll]   = useState(false);
  const [publishingPoll, setPublishingPoll] = useState(false);
  const [error,          setError]          = useState("");
  const [notice,         setNotice]         = useState("");
  const [createError,    setCreateError]    = useState("");
  const [newPoll,        setNewPoll]        = useState(emptyPoll);

  const { isAuthenticated, logout } = useAuth();
  const token    = isAuthenticated;
  const navigate = useNavigate();

  const selectedPollId   = getPollId(selectedPoll);
  const pollListSetters  = useMemo(() => [setPolls, setMyPolls, setVotedPolls], []);
  const { connected: liveConnected } = useLivePoll({
    pollId: selectedPollId,
    setSelectedPoll,
    pollListSetters,
  });

  // ── derived ──
  const currentPolls = useMemo(() => {
    if (activeView === "mine")  return myPolls;
    if (activeView === "voted") return votedPolls;
    return polls;
  }, [activeView, myPolls, polls, votedPolls]);

  const selectedPollIsMine = useMemo(
    () => myPolls.some((p) => String(getPollId(p)) === String(selectedPollId)),
    [myPolls, selectedPollId],
  );

  const stats = useMemo(() => {
    const totalVotes = polls.reduce((sum, p) => sum + (p.voteCount || 0), 0);
    return [
      { label: "Public polls",   value: pagination?.total ?? polls.length },
      { label: "Created by you", value: myPolls.length },
      { label: "Polls voted on", value: votedPolls.length },
      { label: "Total votes",    value: totalVotes },
    ];
  }, [myPolls.length, polls, votedPolls.length, pagination]);

  // ── data fetching ──
  const fetchAllPolls = useCallback(async ({
    page   = 1,
    search = searchQuery,
    clearMessages = true,
  } = {}) => {
    setLoading(true);
    if (clearMessages) { setError(""); setNotice(""); }

    try {
      const params = new URLSearchParams({ page, limit: PAGE_SIZE });
      if (search) params.set("search", search);

      const [result, ownedPolls, voted] = await Promise.all([
        apiRequest(`/api/poll/all?${params}`),
        token ? apiRequest("/api/poll/my-polls", { auth: true }) : Promise.resolve([]),
        token ? apiRequest("/api/poll/my-votes",  { auth: true }) : Promise.resolve([]),
      ]);

      setPolls(Array.isArray(result?.polls) ? result.polls : []);
      setPagination(result?.pagination ?? null);
      setCurrentPage(result?.pagination?.page ?? 1);
      setMyPolls(Array.isArray(ownedPolls)  ? ownedPolls  : []);
      setVotedPolls(Array.isArray(voted)    ? voted        : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery]);

  const openPoll = useCallback(async (pollId, { clearMessages = true } = {}) => {
    setDetailLoading(true);
    if (clearMessages) { setError(""); setNotice(""); }

    try {
      const poll = await apiRequest(`/api/poll/${pollId}`);
      setSelectedPoll(poll);
    } catch (err) {
      setError(err.message || "Failed to open poll");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllPolls({ page: 1, search: searchQuery });
    const pollId = new URLSearchParams(window.location.search).get("poll");
    if (pollId) openPoll(pollId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    fetchAllPolls({ page: currentPage, search: searchQuery, clearMessages: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  function commitSearch() {
    setSearchQuery(searchInput);
    setCurrentPage(1);
    fetchAllPolls({ page: 1, search: searchInput });
  }

  function handleSearchKey(e) {
    if (e.key === "Enter") commitSearch();
  }

  function goToPage(page) {
    if (!pagination) return;
    if (page < 1 || page > pagination.totalPages) return;
    setCurrentPage(page);
  }

  // ── actions ──
  async function publishPoll() {
    if (!selectedPollId) return;
    setPublishingPoll(true);
    setError(""); setNotice("");

    try {
      const publishedPoll = await apiRequest(`/api/poll/${selectedPollId}/publish`, {
        method: "POST",
        auth: true,
      });
      setSelectedPoll(publishedPoll);
      await fetchAllPolls({ page: currentPage, clearMessages: false });
      setNotice("Poll results published.");
    } catch (err) {
      setError(err.message || "Failed to publish poll");
    } finally {
      setPublishingPoll(false);
    }
  }

  async function createPoll(event) {
    event.preventDefault();
    setCreateError(""); setNotice("");

    const expiryDate = newPoll.expiresAt ? new Date(newPoll.expiresAt) : null;

    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      setCreateError("Expiry time must be a valid date."); return;
    }
    if (expiryDate && expiryDate <= new Date()) {
      setCreateError("Expiry time must be in the future."); return;
    }

    const payload = {
      title:        newPoll.title.trim(),
      description:  newPoll.description.trim(),
      responseMode: newPoll.responseMode,
      expiresAt:    expiryDate ? expiryDate.toISOString() : null,
      questions:    newPoll.questions.map((q) => ({
        text:     q.text.trim(),
        optional: q.optional,
        options:  q.options.map((o) => ({ text: o.text.trim() })),
      })),
    };

    if (!payload.title) { setCreateError("Poll title is required."); return; }

    const invalidQuestion = payload.questions.some(
      (q) => !q.text || q.options.filter((o) => o.text).length < 2,
    );
    if (invalidQuestion) {
      setCreateError("Each question needs text and at least two options."); return;
    }

    if (!payload.questions.some((q) => !q.optional)) {
      setCreateError("A poll must contain at least one required question."); return;
    }

    setCreatingPoll(true);
    try {
      const createdPoll = await apiRequest("/api/poll/create", {
        method: "POST",
        auth: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setNewPoll(emptyPoll());
      await fetchAllPolls({ page: 1, clearMessages: false });
      if (getPollId(createdPoll)) {
        await openPoll(getPollId(createdPoll), { clearMessages: false });
      }
      setNotice("Poll created.");
    } catch (err) {
      setCreateError(err.message || "Failed to create poll");
    } finally {
      setCreatingPoll(false);
    }
  }

  // ── form helpers ──
  const updateQuestion = (qi, updates) =>
    setNewPoll((c) => ({
      ...c,
      questions: c.questions.map((q, i) => (i === qi ? { ...q, ...updates } : q)),
    }));

  const updateOption = (qi, oi, text) =>
    setNewPoll((c) => ({
      ...c,
      questions: c.questions.map((q, i) => {
        if (i !== qi) return q;
        return { ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text } : o)) };
      }),
    }));

  const addQuestion = () =>
    setNewPoll((c) => ({ ...c, questions: [...c.questions, emptyQuestion()] }));

  const removeQuestion = (qi) =>
    setNewPoll((c) => ({
      ...c,
      questions: c.questions.length === 1
        ? c.questions
        : c.questions.filter((_, i) => i !== qi),
    }));

  const addOption = (qi) =>
    setNewPoll((c) => ({
      ...c,
      questions: c.questions.map((q, i) =>
        i === qi ? { ...q, options: [...q.options, { text: "" }] } : q,
      ),
    }));

  const removeOption = (qi, oi) =>
    setNewPoll((c) => ({
      ...c,
      questions: c.questions.map((q, i) => {
        if (i !== qi || q.options.length <= 2) return q;
        return { ...q, options: q.options.filter((_, j) => j !== oi) };
      }),
    }));

  async function copyPollLink(pollId) {
    const url = `${window.location.origin}/poll/${pollId}`;
    await navigator.clipboard.writeText(url);
    setNotice("Poll link copied.");
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <PageShell className="min-h-screen bg-black text-white" overlayOpacity={0.9} bgIndex={1}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wider text-teal-300">Polly dashboard</div>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Poll command center</h1>
            <p className="mt-3 max-w-2xl text-sm text-white/65">
              Create polls, review your activity, open live poll details.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={() => fetchAllPolls({ page: currentPage })}
              disabled={loading}
              className="h-10 border border-white/10 bg-white text-black hover:bg-white/90"
            >
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Refresh
            </Button>
            {token ? (
              <Button asChild variant="glass" className="h-10">
                <Link to="/analytics/creator">Analytics</Link>
              </Button>
            ) : null}
            {token ? (
              <Button
                type="button"
                variant="glass"
                className="h-10"
                onClick={async () => { await logout(); navigate("/"); }}
              >
                Logout
              </Button>
            ) : null}
          </div>
        </header>

        {/* ── Banners ── */}
        {notice ? (
          <div className="rounded-md border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {/* ── Stats ── */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="text-sm text-white/55">{item.label}</div>
              <div className="mt-2 text-3xl font-semibold">{item.value}</div>
            </div>
          ))}
        </section>

        <main className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <section className="flex flex-col gap-5">

            {/* ── View tabs + search ── */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all",   label: "All polls" },
                { id: "mine",  label: "My polls" },
                { id: "voted", label: "Voted" },
              ].map((view) => (
                <Button
                  key={view.id}
                  type="button"
                  variant="glass"
                  onClick={() => setActiveView(view.id)}
                  className={activeView === view.id ? "bg-white/15" : ""}
                >
                  {view.label}
                </Button>
              ))}

              {/* Search — only shown in "all" view where backend supports it */}
              {activeView === "all" ? (
                <div className="ml-auto flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
                    <Input
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleSearchKey}
                      placeholder="Search polls…"
                      className="h-9 w-48 border-white/10 bg-white/5 pl-8 text-sm text-white placeholder:text-white/30"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="glass"
                    className="h-9"
                    onClick={commitSearch}
                  >
                    Search
                  </Button>
                  {searchQuery ? (
                    <Button
                      type="button"
                      variant="glass"
                      className="h-9 text-white/50"
                      onClick={() => {
                        setSearchInput("");
                        setSearchQuery("");
                        fetchAllPolls({ page: 1, search: "" });
                      }}
                    >
                      Clear
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* ── Poll list ── */}
            <div className="rounded-lg border border-white/10 bg-black/35">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="font-medium">Polls</h2>
                <span className="text-sm text-white/50">
                  {activeView === "all" && pagination
                    ? `${pagination.total} total`
                    : `${currentPolls.length} shown`}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 px-4 py-8 text-white/65">
                  <Loader2 className="animate-spin" /> Loading polls…
                </div>
              ) : currentPolls.length === 0 ? (
                <div className="px-4 py-8 text-sm text-white/60">
                  {activeView === "all" && searchQuery
                    ? `No polls matching "${searchQuery}".`
                    : "No polls in this view yet."}
                </div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {currentPolls.map((poll) => {
                    const pollId    = getPollId(poll);
                    const isWatched = String(pollId) === String(selectedPollId);

                    return (
                      <li
                        key={pollId}
                        className={`flex flex-col gap-3 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                          isWatched ? "bg-white/5" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-medium">{poll.title}</h3>
                            <StatusBadge poll={poll} />
                          </div>
                          <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/50">
                            <span>{poll.voteCount ?? 0} votes</span>
                            {poll.createdAt ? (
                              <span>{new Date(poll.createdAt).toLocaleDateString()}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <Button
                            type="button"
                            variant="glass"
                            onClick={() => openPoll(pollId)}
                            title="Watch live updates"
                            className={isWatched ? "border-teal-400/30 text-teal-300" : ""}
                          >
                            <Eye />
                            {isWatched ? "Watching" : "Watch"}
                          </Button>
                          <Button
                            type="button"
                            variant="glass"
                            onClick={() => copyPollLink(pollId)}
                            title="Copy poll link"
                          >
                            <Copy />
                            Copy
                          </Button>
                          <Button asChild className="bg-white text-black hover:bg-white/90 hover:text-white">
                            <Link to={`/poll/${pollId}`}>
                              <BarChart3 /> Open
                            </Link>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* ── Pagination controls (all view only) ── */}
              {activeView === "all" && pagination && pagination.totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                  <span className="text-xs text-white/40">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="glass"
                      size="icon"
                      disabled={!pagination.hasPrev || loading}
                      onClick={() => goToPage(currentPage - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {/* Page number pills */}
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        // always show first, last, current ± 1
                        return (
                          p === 1 ||
                          p === pagination.totalPages ||
                          Math.abs(p - currentPage) <= 1
                        );
                      })
                      .reduce((acc, p, idx, arr) => {
                        // insert ellipsis markers
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("…");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, idx) =>
                        item === "…" ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-xs text-white/30">
                            …
                          </span>
                        ) : (
                          <Button
                            key={item}
                            type="button"
                            variant="glass"
                            size="icon"
                            disabled={loading}
                            onClick={() => goToPage(item)}
                            className={`h-8 w-8 text-xs ${
                              item === currentPage ? "bg-white/20 text-white" : "text-white/55"
                            }`}
                          >
                            {item}
                          </Button>
                        ),
                      )}

                    <Button
                      type="button"
                      variant="glass"
                      size="icon"
                      disabled={!pagination.hasNext || loading}
                      onClick={() => goToPage(currentPage + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Poll detail ── */}
            <div className="rounded-lg border border-white/10 bg-black/35 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-medium">Poll details</h2>
                <div className="flex items-center gap-3">
                  {selectedPoll ? (
                    <span className={`text-xs ${liveConnected ? "text-teal-300" : "text-white/40"}`}>
                      {liveConnected ? "Live" : "Connecting"}
                    </span>
                  ) : null}
                  {detailLoading ? <Loader2 className="animate-spin text-white/50" /> : null}
                </div>
              </div>

              {!selectedPoll ? (
                <div className="text-sm text-white/60">
                  Open a poll to view questions, counts, and voting controls.
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="flex flex-wrap items-start gap-2">
                      <h3 className="text-2xl font-semibold">{selectedPoll.title}</h3>
                      <StatusBadge poll={selectedPoll} />
                    </div>
                    {selectedPoll.description ? (
                      <p className="mt-2 text-sm text-white/60">{selectedPoll.description}</p>
                    ) : null}
                    <p className="mt-1 flex flex-wrap gap-3 text-sm text-white/55">
                      <span>{selectedPoll.voteCount ?? 0} total votes</span>
                      <span>{selectedPoll.responseMode || "anonymous"} responses</span>
                      {selectedPoll.expiresAt ? (
                        <span>
                          {new Date(selectedPoll.expiresAt) > new Date()
                            ? `Closes ${new Date(selectedPoll.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`
                            : `Closed ${new Date(selectedPoll.expiresAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {(selectedPoll.questions || []).map((question, qi) => {
                    const totalSelections = (question.options || []).reduce(
                      (sum, o) => sum + (o.selectedCount || 0),
                      0,
                    );
                    // find the highest count to highlight the leading option
                    const maxCount = Math.max(
                      0,
                      ...(question.options || []).map((o) => o.selectedCount || 0),
                    );

                    return (
                      <div key={getPollId(question)} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-medium">
                            {qi + 1}. {question.text}
                          </h4>
                          <span className="text-xs text-white/45">
                            {question.optional ? "Optional" : "Required"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {(question.options || []).map((option) => {
                            const count      = option.selectedCount || 0;
                            const percentage = totalSelections
                              ? Math.round((count / totalSelections) * 100)
                              : 0;
                            const isLeading  = maxCount > 0 && count === maxCount;

                            return (
                              <div
                                key={getPollId(option)}
                                className={`block rounded-md border p-3 transition-colors ${
                                  isLeading
                                    ? "border-teal-400/30 bg-teal-400/5"
                                    : "border-white/10 bg-black/25"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`flex-1 text-sm ${isLeading ? "font-medium text-teal-200" : ""}`}>
                                    {option.text}
                                  </span>
                                  <span className="text-xs text-white/55">
                                    {count} · {percentage}%
                                  </span>
                                  {isLeading && totalSelections > 0 ? (
                                    <span className="rounded-full bg-teal-400/20 px-1.5 py-0.5 text-[10px] font-medium text-teal-300">
                                      Leading
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isLeading ? "bg-teal-300" : "bg-white/30"
                                    }`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {selectedPollIsMine && !selectedPoll.isPublished ? (
                      <Button
                        type="button"
                        onClick={publishPoll}
                        disabled={publishingPoll}
                        className="h-10 bg-white text-black hover:bg-white/90"
                      >
                        {publishingPoll ? <Loader2 className="animate-spin" /> : <Send />}
                        Publish results
                      </Button>
                    ) : null}
                    <Button asChild variant="glass" className="h-10 border-white/20">
                      <Link to={`/poll/${getPollId(selectedPoll)}`}>Open poll page to vote</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Create poll sidebar ── */}
          <aside className="rounded-lg border border-white/10 bg-black/35 p-4 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-5">
              <h2 className="text-xl font-semibold">Create a poll</h2>
              <p className="mt-1 text-sm text-white/55">
                Add a title, one or more questions, and at least two options per question.
              </p>
            </div>

            {createError ? (
              <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {createError}
              </div>
            ) : null}

            <form onSubmit={createPoll} className="space-y-5">

              {/* Title */}
              <div>
                <div className="flex items-center">
                  <label htmlFor="poll-title" className="text-sm text-white/75">Title</label>
                  <CharCounter current={newPoll.title.length} max={TITLE_MAX} />
                </div>
                <Input
                  id="poll-title"
                  value={newPoll.title}
                  maxLength={TITLE_MAX}
                  onChange={(e) => setNewPoll((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Team lunch preference"
                  className="mt-2 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
              </div>

              {/* Description */}
              <div>
                <div className="flex items-center">
                  <label htmlFor="poll-description" className="text-sm text-white/75">
                    Description <span className="text-white/35">(optional)</span>
                  </label>
                  <CharCounter current={newPoll.description.length} max={DESC_MAX} />
                </div>
                <textarea
                  id="poll-description"
                  value={newPoll.description}
                  maxLength={DESC_MAX}
                  onChange={(e) => setNewPoll((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Add a short description to provide context"
                  className="mt-2 min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35"
                />
              </div>

              {/* Response mode + expiry */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-white/75">Response mode</label>
                  <Select
                    value={newPoll.responseMode}
                    onValueChange={(v) => setNewPoll((c) => ({ ...c, responseMode: v }))}
                  >
                    <SelectTrigger className="mt-2 w-full border-white/10 bg-white/5 text-white">
                      <SelectValue placeholder="Select response mode" />
                    </SelectTrigger>
                    <SelectContent className="border border-white/10 bg-white/5 text-white">
                      <SelectItem value="anonymous">Anonymous</SelectItem>
                      <SelectItem value="authenticated">Authenticated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm text-white/75">Expiry</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="glass"
                        className="mt-2 w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formatExpiryLabel(newPoll.expiresAt)}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white/5">
                      <Calendar
                        mode="single"
                        className="bg-transparent"
                        selected={newPoll.expiresAt ? new Date(newPoll.expiresAt) : undefined}
                        onSelect={(date) => {
                          if (!date) {
                            setNewPoll((c) => ({ ...c, expiresAt: "" }));
                            return;
                          }
                          const existing = newPoll.expiresAt ? new Date(newPoll.expiresAt) : new Date();
                          date.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
                          setNewPoll((c) => ({ ...c, expiresAt: date.toISOString() }));
                        }}
                        initialFocus
                      />
                      <div
                        className={`flex items-center gap-2 border-t border-white/10 px-3 py-2 ${
                          !newPoll.expiresAt ? "pointer-events-none opacity-40" : ""
                        }`}
                      >
                        <span className="text-xs text-white/50">Time</span>
                        <Select
                          value={newPoll.expiresAt ? String(new Date(newPoll.expiresAt).getHours()).padStart(2, "0") : "23"}
                          onValueChange={(h) => {
                            const date = newPoll.expiresAt ? new Date(newPoll.expiresAt) : new Date();
                            date.setHours(Number(h), date.getMinutes(), 0, 0);
                            setNewPoll((c) => ({ ...c, expiresAt: date.toISOString() }));
                          }}
                        >
                          <SelectTrigger className="h-8 w-20 border-white/10 bg-black/25 text-xs text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                              <SelectItem key={h} value={h}>{h}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-white/40">:</span>
                        <Select
                          value={newPoll.expiresAt ? String(new Date(newPoll.expiresAt).getMinutes()).padStart(2, "0") : "59"}
                          onValueChange={(m) => {
                            const date = newPoll.expiresAt ? new Date(newPoll.expiresAt) : new Date();
                            date.setMinutes(Number(m), 0, 0);
                            setNewPoll((c) => ({ ...c, expiresAt: date.toISOString() }));
                          }}
                        >
                          <SelectTrigger className="h-8 w-20 border-white/10 bg-black/25 text-xs text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0")).map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Questions */}
              <div className="space-y-4">
                {newPoll.questions.map((question, qi) => (
                  <div key={qi} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Question {qi + 1}</span>
                      <Button
                        type="button"
                        variant="glass"
                        size="icon"
                        onClick={() => removeQuestion(qi)}
                        disabled={newPoll.questions.length === 1}
                        title="Remove question"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <Input
                      value={question.text}
                      onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                      placeholder="What should we decide?"
                      className="h-10 border-white/10 bg-black/25 text-white placeholder:text-white/35"
                    />

                    <label className="mt-3 flex items-center gap-2 text-sm leading-none text-white/65">
                      <Checkbox
                        checked={question.optional}
                        onCheckedChange={(checked) => updateQuestion(qi, { optional: checked })}
                      />
                      Optional question
                    </label>

                    <div className="mt-3 space-y-2">
                      {question.options.map((option, oi) => (
                        <div key={oi} className="flex gap-2">
                          <Input
                            value={option.text}
                            onChange={(e) => updateOption(qi, oi, e.target.value)}
                            placeholder={`Option ${oi + 1}`}
                            className="h-10 border-white/10 bg-black/25 text-white placeholder:text-white/35"
                          />
                          <Button
                            type="button"
                            variant="glass"
                            size="icon"
                            onClick={() => removeOption(qi, oi)}
                            disabled={question.options.length <= 2}
                            title="Remove option"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="glass"
                      onClick={() => addOption(qi)}
                      className="mt-3"
                    >
                      <Plus /> Add option
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="glass" onClick={addQuestion} className="h-10">
                  <Plus /> Add question
                </Button>
                <Button
                  type="submit"
                  disabled={creatingPoll || !token}
                  className="h-10 bg-white text-black hover:bg-white/90"
                >
                  {creatingPoll ? <Loader2 className="animate-spin" /> : <Check />}
                  Create poll
                </Button>
              </div>

              {!token ? (
                <p className="text-xs text-white/50">Sign in again to create polls from this browser.</p>
              ) : null}
            </form>
          </aside>
        </main>
      </div>
    </PageShell>
  );
}