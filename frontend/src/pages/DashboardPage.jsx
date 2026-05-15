import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { useLivePoll } from "@/hooks/useLivePoll";
import { apiRequest } from "@/lib/api";

const emptyQuestion = () => ({
  text: "",
  optional: false,
  options: [{ text: "" }, { text: "" }],
});

const emptyPoll = () => ({
  title: "",
  responseMode: "anonymous",
  expiresAt: "",
  questions: [emptyQuestion()],
});

const getPollId = (poll) => poll?._id || poll?.id;

export function DashboardPage() {
  const [activeView, setActiveView] = useState("all");
  const [polls, setPolls] = useState([]);
  const [myPolls, setMyPolls] = useState([]);
  const [votedPolls, setVotedPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [publishingPoll, setPublishingPoll] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createError, setCreateError] = useState("");
  const [newPoll, setNewPoll] = useState(emptyPoll);

  const token = typeof window !== "undefined"
    ? localStorage.getItem("accessToken")
    : "";
  const selectedPollId = getPollId(selectedPoll);
  const pollListSetters = useMemo(
    () => [setPolls, setMyPolls, setVotedPolls],
    [],
  );
  const { connected: liveConnected } = useLivePoll({
    pollId: selectedPollId,
    setSelectedPoll,
    pollListSetters,
  });

  const currentPolls = useMemo(() => {
    if (activeView === "mine") return myPolls;
    if (activeView === "voted") return votedPolls;
    return polls;
  }, [activeView, myPolls, polls, votedPolls]);

  const selectedPollIsMine = useMemo(
    () => myPolls.some((poll) => String(getPollId(poll)) === String(selectedPollId)),
    [myPolls, selectedPollId],
  );

  const stats = useMemo(() => {
    const totalVotes = polls.reduce((sum, poll) => sum + (poll.voteCount || 0), 0);
    return [
      { label: "Public polls", value: polls.length },
      { label: "Created by you", value: myPolls.length },
      { label: "Votes cast", value: votedPolls.length },
      { label: "Total votes", value: totalVotes },
    ];
  }, [myPolls.length, polls, votedPolls.length]);

  const fetchDashboardData = useCallback(async ({ clearMessages = true } = {}) => {
    setLoading(true);
    if (clearMessages) {
      setError("");
      setNotice("");
    }

    try {
      const [allPolls, ownedPolls, voted] = await Promise.all([
        apiRequest("/api/poll/all"),
        token ? apiRequest("/api/poll/my-polls", { auth: true }) : Promise.resolve([]),
        token ? apiRequest("/api/poll/my-votes", { auth: true }) : Promise.resolve([]),
      ]);

      setPolls(Array.isArray(allPolls) ? allPolls : []);
      setMyPolls(Array.isArray(ownedPolls) ? ownedPolls : []);
      setVotedPolls(Array.isArray(voted) ? voted : []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  const openPoll = useCallback(async (pollId, { clearMessages = true } = {}) => {
    setDetailLoading(true);
    if (clearMessages) {
      setError("");
      setNotice("");
    }

    try {
      const poll = await apiRequest(`/api/poll/${pollId}`);
      setSelectedPoll(poll);
    } catch (err) {
      setError(err.message || "Failed to open poll");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchDashboardData();

    const pollId = new URLSearchParams(window.location.search).get("poll");
    if (pollId) {
      openPoll(pollId);
    }
  }, [fetchDashboardData, openPoll]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function publishPoll() {
    if (!selectedPollId) return;

    setPublishingPoll(true);
    setError("");
    setNotice("");

    try {
      const publishedPoll = await apiRequest(`/api/poll/${selectedPollId}/publish`, {
        method: "POST",
        auth: true,
      });

      setSelectedPoll(publishedPoll);
      await fetchDashboardData({ clearMessages: false });
      setNotice("Poll results published.");
    } catch (err) {
      setError(err.message || "Failed to publish poll");
    } finally {
      setPublishingPoll(false);
    }
  }

  async function createPoll(event) {
    event.preventDefault();
    setCreateError("");
    setNotice("");

    const expiryDate = newPoll.expiresAt ? new Date(newPoll.expiresAt) : null;

    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      setCreateError("Expiry time must be a valid date.");
      return;
    }

    if (expiryDate && expiryDate <= new Date()) {
      setCreateError("Expiry time must be in the future.");
      return;
    }

    const payload = {
      title: newPoll.title.trim(),
      responseMode: newPoll.responseMode,
      expiresAt: expiryDate ? expiryDate.toISOString() : null,
      questions: newPoll.questions.map((question) => ({
        text: question.text.trim(),
        optional: question.optional,
        options: question.options.map((option) => ({ text: option.text.trim() })),
      })),
    };

    if (!payload.title) {
      setCreateError("Poll title is required.");
      return;
    }

    const invalidQuestion = payload.questions.some(
      (question) =>
        !question.text ||
        question.options.filter((option) => option.text).length < 2,
    );

    if (invalidQuestion) {
      setCreateError("Each question needs text and at least two options.");
      return;
    }

    const hasRequiredQuestion = payload.questions.some((question) => !question.optional);

    if (!hasRequiredQuestion) {
      setCreateError("A poll must contain at least one required question.");
      return;
    }

    setCreatingPoll(true);

    try {
      const createdPoll = await apiRequest("/api/poll/create", {
        method: "POST",
        auth: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      setNewPoll(emptyPoll());
      await fetchDashboardData({ clearMessages: false });

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

  function updateQuestion(questionIndex, updates) {
    setNewPoll((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex ? { ...question, ...updates } : question,
      ),
    }));
  }

  function updateOption(questionIndex, optionIndex, text) {
    setNewPoll((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex) return question;

        return {
          ...question,
          options: question.options.map((option, optionIdx) =>
            optionIdx === optionIndex ? { ...option, text } : option,
          ),
        };
      }),
    }));
  }

  function addQuestion() {
    setNewPoll((current) => ({
      ...current,
      questions: [...current.questions, emptyQuestion()],
    }));
  }

  function removeQuestion(questionIndex) {
    setNewPoll((current) => ({
      ...current,
      questions:
        current.questions.length === 1
          ? current.questions
          : current.questions.filter((_, index) => index !== questionIndex),
    }));
  }

  function addOption(questionIndex) {
    setNewPoll((current) => ({
      ...current,
      questions: current.questions.map((question, index) =>
        index === questionIndex
          ? { ...question, options: [...question.options, { text: "" }] }
          : question,
      ),
    }));
  }

  function removeOption(questionIndex, optionIndex) {
    setNewPoll((current) => ({
      ...current,
      questions: current.questions.map((question, index) => {
        if (index !== questionIndex || question.options.length <= 2) return question;

        return {
          ...question,
          options: question.options.filter((_, optionIdx) => optionIdx !== optionIndex),
        };
      }),
    }));
  }

  async function copyPollLink(pollId) {
    const url = `${window.location.origin}/poll/${pollId}`;
    await navigator.clipboard.writeText(url);
    setNotice("Poll link copied.");
  }

  return (
    <PageShell className="min-h-screen bg-black text-white" overlayOpacity={0.9} bgIndex={1}>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
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
              onClick={fetchDashboardData}
              disabled={loading}
              className="h-10 border border-white/10 bg-white text-black hover:bg-white/90"
            >
              {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Refresh
            </Button>
            {token ? (
              <Button asChild variant="outline" className="h-10 border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white">
                <Link to="/analytics/creator">Analytics</Link>
              </Button>
            ) : null}
          </div>
        </header>

        {notice ? (
          <div className="rounded-md border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
            {notice}
          </div>
        ) : null}

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
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All polls" },
                { id: "mine", label: "My polls" },
                { id: "voted", label: "Voted" },
              ].map((view) => (
                <Button
                  key={view.id}
                  type="button"
                  variant="outline"
                  onClick={() => setActiveView(view.id)}
                  className={`border-white/15 text-white hover:bg-white/10 hover:text-white ${
                    activeView === view.id ? "bg-white/15" : "bg-black/20"
                  }`}
                >
                  {view.label}
                </Button>
              ))}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/35">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h2 className="font-medium">Polls</h2>
                <span className="text-sm text-white/50">{currentPolls.length} shown</span>
              </div>

              {loading ? (
                <div className="flex items-center gap-2 px-4 py-8 text-white/65">
                  <Loader2 className="animate-spin" />
                  Loading polls...
                </div>
              ) : currentPolls.length === 0 ? (
                <div className="px-4 py-8 text-sm text-white/60">No polls in this view yet.</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {currentPolls.map((poll) => {
                    const pollId = getPollId(poll);

                    return (
                      <li key={pollId} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-medium">{poll.title}</h3>
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
                            variant="outline"
                            onClick={() => copyPollLink(pollId)}
                            className="border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
                            title="Copy poll link"
                          >
                            <Copy />
                            Copy
                          </Button>
                          <Button asChild className="bg-white text-black hover:bg-white/90 hover:text-white">
                            <Link to={`/poll/${pollId}`}>
                              <BarChart3 />
                              Open
                            </Link>
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

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
                <div className="text-sm text-white/60">Open a poll to view questions, counts, and voting controls.</div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="text-2xl font-semibold">{selectedPoll.title}</h3>
                    <p className="mt-1 flex flex-wrap gap-3 text-sm text-white/55">
                      <span>{selectedPoll.voteCount ?? 0} total votes</span>
                      <span>{selectedPoll.responseMode || "anonymous"} responses</span>
                      {selectedPoll.isPublished ? <span>Published</span> : null}
                    </p>
                  </div>

                  {(selectedPoll.questions || []).map((question, questionIndex) => {
                    const totalSelections = (question.options || []).reduce(
                      (sum, option) => sum + (option.selectedCount || 0),
                      0,
                    );

                    return (
                      <div key={getPollId(question)} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-1">
                          <h4 className="font-medium">
                            {questionIndex + 1}. {question.text}
                          </h4>
                          <span className="text-xs text-white/45">
                            {question.optional ? "Optional" : "Required"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {(question.options || []).map((option) => {
                            const count = option.selectedCount || 0;
                            const percentage = totalSelections
                              ? Math.round((count / totalSelections) * 100)
                              : 0;

                            return (
                              <div key={getPollId(option)} className="block rounded-md border border-white/10 bg-black/25 p-3">
                                <div className="flex items-center gap-3">
                                  <span className="flex-1 text-sm">{option.text}</span>
                                  <span className="text-xs text-white/55">{count} votes</span>
                                </div>
                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className="h-full rounded-full bg-teal-300"
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

                    <Button asChild variant="outline" className="h-10 border-white/20 bg-black/20 text-white hover:bg-white/10">
                      <Link to={`/poll/${getPollId(selectedPoll)}`}>Open poll page to vote</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </section>

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
              <div>
                <label htmlFor="poll-title" className="text-sm text-white/75">
                  Title
                </label>
                <Input
                  id="poll-title"
                  value={newPoll.title}
                  onChange={(event) =>
                    setNewPoll((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Team lunch preference"
                  className="mt-2 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="response-mode" className="text-sm text-white/75">
                    Response mode
                  </label>
                  <select
                    id="response-mode"
                    value={newPoll.responseMode}
                    onChange={(event) =>
                      setNewPoll((current) => ({
                        ...current,
                        responseMode: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/25 px-3 text-sm text-white outline-none focus-visible:border-white/40"
                  >
                    <option value="anonymous">Anonymous</option>
                    <option value="authenticated">Authenticated</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="poll-expiry" className="text-sm text-white/75">
                    Expiry
                  </label>
                  <Input
                    id="poll-expiry"
                    type="datetime-local"
                    value={newPoll.expiresAt}
                    onChange={(event) =>
                      setNewPoll((current) => ({
                        ...current,
                        expiresAt: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 border-white/10 bg-white/5 text-white placeholder:text-white/35"
                  />
                </div>
              </div>

              <div className="space-y-4">
                {newPoll.questions.map((question, questionIndex) => (
                  <div key={questionIndex} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-medium">Question {questionIndex + 1}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeQuestion(questionIndex)}
                        disabled={newPoll.questions.length === 1}
                        className="border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
                        title="Remove question"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <Input
                      value={question.text}
                      onChange={(event) =>
                        updateQuestion(questionIndex, { text: event.target.value })
                      }
                      placeholder="What should we decide?"
                      className="h-10 border-white/10 bg-black/25 text-white placeholder:text-white/35"
                    />

                    <label className="mt-3 flex items-center gap-2 text-sm text-white/65">
                      <input
                        type="checkbox"
                        checked={question.optional}
                        onChange={(event) =>
                          updateQuestion(questionIndex, { optional: event.target.checked })
                        }
                        className="h-4 w-4 accent-teal-300"
                      />
                      Optional question
                    </label>

                    <div className="mt-3 space-y-2">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex gap-2">
                          <Input
                            value={option.text}
                            onChange={(event) =>
                              updateOption(questionIndex, optionIndex, event.target.value)
                            }
                            placeholder={`Option ${optionIndex + 1}`}
                            className="h-10 border-white/10 bg-black/25 text-white placeholder:text-white/35"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeOption(questionIndex, optionIndex)}
                            disabled={question.options.length <= 2}
                            className="border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
                            title="Remove option"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addOption(questionIndex)}
                      className="mt-3 border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
                    >
                      <Plus />
                      Add option
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addQuestion}
                  className="h-10 border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white"
                >
                  <Plus />
                  Add question
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
