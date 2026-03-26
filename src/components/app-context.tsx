"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import * as Q from "@/lib/supabase/queries";
import { Prode, Match, Prediction, MultiplierToken, WildcardChallenge, WildcardAnswer, StreakInfo, TokenMultiplier } from "@/lib/types";
import {
  MOCK_MATCHES, MOCK_MY_PREDICTIONS, MOCK_MY_TOKENS, MOCK_PRODE,
  MOCK_WILDCARDS, MOCK_MY_WILDCARD_ANSWERS, MOCK_POINTS_TODAY,
  CURRENT_USER_ID, CURRENT_USER_NAME,
} from "@/lib/mock-data";

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

  // Stable ref to current userId so callbacks don't go stale
  const userIdRef = useRef<string | null>(null);

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

  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setUserLoading(false);
        userIdRef.current = null;
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
      setUserLoading(false);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
        userIdRef.current = null;
      } else {
        loadUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
          { event: "UPDATE", schema: "public", table: "predictions", filter: `user_id=eq.${user.id}` },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const matchId = row.match_id as string;
            const pointsEarned = row.points_earned as number | null;
            setPredictions((prev) => {
              if (!prev[matchId]) return prev;
              return { ...prev, [matchId]: { ...prev[matchId], pointsEarned: pointsEarned ?? undefined } };
            });
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
      }
      return result;
    },
    [user, prodeId]
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

  const value: AppContextValue = {
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
