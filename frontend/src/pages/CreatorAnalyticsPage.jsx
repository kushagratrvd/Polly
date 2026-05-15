import { useEffect, useState, useCallback } from "react";
import { useLiveAnalytics } from "@/hooks/useLiveAnalytics";
import { useLivePoll } from "@/hooks/useLivePoll";
import { PageShell } from "@/components/shared/PageShell";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BarChart3, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function CreatorAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const payload = await apiRequest("/api/poll/analytics/creator", { auth: true });
        if (!mounted) return;
        setData(payload);
      } catch (err) {
        if (!mounted) return;
        setError(err.message || "Failed to load analytics");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const refetch = useCallback(async () => {
    try {
      const payload = await apiRequest("/api/poll/analytics/creator", { auth: true });
      setData(payload);
    } catch (err) {
      console.warn("failed to refetch analytics", err.message);
    }
  }, []);

  // pass a stable callback to avoid re-subscribing repeatedly
  useLiveAnalytics({ onEvent: refetch });

  const [watchedPoll, setWatchedPoll] = useState(null);
  const watchedPollId = watchedPoll?._id || watchedPoll?.id || null;

  // subscribe to live updates for a single watched poll
  useLivePoll({ pollId: watchedPollId, setSelectedPoll: setWatchedPoll });

  return (
    <PageShell className="min-h-screen bg-black text-white" overlayOpacity={0.9} bgIndex={1}>
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Creator analytics</h1>
          <Button asChild>
            <Link to="/dashboard">
              <BarChart3 /> Dashboard
            </Link>
          </Button>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="animate-spin" /> Loading analytics...
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <div className="text-sm text-white/60">Polls created</div>
                <div className="mt-2 text-2xl font-bold">{data.pollsCreated}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <div className="text-sm text-white/60">Total votes</div>
                <div className="mt-2 text-2xl font-bold">{data.totalVotes}</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center">
                <div className="text-sm text-white/60">Top poll</div>
                <div className="mt-2 text-lg font-medium">{data.topPolls?.[0]?.title ?? "—"}</div>
                <div className="text-xs text-white/55">{data.topPolls?.[0]?.voteCount ?? 0} votes</div>
              </div>
            </div>

            <section>
              <h2 className="text-lg font-medium">Top polls</h2>
              <ul className="mt-3 space-y-2">
                {data.topPolls && data.topPolls.length ? (
                  data.topPolls.map((p) => (
                    <li key={p._id || p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 p-3">
                      <div className="text-sm">{p.title}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-white/55">{p.voteCount} votes</div>
                        <Button size="sm" onClick={async () => {
                          // fetch full poll and start watching
                          try {
                            const poll = await apiRequest(`/api/poll/${p._id}`, { auth: true });
                            setWatchedPoll(poll);
                          } catch (err) {
                            console.warn("failed to load poll for watch", err.message);
                          }
                        }}>
                          Watch
                        </Button>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="text-sm text-white/60">No polls yet.</div>
                )}
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-medium">Recent polls</h2>
              <ul className="mt-3 space-y-2">
                {data.recentPolls && data.recentPolls.length ? (
                  data.recentPolls.map((p) => (
                    <li key={p._id || p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-black/25 p-3">
                      <div className="text-sm">{p.title}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-white/55">{new Date(p.createdAt).toLocaleString()}</div>
                        <Button size="sm" onClick={async () => {
                          try {
                            const poll = await apiRequest(`/api/poll/${p._id}`, { auth: true });
                            setWatchedPoll(poll);
                          } catch (err) {
                            console.warn("failed to load poll for watch", err.message);
                          }
                        }}>
                          Watch
                        </Button>
                      </div>
                    </li>
                  ))
                ) : (
                  <div className="text-sm text-white/60">No recent polls.</div>
                )}
              </ul>
            </section>

            {watchedPoll && (
              <section className="rounded-md border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-white/60">Watching</div>
                    <div className="mt-1 text-lg font-semibold">{watchedPoll.title}</div>
                    <div className="text-xs text-white/55">{watchedPoll.voteCount} votes</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setWatchedPoll(null)}>Stop</Button>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {watchedPoll.questions?.map((q) => {
                    const totalSelections = (q.options || []).reduce(
                      (sum, option) => sum + (option.selectedCount || 0),
                      0,
                    );

                    return (
                      <div key={q._id || q.id} className="rounded-md bg-white/5 p-2">
                        <div className="text-sm font-medium">{q.text}</div>

                        <div className="mt-2 space-y-2">
                          {(q.options || []).map((opt) => {
                            const count = opt.selectedCount || 0;
                            const percentage = totalSelections ? Math.round((count / totalSelections) * 100) : 0;

                            return (
                              <div key={opt._id || opt.id} className="rounded-md border border-white/10 bg-black/25 p-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">{opt.text}</span>
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
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
