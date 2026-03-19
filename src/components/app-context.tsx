"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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
  // Matches
  matches: Match[];
  matchesLoading: boolean;
  // My predictions (keyed by matchId)
  predictions: Record<string, Prediction>;
  predictionsLoading: boolean;
  savePrediction: (pred: { matchId: string; homeGoals: number; awayGoals: number; multiplier: TokenMultiplier }) => Promise<{ error: string | null }>;
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
  // In mock mode, just use defaults
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

  // Load user session
  useEffect(() => {
    const supabase = createClient();

    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setUserLoading(false);
        return;
      }
      const profile = await Q.getMyProfile(authUser.id);
      setUser({
        id: authUser.id,
        email: authUser.email,
        displayName: profile?.displayName ?? authUser.email?.split("@")[0] ?? "Usuario",
        avatarUrl: profile?.avatarUrl,
      });
      setUserLoading(false);
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else {
        loadUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load matches + subscribe to Realtime changes
  useEffect(() => {
    Q.getMatches().then((data) => {
      setMatches(data);
      setMatchesLoading(false);
    });

    // Realtime: update a match when it changes in the DB (e.g. LIVE, FINISHED, scores)
    // Note: enable realtime on the 'matches' table in Supabase dashboard for this to work.
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

  // Load prode + user-specific data once user is available
  useEffect(() => {
    if (!user) return;

    Q.getMyProdeInfo(user.id).then(async (info) => {
      if (!info) {
        setProdeLoading(false);
        setPredictionsLoading(false);
        setTokensLoading(false);
        setWildcardsLoading(false);
        // Usuario autenticado pero sin prode → redirigir a join/crear
        window.location.href = "/join";
        return;
      }

      setProdeId(info.id);

      // Load all user data in parallel
      const [prodeData, predsData, tokensData, streakData, wildcardsData, answersData, ptsTodayData] =
        await Promise.all([
          Q.getProde(info.id, info),
          Q.getMyPredictions(user.id, info.id),
          Q.getMyTokens(user.id, info.id),
          Q.getMyStreak(user.id, info.id),
          Q.getWildcards(info.id),
          Q.getMyWildcardAnswers(user.id),
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

      // Realtime: when points_earned updates on our predictions (after cron calculates)
      // Note: enable realtime on the 'predictions' table in Supabase dashboard.
      const supabase = createClient();
      const predChannel = supabase
        .channel(`realtime-predictions-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "predictions",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const matchId = row.match_id as string;
            const pointsEarned = row.points_earned as number | null;
            setPredictions((prev) => {
              if (!prev[matchId]) return prev;
              return {
                ...prev,
                [matchId]: { ...prev[matchId], pointsEarned: pointsEarned ?? undefined },
              };
            });
          }
        )
        .subscribe();

      // Realtime: token decay (decayed = true pushed from cron)
      const tokenChannel = supabase
        .channel(`realtime-tokens-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "multiplier_tokens",
            filter: `user_id=eq.${user.id}`,
          },
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

      return () => {
        supabase.removeChannel(predChannel);
        supabase.removeChannel(tokenChannel);
      };
    });
  }, [user?.id]);

  const savePrediction = useCallback(
    async (pred: { matchId: string; homeGoals: number; awayGoals: number; multiplier: TokenMultiplier }) => {
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
