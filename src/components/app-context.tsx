"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import * as Q from "@/lib/supabase/queries";
import { Prode, Match, Prediction, MultiplierToken, WildcardChallenge, WildcardAnswer, StreakInfo, TokenMultiplier } from "@/lib/types";
import {
  MOCK_MATCHES, MOCK_MY_PREDICTIONS, MOCK_MY_TOKENS, MOCK_PRODE,
  MOCK_WILDCARDS, MOCK_MY_WILDCARD_ANSWERS, MOCK_POINTS_TODAY,
  CURRENT_USER_ID, CURRENT_USER_NAME,
} from "@/lib/mock-data";

export const MOCK_USER_EMAIL = "test@elprode.app";

const IS_SUPABASE = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("<your-project>") &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith("https://")
);

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface AppUser {
  id: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
}

export interface AppContextValue {
  // Auth
  user: AppUser | null;
  userLoading: boolean;
  // Prode
  prode: Prode | null;
  prodeId: string | null;
  prodeLoading: boolean;
  allProdes: Q.ProdeInfo[];
  switchProde: (id: string) => Promise<void>;
  refreshAndSwitch: (switchToId?: string) => Promise<void>;
  // Matches
  matches: Match[];
  matchesLoading: boolean;
  // My predictions (keyed by matchId)
  predictions: Record<string, Prediction>;
  predictionsLoading: boolean;
  savePrediction: (pred: { matchId: string; homeGoals: number; awayGoals: number; multiplier: TokenMultiplier; penaltyWinner?: "home" | "away" }) => Promise<{ error: string | null }>;
  // My tokens
  tokens: MultiplierToken[];
  tokensLoading: boolean;
  setTokens: (tokens: MultiplierToken[]) => void;
  updateTokenUsage: (multiplier: TokenMultiplier, matchId: string | null) => Promise<void>;
  // Streak
  streak: StreakInfo;
  // Wildcards
  wildcards: WildcardChallenge[];
  wildcardAnswers: Record<string, WildcardAnswer>;
  wildcardsLoading: boolean;
  submitWildcardAnswer: (challengeId: string, answer: string) => Promise<{ error: string | null }>;
  // Points today (keyed by userId)
  pointsToday: Record<string, number>;
  // Re-fetch user profile (e.g. after updating display name)
  refreshUser: () => Promise<void>;
  isMockMode: boolean;
  // Copycat sync
  mainProdeId: string | null;
  setMainProdeId: (id: string | null) => Promise<void>;
}

// -------------------------------------------------------
// Default values (mock mode)
// -------------------------------------------------------

const mockMe = MOCK_PRODE.members.find((m) => m.id === CURRENT_USER_ID)!;

const DEFAULT_VALUE: AppContextValue = {
  user: { id: CURRENT_USER_ID, displayName: CURRENT_USER_NAME, email: "guido@ejemplo.com" },
  userLoading: false,
  prode: MOCK_PRODE,
  prodeId: MOCK_PRODE.id,
  prodeLoading: false,
  allProdes: [{ id: MOCK_PRODE.id, name: MOCK_PRODE.name, adminId: MOCK_PRODE.adminId, inviteCode: MOCK_PRODE.inviteCode, createdAt: MOCK_PRODE.createdAt }],
  switchProde: async () => {},
  refreshAndSwitch: async () => {},
  matches: MOCK_MATCHES,
  matchesLoading: false,
  predictions: MOCK_MY_PREDICTIONS,
  predictionsLoading: false,
  savePrediction: async () => ({ error: null }),
  tokens: MOCK_MY_TOKENS,
  tokensLoading: false,
  setTokens: () => {},
  updateTokenUsage: async () => {},
  streak: mockMe.streak,
  wildcards: MOCK_WILDCARDS,
  wildcardAnswers: MOCK_MY_WILDCARD_ANSWERS,
  wildcardsLoading: false,
  submitWildcardAnswer: async () => ({ error: null }),
  pointsToday: MOCK_POINTS_TODAY,
  refreshUser: async () => {},
  isMockMode: true,
  mainProdeId: null,
  setMainProdeId: async () => {},
};

// -------------------------------------------------------
// Context
// -------------------------------------------------------

