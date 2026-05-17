import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Check,
  Loader2,
  RefreshCw,
  Users,
  Zap,
  Shield,
  Clock,
  Globe,
  TrendingUp,
  MessageSquare,
  Lock,
} from "lucide-react";
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { useLivePoll } from "@/hooks/useLivePoll";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/auth/useAuth";

const getPollId = (poll) => poll?._id || poll?.id;

// ─── Static data ────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create a poll",
    description:
      "Sign in and build a poll with multiple questions and options. Set an expiry time, choose anonymous or authenticated responses.",
    icon: MessageSquare,
    color: "teal",
  },
  {
    step: "02",
    title: "Share the link",
    description:
      "Copy your poll link and send it anywhere — no setup required for voters. Public polls are visible to everyone on the homepage.",
    icon: Globe,
    color: "blue",
  },
  {
    step: "03",
    title: "Watch results live",
    description:
      "Results update in real time as votes come in. Open the dashboard to watch the live feed or publish results when you're done.",
    icon: TrendingUp,
    color: "purple",
  },
];

const FEATURES = [
  {
    icon: Zap,
    color: "teal",
    title: "Real-time updates",
    description: "Vote counts stream live via WebSocket. No refresh needed.",
  },
  {
    icon: Users,
    color: "blue",
    title: "Anonymous voting",
    description: "Public visitors can vote without creating an account.",
  },
  {
    icon: BarChart3,
    color: "purple",
    title: "Creator dashboard",
    description: "Track polls, votes, and analytics from one place.",
  },
  {
    icon: Shield,
    color: "rose",
    title: "Authenticated mode",
    description: "Restrict voting to signed-in users when you need accountability.",
  },
  {
    icon: Clock,
    color: "amber",
    title: "Expiry dates",
    description: "Set a date and time for polls to automatically close.",
  },
  {
    icon: Lock,
    color: "green",
    title: "Publish control",
    description: "Results stay private until you decide to publish them.",
  },
];

const SOCIAL_PROOF = [
  { quote: "Finally a polling tool that doesn't look like a Google Form.", handle: "@devnull_io" },
  { quote: "Used it for our team standup vote. Saw results appear in real time — genuinely cool.", handle: "@sera.builds" },
  { quote: "Anonymous mode made it easy to get honest feedback from the team.", handle: "@yusuf_codes" },
  { quote: "Shared the link in Slack, had 40 responses in two minutes.", handle: "@marekpm" },
];

const colorMap = {
  teal: { bg: "bg-teal-400/15", text: "text-teal-300", ring: "ring-teal-400/20" },
  blue: { bg: "bg-blue-400/15", text: "text-blue-300", ring: "ring-blue-400/20" },
  purple: { bg: "bg-purple-400/15", text: "text-purple-300", ring: "ring-purple-400/20" },
  rose: { bg: "bg-rose-400/15", text: "text-rose-300", ring: "ring-rose-400/20" },
  amber: { bg: "bg-amber-400/15", text: "text-amber-300", ring: "ring-amber-400/20" },
  green: { bg: "bg-green-400/15", text: "text-green-300", ring: "ring-green-400/20" },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-wider text-white/60">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/10" />;
}

// ─── Main component ──────────────────────────────────────────────────────────

