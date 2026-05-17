import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, Loader2 } from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { useLivePoll } from "@/hooks/useLivePoll";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/auth/useAuth";

const getPollId = (poll) => poll?._id || poll?.id;

const formatExpiry = (value) =>
  new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function PollResults({ poll }) {
  return (
    <div className="space-y-5">
      {(poll.questions || []).map((question, questionIndex) => {
        const totalSelections = (question.options || []).reduce(
          (sum, option) => sum + (option.selectedCount || 0),
          0,
        );

        return (
          <div key={getPollId(question)} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <h2 className="font-medium">
              {questionIndex + 1}. {question.text}
            </h2>
            <div className="mt-4 space-y-3">
              {(question.options || []).map((option) => {
                const count = option.selectedCount || 0;
                const percentage = totalSelections
                  ? Math.round((count / totalSelections) * 100)
                  : 0;

                return (
                  <div key={getPollId(option)} className="rounded-md border border-white/10 bg-black/25 p-3">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <span>{option.text}</span>
                      <span className="text-white/60">{count} votes — {percentage}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-teal-300" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PublicPollPage() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasVoted, setHasVoted] = useState(false);
  const [copied, setCopied] = useState(false);

  const { isAuthenticated } = useAuth();
  const token = isAuthenticated;
  const pollId = getPollId(poll) || id;
  const { connected: liveConnected } = useLivePoll({
    pollId,
    setSelectedPoll: setPoll,
  });

  const isExpired = Boolean(poll?.expiresAt && new Date(poll.expiresAt) <= new Date());
  const requiresLogin = poll?.responseMode === "authenticated" && !token;
  const canVote = poll && !poll.isPublished && !isExpired && !requiresLogin && !hasVoted;

  useEffect(() => {
    let mounted = true;
    if (!token || !pollId) return;

    (async () => {
      try {
        const voted = await apiRequest("/api/poll/my-votes", { auth: true });
        if (!mounted) return;
        const found = Array.isArray(voted) && voted.some((p) => String(p._id ?? p.id) === String(pollId));
        setHasVoted(Boolean(found));
      } catch {
        // ignore errors here; we'll rely on server-side validation on submit
      }
    })();

    return () => { mounted = false; };
  }, [token, pollId]);

  const fetchPoll = useCallback(async ({ clearMessages = true } = {}) => {
    setLoading(true);
    if (clearMessages) {
      setError("");
      setNotice("");
    }

    try {
      const data = await apiRequest(`/api/poll/${id}`);
      setPoll(data);
    } catch (err) {
      setError(err.message || "Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function submitVote() {
    if (!poll) return;

    const questions = poll.questions || [];
    const missingRequired = questions.some(
      (question) => !question.optional && !selectedAnswers[getPollId(question)],
    );

    if (missingRequired) {
      setError("Please answer every required question before submitting.");
      return;
    }

    if (hasVoted) {
      setError("You have already voted on this poll.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      await apiRequest("/api/poll/submit", {
        method: "POST",
        auth: Boolean(token),
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollId: getPollId(poll),
          selected: Object.entries(selectedAnswers).map(([question, option]) => ({
            question,
            option,
          })),
        }),
      });

      await fetchPoll({ clearMessages: false });
      setHasVoted(true);
      setNotice("Vote submitted.");
    } catch (err) {
      setError(err.message || "Failed to submit vote");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell className="min-h-screen bg-black text-white" overlayOpacity={0.9} bgIndex={1}>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">

        {/* ── Top nav ── */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" className="w-fit border-white/15 bg-black/20 text-white hover:bg-white/10 hover:text-white">
            <Link to="/">
              <ArrowLeft />
              Home
            </Link>
          </Button>

          <Button
            type="button"
            variant="glass"
            onClick={copyLink}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied!" : "Share"}
          </Button>
        </div>

        {/* ── Messages ── */}
        {error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="rounded-md border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
            {notice}
          </div>
        ) : null}

        {/* ── Loading ── */}
        {loading ? (
          <div className="flex items-center gap-2 text-white/65">
            <Loader2 className="animate-spin" />
            Loading poll...
          </div>
        ) : !poll ? (
          <div className="rounded-md border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/60">
            Poll not found.
          </div>
        ) : (
          <section className="rounded-lg border border-white/10 bg-black/35 p-5">

            {/* ── Poll header ── */}
            <div className="mb-6 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-teal-300">
                  {poll.isPublished ? "Published results" : "Public poll"}
                </div>
                <h1 className="mt-2 text-3xl font-semibold">{poll.title}</h1>
                {poll.description ? (
                  <p className="mt-2 text-sm text-white/60">{poll.description}</p>
                ) : null}
                <p className="mt-2 flex flex-wrap gap-3 text-sm text-white/55">
                  <span>{poll.voteCount ?? 0} responses</span>
                  <span>{poll.responseMode || "anonymous"} mode</span>
                  {poll.expiresAt ? (
                    <span>Expires {formatExpiry(poll.expiresAt)}</span>
                  ) : null}
                </p>
              </div>
              <span className={`shrink-0 text-xs ${liveConnected ? "text-teal-300" : "text-white/40"}`}>
                {liveConnected ? "Live" : "Connecting"}
              </span>
            </div>

            {/* ── Poll body ── */}
            {poll.isPublished ? (
              <PollResults poll={poll} />
            ) : isExpired ? (
              <div className="space-y-5">
                <div className="rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                  This poll has expired and no longer accepts responses.
                </div>
                <PollResults poll={poll} />
              </div>
            ) : requiresLogin ? (
              <div className="rounded-md border border-white/10 bg-white/5 p-5">
                <p className="text-sm text-white/70">This poll requires an authenticated response.</p>
                <Button asChild className="mt-4 bg-white text-black hover:bg-white/90 hover:text-white">
                  <Link to="/login">Sign in to vote</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">

                {/* Already voted notice */}
                {hasVoted ? (
                  <div className="rounded-md border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">
                    You've already voted on this poll. Results update live below.
                  </div>
                ) : null}

                {/* Question count */}
                {poll.questions?.length > 1 ? (
                  <p className="text-xs text-white/40">
                    {poll.questions.length} questions — answer all required ones before submitting.
                  </p>
                ) : null}

                {(poll.questions || []).map((question, questionIndex) => (
                  <div key={getPollId(question)} className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-1">
                        <h2 className="font-medium">
                          {questionIndex + 1}. {question.text}
                        </h2>
                        <span className="text-xs text-white/45">
                          {question.optional ? "Optional" : "Required"}
                        </span>
                      </div>
                      {poll.questions?.length > 1 ? (
                        <span className="shrink-0 text-xs text-white/30">
                          {questionIndex + 1}/{poll.questions.length}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 space-y-3">
                      {(question.options || []).map((option) => (
                        <label
                          key={getPollId(option)}
                          className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition-colors ${
                            selectedAnswers[getPollId(question)] === getPollId(option)
                              ? "border-teal-400/40 bg-teal-400/10"
                              : "border-white/10 bg-black/25 hover:bg-white/5"
                          } ${hasVoted ? "pointer-events-none opacity-60" : ""}`}
                        >
                          <input
                            type="radio"
                            name={getPollId(question)}
                            checked={selectedAnswers[getPollId(question)] === getPollId(option)}
                            onChange={() =>
                              setSelectedAnswers((current) => ({
                                ...current,
                                [getPollId(question)]: getPollId(option),
                              }))
                            }
                            disabled={hasVoted}
                            className="h-4 w-4 accent-teal-300"
                          />
                          <span className="text-sm">{option.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={submitVote}
                    disabled={submitting || !canVote}
                    className="h-11 bg-teal-300 text-black hover:bg-teal-200 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="animate-spin" />
                    ) : hasVoted ? (
                      <Check />
                    ) : (
                      <Check />
                    )}
                    {submitting ? "Submitting..." : hasVoted ? "Already voted" : "Submit response"}
                  </Button>

                  {!hasVoted ? (
                    <span className="text-xs text-white/35">
                      {poll.voteCount ?? 0} responses so far
                    </span>
                  ) : null}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </PageShell>
  );
}