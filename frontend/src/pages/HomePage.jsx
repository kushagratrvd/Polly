import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Loader2,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

const getPollId = (poll) => poll?._id || poll?.id;

export function HomePage() {
  const [polls, setPolls] = useState([]);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [error, setError] = useState("");

  const totalVotes = useMemo(
    () => polls.reduce((sum, poll) => sum + (poll.voteCount || 0), 0),
    [polls],
  );

  const featuredPolls = useMemo(() => polls.slice(0, 6), [polls]);

  const fetchPublicPolls = useCallback(async ({ clearMessages = true } = {}) => {
    setLoadingPolls(true);
    if (clearMessages) {
      setError("");
    }

    try {
      const data = await apiRequest("/api/poll/all");
      setPolls(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load public polls");
    } finally {
      setLoadingPolls(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchPublicPolls();
  }, [fetchPublicPolls]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <PageShell
      overlayOpacity={0.85}
      bgIndex={1}
      className="relative min-h-screen text-white"
    >
      <nav className="absolute top-0 z-50 flex w-full items-center justify-between p-6 lg:px-12">
        <div className="text-2xl font-semibold tracking-tight">Polly</div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm font-medium transition-colors hover:text-white/80">
            Dashboard
          </Link>
          <Link to="/login" className="text-sm font-medium transition-colors hover:text-white/80">
            Sign In
          </Link>
          <Button asChild variant="secondary" className="rounded-full border border-white/5 bg-white/10 text-white backdrop-blur-md hover:bg-white/20">
            <Link to="/signup">Sign Up</Link>
          </Button>
        </div>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col px-6 pt-28 lg:pt-36">
        <section className="z-10 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-2 font-mono text-[12px] tracking-wider text-teal-300 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
            Real-time Polling Engine
          </div>

          <h1 className="mx-auto mb-8 max-w-4xl text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-[80px]">
            Make Decisions <br />
            <span className="bg-linear-to-r from-teal-300 via-emerald-200 to-emerald-100 bg-clip-text text-transparent">
              in Real Time.
            </span>
          </h1>

          <p className="mx-auto mb-12 max-w-2xl text-md font-light text-white/70 sm:text-xl">
            Browse active polls, cast a vote anonymously, or sign in when you are ready to create and manage polls from the dashboard.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 w-full rounded-full bg-white px-8 text-base text-black hover:bg-white/90 sm:w-auto"
            >
              <a href="#public-polls">
                Vote Now <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 w-full rounded-full border-white/20 bg-black/20 px-8 text-base text-white backdrop-blur-sm hover:bg-white/10 sm:w-auto"
            >
              <Link to="/dashboard">
                Open Dashboard <BarChart3 className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="mt-24 grid grid-cols-1 gap-8 border-t border-white/10 pt-12 text-left sm:grid-cols-3">
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-400/20 text-teal-300">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium">Instant Updates</h3>
            <p className="text-sm font-light text-white/60">Vote counts refresh as people submit responses.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-400/20 text-blue-300">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium">Anonymous Voting</h3>
            <p className="text-sm font-light text-white/60">Public visitors can participate without creating an account.</p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-400/20 text-purple-300">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-medium">Creator Dashboard</h3>
            <p className="text-sm font-light text-white/60">Sign in to create polls, track your votes, and manage your activity.</p>
          </div>
        </section>

        <section id="public-polls" className="mt-24 scroll-mt-24 text-left">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/70">
                Public polls
              </div>
              <h2 className="mt-6 text-3xl font-medium sm:text-4xl">Jump into the live feed.</h2>
              <p className="mt-3 max-w-2xl text-white/70">
                These polls come from the same API used by the dashboard. Voting here submits anonymously through the public vote endpoint.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-2xl font-semibold">{polls.length}</div>
                <div className="text-xs text-white/50">polls</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                <div className="text-2xl font-semibold">{totalVotes}</div>
                <div className="text-xs text-white/50">votes</div>
              </div>
              <Button
                type="button"
                onClick={fetchPublicPolls}
                disabled={loadingPolls}
                variant="outline"
                className="h-full min-h-14 border-white/20 bg-black/20 text-white hover:bg-white/10"
              >
                {loadingPolls ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Refresh
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1.1fr)]">
            <div className="rounded-lg border border-white/10 bg-black/30">
              <div className="border-b border-white/10 px-4 py-3">
                <h3 className="font-medium">Available polls</h3>
              </div>

              {loadingPolls ? (
                <div className="flex items-center gap-2 px-4 py-8 text-white/65">
                  <Loader2 className="animate-spin" />
                  Loading public polls...
                </div>
              ) : featuredPolls.length === 0 ? (
                <div className="px-4 py-8 text-sm text-white/60">No public polls yet.</div>
              ) : (
                <ul className="divide-y divide-white/10">
                  {featuredPolls.map((poll) => {
                    const pollId = getPollId(poll);

                    return (
                      <li key={pollId} className="px-4 py-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <h4 className="truncate text-base font-medium">{poll.title}</h4>
                            <div className="mt-1 text-xs text-white/50">{poll.voteCount ?? 0} votes</div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <Button
                              asChild
                              className="bg-white text-black hover:bg-white/90"
                            >
                              <Link to={`/poll/${pollId}`}>
                                <BarChart3 />
                                Vote
                              </Link>
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              className="border-white/15 bg-black/20 text-white hover:bg-white/10"
                            >
                              <Link to={`/poll/${pollId}`}>Details</Link>
                            </Button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <div className="mb-4">
                <h3 className="font-medium">Vote on poll pages</h3>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-6 text-sm text-white/65">
                Live vote counts are visible in the poll list and refresh on demand. To vote or see full details, open the specific poll page from the list.
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16 mt-24 rounded-lg border border-white/10 bg-white/5 p-8 text-left">
          <h2 className="text-3xl font-medium sm:text-4xl">Ready to launch your first poll?</h2>
          <p className="mt-3 max-w-2xl text-white/70">
            Create an account to build polls with multiple questions, track what you made, and revisit polls you voted on.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90">
              <Link to="/signup">Start Creating</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full border-white/20 bg-black/20 text-white hover:bg-white/10">
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