export function HomePage() {
  const [polls, setPolls] = useState([]);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const [loadingPolls, setLoadingPolls] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const totalVotes = useMemo(
    () => polls.reduce((sum, poll) => sum + (poll.voteCount || 0), 0),
    [polls],
  );

  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const featuredPolls = useMemo(() => polls.slice(0, 6), [polls]);
  const selectedPollId = getPollId(selectedPoll);
  const pollListSetters = useMemo(() => [setPolls], []);
  useLivePoll({ pollId: selectedPollId, setSelectedPoll, pollListSetters });

  const fetchPublicPolls = useCallback(async ({ clearMessages = true } = {}) => {
    setLoadingPolls(true);
    if (clearMessages) { setError(""); setNotice(""); }
    try {
      const data = await apiRequest("/api/poll/all");
      setPolls(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load public polls");
    } finally {
      setLoadingPolls(false);
    }
  }, []);

  useEffect(() => { fetchPublicPolls(); }, [fetchPublicPolls]);

  return (
    <PageShell overlayOpacity={0.85} bgIndex={1} className="relative min-h-screen text-white">

      {/* ── Nav ── */}
      <nav className="absolute top-0 z-50 flex w-full items-center justify-between p-6 lg:px-12">
        <div className="text-2xl font-semibold tracking-tight">Polly</div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
            Dashboard
          </Link>
          {!isAuthenticated ? (
            <>
              <Link to="/login" className="text-sm font-medium text-white/70 transition-colors hover:text-white">
                Sign In
              </Link>
              <Button asChild variant="secondary" className="rounded-full border border-white/10 bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white">
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="text-sm font-medium text-black"
              onClick={async () => { await logout(); navigate("/"); }}
            >
              Logout
            </Button>
          )}
        </div>
      </nav>

      <main className="mx-auto flex max-w-6xl flex-col px-6 pt-28 lg:pt-36">

        {/* ── Hero ── */}
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
            <Button asChild size="lg" className="h-14 w-full rounded-full bg-white px-8 text-base text-black hover:bg-white/90 hover:text-white sm:w-auto">
              <a href="#public-polls">Vote Now <ArrowRight className="ml-2 h-5 w-5" /></a>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 w-full rounded-full border-white/20 bg-black/20 px-8 text-base text-white backdrop-blur-sm hover:bg-white/10 hover:text-white sm:w-auto">
              <Link to="/dashboard">Open Dashboard <BarChart3 className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </section>

        {/* ── Quick features strip ── */}
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

        {/* ── How it works ── */}
        <section className="mt-28">
          <Divider />
          <div className="pt-16">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="mt-6 text-3xl font-medium sm:text-4xl">Up and running in seconds.</h2>
            <p className="mt-3 max-w-xl text-white/60">
              No setup, no configuration. Create a poll and share the link — that's it.
            </p>

            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {HOW_IT_WORKS.map(({ step, title, description, icon: Icon, color }) => {
                const c = colorMap[color];
                return (
                  <div key={step} className="relative rounded-xl border border-white/10 bg-white/5 p-6">
                    {/* Step number — top right watermark */}
                    <div className="absolute right-5 top-4 font-mono text-4xl font-bold text-white/5 select-none">
                      {step}
                    </div>
                    <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full ring-1 ${c.bg} ${c.text} ${c.ring}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-base font-semibold">{title}</h3>
                    <p className="text-sm text-white/55 leading-relaxed">{description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── All features grid ── */}
        <section className="mt-28">
          <Divider />
          <div className="pt-16">
            <SectionLabel>Everything included</SectionLabel>
            <h2 className="mt-6 text-3xl font-medium sm:text-4xl">Built for the full workflow.</h2>
            <p className="mt-3 max-w-xl text-white/60">
              From creation to results — every part of the polling lifecycle is covered.
            </p>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, color, title, description }) => {
                const c = colorMap[color];
                return (
                  <div key={title} className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{title}</h3>
                      <p className="mt-1 text-sm text-white/50">{description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Social proof ── */}
        <section className="mt-28">
          <Divider />
          <div className="pt-16">
            <SectionLabel>What people say</SectionLabel>
            <h2 className="mt-6 text-3xl font-medium sm:text-4xl">Straight from the feed.</h2>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {SOCIAL_PROOF.map(({ quote, handle }) => (
                <div key={handle} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm leading-relaxed text-white/75">"{quote}"</p>
                  <p className="mt-3 font-mono text-xs text-white/35">{handle}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Public polls feed ── */}
        <section id="public-polls" className="mt-28 scroll-mt-24 text-left">
          <Divider />
          <div className="pt-16">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <SectionLabel>Public polls</SectionLabel>
                <h2 className="mt-6 text-3xl font-medium sm:text-4xl">Jump into the live feed.</h2>
                <p className="mt-3 max-w-2xl text-white/60">
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
                  variant="glass"
                  className="h-full min-h-14 border-white/20"
                >
                  {loadingPolls ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Refresh
                </Button>
              </div>
            </div>

            {error ? (
              <div className="mt-6 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            ) : null}
            {notice ? (
              <div className="mt-6 rounded-md border border-teal-400/30 bg-teal-400/10 px-4 py-3 text-sm text-teal-100">{notice}</div>
            ) : null}

            <div className="mt-8 flex justify-center">
              <div className="w-full max-w-3xl rounded-lg border border-white/10 bg-black/30">
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
                      const isSelected = getPollId(selectedPoll) === pollId;
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
                                className={isSelected ? "bg-teal-300 text-black hover:bg-teal-200" : "bg-white text-black hover:bg-white/90 hover:text-white"}
                              >
                                <Link to={`/poll/${pollId}`}>
                                  {isSelected ? <Check /> : <BarChart3 />}
                                  {isSelected ? "Opened" : "Open"}
                                </Link>
                              </Button>
                              <Button asChild variant="glass">
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
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mb-16 mt-28 rounded-xl border border-white/10 bg-white/5 p-8 text-left">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-medium sm:text-4xl">Ready to launch your first poll?</h2>
              <p className="mt-3 max-w-xl text-white/60">
                Create an account to build polls with multiple questions, track what you made, and revisit polls you voted on.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-white/90 hover:text-white">
                <Link to="/signup">Start Creating</Link>
              </Button>
              <Button asChild variant="glass" size="lg" className="rounded-full border-white/20">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="border-t border-white/10 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm font-semibold tracking-tight">Polly</div>
            <div className="flex gap-6 text-xs text-white/40">
              <Link to="/dashboard" className="hover:text-white/70 transition-colors">Dashboard</Link>
              <Link to="/login" className="hover:text-white/70 transition-colors">Sign In</Link>
              <Link to="/signup" className="hover:text-white/70 transition-colors">Sign Up</Link>
            </div>
            <p className="text-xs text-white/25">© {new Date().getFullYear()} Polly. All rights reserved.</p>
          </div>
        </footer>

      </main>
    </PageShell>
  );
}