const AppContext = createContext<AppContextValue>(DEFAULT_VALUE);
export const useApp = () => useContext(AppContext);

// -------------------------------------------------------
// Provider
// -------------------------------------------------------

export function AppProvider({ children }: { children: React.ReactNode }) {
  if (!IS_SUPABASE) {
    return <AppContext.Provider value={DEFAULT_VALUE}>{children}</AppContext.Provider>;
  }
  return <AppProviderSupabase>{children}</AppProviderSupabase>;
}

function AppProviderSupabase({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isMockMode, setIsMockMode] = useState(false);

  const [prode, setProde] = useState<Prode | null>(null);
  const [prodeId, setProdeId] = useState<string | null>(null);
  const [prodeLoading, setProdeLoading] = useState(true);
  const [allProdes, setAllProdes] = useState<Q.ProdeInfo[]>([]);

  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);

  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [predictionsLoading, setPredictionsLoading] = useState(true);

  const [tokens, setTokens] = useState<MultiplierToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);

  const [streak, setStreak] = useState<StreakInfo>({ current: 0, best: 0, bonusNext: 0 });

  const [wildcards, setWildcards] = useState<WildcardChallenge[]>([]);
  const [wildcardAnswers, setWildcardAnswers] = useState<Record<string, WildcardAnswer>>({});
  const [wildcardsLoading, setWildcardsLoading] = useState(true);

  const [pointsToday, setPointsToday] = useState<Record<string, number>>({});

  const [mainProdeId, setMainProdeIdState] = useState<string | null>(null);

  // Stable refs so callbacks don't go stale
  const userIdRef = useRef<string | null>(null);
  const mainProdeIdRef = useRef<string | null>(null);
  const allProdesRef = useRef<Q.ProdeInfo[]>([]);
  const matchesRef = useRef<Match[]>([]);
  const prodeIdRef = useRef<string | null>(null);

  // -------------------------------------------------------
  // Load prode-specific data (reusable for initial load + switchProde)
  // -------------------------------------------------------

  const loadProdeData = useCallback(async (info: Q.ProdeInfo, userId: string) => {
    setProdeLoading(true);
    setPredictionsLoading(true);
    setTokensLoading(true);
    setWildcardsLoading(true);
    setProdeId(info.id);

    const [prodeData, predsData, tokensData, streakData, wildcardsData, answersData, ptsTodayData] =
      await Promise.all([
        Q.getProde(info.id, info),
        Q.getMyPredictions(userId, info.id),
        Q.getMyTokens(userId, info.id),
        Q.getMyStreak(userId, info.id),
        Q.getWildcards(info.id),
        Q.getMyWildcardAnswers(userId),
        Q.getPointsToday(info.id),
      ]);

    setProde(prodeData);
    setProdeLoading(false);
    setPredictions(predsData);
    setPredictionsLoading(false);
    setTokens(tokensData);
    setTokensLoading(false);
    setStreak(streakData);
    setWildcards(wildcardsData);
    setWildcardAnswers(answersData);
    setWildcardsLoading(false);
    setPointsToday(ptsTodayData);
  }, []);

  // -------------------------------------------------------
  // Load user session
  // -------------------------------------------------------

  const refreshUser = useCallback(async () => {
    const supabase = createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      setUserLoading(false);
      userIdRef.current = null;
      return;
    }
    if (authUser.email === MOCK_USER_EMAIL) {
      setIsMockMode(true);
      setUserLoading(false);
      return;
    }
    const profile = await Q.getMyProfile(authUser.id);
    const appUser: AppUser = {
      id: authUser.id,
      email: authUser.email,
      displayName: profile?.displayName ?? authUser.email?.split("@")[0] ?? "Usuario",
      avatarUrl: profile?.avatarUrl,
    };
    setUser(appUser);
    userIdRef.current = authUser.id;
    const loadedMainProdeId = profile?.mainProdeId ?? null;
    setMainProdeIdState(loadedMainProdeId);
    mainProdeIdRef.current = loadedMainProdeId;
    setUserLoading(false);
  }, []);

  useEffect(() => {
    refreshUser();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        userIdRef.current = null;
      } else {
        refreshUser();
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshUser]);

  // -------------------------------------------------------
  // Load matches + Realtime subscription
  // -------------------------------------------------------

  useEffect(() => {
    Q.getMatches().then((data) => {
      setMatches(data);
      setMatchesLoading(false);
    });

    const supabase = createClient();
    const matchChannel = supabase
      .channel("realtime-matches")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;
          setMatches((prev) =>
            prev.map((m) =>
              m.id === updated.id
                ? {
                    ...m,
                    status: updated.status as Match["status"],
                    homeScore: (updated.home_score as number | null) ?? undefined,
                    awayScore: (updated.away_score as number | null) ?? undefined,
                  }
                : m
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(matchChannel); };
  }, []);

  // Keep refs in sync with state (for use in callbacks)
  useEffect(() => { allProdesRef.current = allProdes; }, [allProdes]);
  useEffect(() => { matchesRef.current = matches; }, [matches]);
  useEffect(() => { prodeIdRef.current = prodeId; }, [prodeId]);

  // Refresh dynamic data when user returns to the tab (covers realtime gaps)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      Q.getMatches().then(setMatches);
      const pid = prodeIdRef.current;
      if (pid) {
        const info = allProdesRef.current.find((p) => p.id === pid);
        if (info) Q.getProde(pid, info).then((p) => { if (p?.members?.length) setProde(p); });
        Q.getPointsToday(pid).then(setPointsToday);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Poll every 30s during live/recent matches (reliable fallback when realtime isn't configured)
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const hasActive = matchesRef.current.some((m) => {
        const kickoff = new Date(m.date).getTime();
        if (m.status === "FINISHED") return now - kickoff < 2 * 60 * 60 * 1000; // recién terminó
        return kickoff <= now + 5 * 60 * 1000; // arrancó (o está por arrancar) y no terminó
      });
      if (!hasActive) return;

      Q.getMatches().then(setMatches);
      const pid = prodeIdRef.current;
      if (pid) {
        const info = allProdesRef.current.find((p) => p.id === pid);
        if (info) Q.getProde(pid, info).then((p) => { if (p?.members?.length) setProde(p); });
        Q.getPointsToday(pid).then(setPointsToday);
      }
    };

    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // -------------------------------------------------------
  // Load prode + user-specific data once user is available
  // -------------------------------------------------------

  useEffect(() => {
    if (!user) return;

    let predChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    let tokenChannel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;

    const init = async () => {
      const infos = await Q.getAllMyProdes(user.id);
      if (infos.length === 0) {
        setProdeLoading(false);
        setPredictionsLoading(false);
        setTokensLoading(false);
        setWildcardsLoading(false);
        window.location.href = "/join";
        return;
      }

      setAllProdes(infos);

      // Pick previously-selected prode or default to first
      const savedId = typeof window !== "undefined" ? localStorage.getItem("activeProdeId") : null;
      const active = infos.find((i) => i.id === savedId) ?? infos[0];

      await loadProdeData(active, user.id);

      // Realtime: predictions
      const supabase = createClient();
      predChannel = supabase
        .channel(`realtime-predictions-${user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "predictions", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (!row?.match_id) return; // DELETE events have no .new
            const matchId = row.match_id as string;
            setPredictions((prev) => ({
              ...prev,
              [matchId]: {
                id: row.id as string,
                userId: row.user_id as string,
                matchId,
                prodeId: row.prode_id as string,
                homeGoals: row.home_goals as number,
                awayGoals: row.away_goals as number,
                multiplier: row.multiplier as TokenMultiplier,
                penaltyWinner: (row.penalty_winner as "home" | "away") ?? undefined,
                pointsEarned: (row.points_earned as number | null) ?? undefined,
              },
            }));

            // When points are calculated (match finished), refresh match status and leaderboard
            if (row.points_earned != null) {
              Q.getMatches().then((fresh) => setMatches(fresh));
              const pid = prodeIdRef.current;
              if (pid) {
                const info = allProdesRef.current.find((p) => p.id === pid);
                if (info) Q.getProde(pid, info).then((p) => { if (p?.members?.length) setProde(p); });
                Q.getPointsToday(pid).then((pts) => setPointsToday(pts));
              }
            }
          }
        )
        .subscribe();

      // Realtime: tokens
      tokenChannel = supabase
        .channel(`realtime-tokens-${user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "multiplier_tokens", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            setTokens((prev) =>
              prev.map((t) =>
                t.multiplier === (row.multiplier as number)
                  ? { ...t, decayed: row.decayed as boolean }
                  : t
              )
            );
          }
        )
        .subscribe();
    };

    init();

    return () => {
      const supabase = createClient();
      if (predChannel) supabase.removeChannel(predChannel);
      if (tokenChannel) supabase.removeChannel(tokenChannel);
    };
  }, [user?.id, loadProdeData]);

  // -------------------------------------------------------
  // Switch prode
  // -------------------------------------------------------

  const switchProde = useCallback(async (id: string) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const info = allProdes.find((p) => p.id === id);
    if (!info) return;
    if (typeof window !== "undefined") localStorage.setItem("activeProdeId", id);
    await loadProdeData(info, userId);
  }, [allProdes, loadProdeData]);

  // Refresh the allProdes list (e.g. after joining/creating/leaving a prode)
  // and optionally switch to a specific prode (by id).
  const refreshAndSwitch = useCallback(async (switchToId?: string) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const infos = await Q.getAllMyProdes(userId);
    setAllProdes(infos);
    if (infos.length === 0) {
      if (typeof window !== "undefined") window.location.href = "/join";
      return;
    }
    // Determine target prode
    let target: Q.ProdeInfo | undefined;
    if (switchToId) {
      target = infos.find((p) => p.id === switchToId);
    }
    // If current prode is no longer in the list (left/deleted), auto-pick first
    const currentStillExists = infos.some((p) => p.id === prodeId);
    if (!target && !currentStillExists) {
      target = infos[0];
    }
    if (target) {
      if (typeof window !== "undefined") localStorage.setItem("activeProdeId", target.id);
      await loadProdeData(target, userId);
    }
  }, [prodeId, loadProdeData]);

  // -------------------------------------------------------
  // Copycat sync helpers
  // -------------------------------------------------------

  // Sync one prediction from main prode to a single secondary prode.
  // Respects token availability: only copies multiplier if the token is free in secondary.
  const syncPredToSecondary = useCallback(async (
    userId: string,
    pred: { matchId: string; homeGoals: number; awayGoals: number; multiplier: TokenMultiplier; penaltyWinner?: "home" | "away" },
    secondaryProdeId: string
  ): Promise<void> => {
    const secondaryTokens = await Q.getMyTokens(userId, secondaryProdeId);
    let effectiveMultiplier: TokenMultiplier = pred.multiplier;

    if (pred.multiplier === 1) {
      // Freeing a token: clear any secondary token that was on this match
      for (const token of secondaryTokens) {
        if (token.usedOnMatchId === pred.matchId) {
          await Q.updateTokenUsage(userId, secondaryProdeId, token.multiplier, null);
        }
      }
    } else {
      const secToken = secondaryTokens.find((t) => t.multiplier === pred.multiplier);
      const available = secToken && !secToken.decayed &&
        (!secToken.usedOnMatchId || secToken.usedOnMatchId === pred.matchId);
      if (available) {
        await Q.updateTokenUsage(userId, secondaryProdeId, pred.multiplier, pred.matchId);
      } else {
        effectiveMultiplier = 1;
      }
    }

    await Q.upsertPrediction({
      userId,
      matchId: pred.matchId,
      prodeId: secondaryProdeId,
      homeGoals: pred.homeGoals,
      awayGoals: pred.awayGoals,
      multiplier: effectiveMultiplier,
      penaltyWinner: pred.penaltyWinner,
    });
  }, []);

  // Set main prode: persist to DB and run retroactive sync of all future predictions.
  const setMainProdeId = useCallback(async (id: string | null) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const { error } = await Q.updateMainProdeId(userId, id);
    if (error) return;
    setMainProdeIdState(id);
    mainProdeIdRef.current = id;

    if (!id) return;

    // Retroactive sync: copy all non-locked predictions from main to secondary prodes
    const now = new Date();
    const currentMatches = matchesRef.current;
    const currentAllProdes = allProdesRef.current;
    const secondaryProdes = currentAllProdes.filter((p) => p.id !== id);
    if (secondaryProdes.length === 0) return;

    const futureMatchIds = new Set(
      currentMatches
        .filter((m) => m.status === "SCHEDULED" && new Date(m.date) > now)
        .map((m) => m.id)
    );
    if (futureMatchIds.size === 0) return;

    const mainPreds = await Q.getMyPredictions(userId, id);
    const toSync = Object.values(mainPreds).filter((p) => futureMatchIds.has(p.matchId));
    if (toSync.length === 0) return;

    for (const secondary of secondaryProdes) {
      for (const pred of toSync) {
        await syncPredToSecondary(userId, {
          matchId: pred.matchId,
          homeGoals: pred.homeGoals,
          awayGoals: pred.awayGoals,
          multiplier: pred.multiplier,
          penaltyWinner: pred.penaltyWinner,
        }, secondary.id);
      }
    }
  }, [syncPredToSecondary]);

  // -------------------------------------------------------
  // Actions
  // -------------------------------------------------------

  const savePrediction = useCallback(
    async (pred: { matchId: string; homeGoals: number; awayGoals: number; multiplier: TokenMultiplier; penaltyWinner?: "home" | "away" }) => {
      if (!user || !prodeId) return { error: "No autenticado" };
      const result = await Q.upsertPrediction({ userId: user.id, prodeId, ...pred });
      if (!result.error) {
        setPredictions((prev) => ({
          ...prev,
          [pred.matchId]: {
            id: `${user.id}-${pred.matchId}`,
            userId: user.id,
            matchId: pred.matchId,
            prodeId,
            homeGoals: pred.homeGoals,
            awayGoals: pred.awayGoals,
            multiplier: pred.multiplier,
            penaltyWinner: pred.penaltyWinner,
          },
        }));

        // Copycat: sync to all secondary prodes when saving in main prode
        const currentMainProdeId = mainProdeIdRef.current;
        if (currentMainProdeId && prodeId === currentMainProdeId) {
          const secondaryProdes = allProdesRef.current.filter((p) => p.id !== currentMainProdeId);
          for (const secondary of secondaryProdes) {
            syncPredToSecondary(user.id, pred, secondary.id);
          }
        }
      }
      return result;
    },
    [user, prodeId, syncPredToSecondary]
  );

  const updateTokenUsage = useCallback(
    async (multiplier: TokenMultiplier, matchId: string | null) => {
      if (!user || !prodeId) return;
      await Q.updateTokenUsage(user.id, prodeId, multiplier, matchId);
      setTokens((prev) =>
        prev.map((t) => (t.multiplier === multiplier ? { ...t, usedOnMatchId: matchId ?? undefined } : t))
      );
    },
    [user, prodeId]
  );

  const submitWildcardAnswer = useCallback(
    async (challengeId: string, answer: string) => {
      if (!user) return { error: "No autenticado" };
      const result = await Q.upsertWildcardAnswer(user.id, challengeId, answer);
      if (!result.error) {
        setWildcardAnswers((prev) => ({
          ...prev,
          [challengeId]: {
            challengeId,
            userId: user.id,
            answer,
            submittedAt: new Date().toISOString(),
          },
        }));
      }
      return result;
    },
    [user]
  );

  const value = useMemo<AppContextValue>(() => ({
    user,
    userLoading,
    prode,
    prodeId,
    prodeLoading,
    allProdes,
    switchProde,
    refreshAndSwitch,
    matches,
    matchesLoading,
    predictions,
    predictionsLoading,
    savePrediction,
    tokens,
    tokensLoading,
    setTokens,
    updateTokenUsage,
    streak,
    wildcards,
    wildcardAnswers,
    wildcardsLoading,
    submitWildcardAnswer,
    pointsToday,
    refreshUser,
    isMockMode: false,
    mainProdeId,
    setMainProdeId,
  }), [
    user, userLoading, prode, prodeId, prodeLoading, allProdes, switchProde,
    refreshAndSwitch, matches, matchesLoading, predictions, predictionsLoading,
    savePrediction, tokens, tokensLoading, updateTokenUsage, streak, wildcards,
    wildcardAnswers, wildcardsLoading, submitWildcardAnswer, pointsToday,
    refreshUser, mainProdeId, setMainProdeId,
  ]);

  if (isMockMode) {
    return <AppContext.Provider value={DEFAULT_VALUE}>{children}</AppContext.Provider>;
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
