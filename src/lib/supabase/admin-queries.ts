import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Supabase service role key not configured");
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// -------------------------------------------------------
// Stats
// -------------------------------------------------------

export async function getAdminStats() {
  const sb = getAdminClient();
  const [
    { count: usersCount },
    { count: prodesCount },
    { count: matchesCount },
    { count: predictionsCount },
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("prodes").select("*", { count: "exact", head: true }),
    sb.from("matches").select("*", { count: "exact", head: true }),
    sb.from("predictions").select("*", { count: "exact", head: true }),
  ]);
  return {
    users: usersCount ?? 0,
    prodes: prodesCount ?? 0,
    matches: matchesCount ?? 0,
    predictions: predictionsCount ?? 0,
  };
}

// -------------------------------------------------------
// Users
// -------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  prodes_count: number;
  predictions_count: number;
  last_sign_in_at: string | null;
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const sb = getAdminClient();

  const [{ data: authUsers }, { data: profiles }, { data: members }, { data: preds }] =
    await Promise.all([
      sb.auth.admin.listUsers({ perPage: 1000 }),
      sb.from("profiles").select("id, display_name, avatar_url, created_at"),
      sb.from("prode_members").select("user_id"),
      sb.from("predictions").select("user_id"),
    ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const prodesCountMap = new Map<string, number>();
  const predsCountMap = new Map<string, number>();

  for (const m of members ?? []) {
    prodesCountMap.set(m.user_id, (prodesCountMap.get(m.user_id) ?? 0) + 1);
  }
  for (const p of preds ?? []) {
    predsCountMap.set(p.user_id, (predsCountMap.get(p.user_id) ?? 0) + 1);
  }

  return (authUsers?.users ?? []).map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "(sin email)",
      display_name: profile?.display_name ?? u.email?.split("@")[0] ?? "Sin nombre",
      avatar_url: profile?.avatar_url ?? null,
      created_at: profile?.created_at ?? u.created_at,
      prodes_count: prodesCountMap.get(u.id) ?? 0,
      predictions_count: predsCountMap.get(u.id) ?? 0,
      last_sign_in_at: u.last_sign_in_at ?? null,
    };
  });
}

export async function deleteUser(userId: string) {
  const sb = getAdminClient();
  const { error } = await sb.auth.admin.deleteUser(userId);
  return { error: error?.message ?? null };
}

// -------------------------------------------------------
// Prodes
// -------------------------------------------------------

export interface AdminProde {
  id: string;
  name: string;
  admin_id: string;
  admin_name: string;
  invite_code: string;
  prize_description: string | null;
  created_at: string;
  members_count: number;
}

export async function getAllProdes(): Promise<AdminProde[]> {
  const sb = getAdminClient();
  const [{ data: prodes }, { data: profiles }, { data: members }] = await Promise.all([
    sb.from("prodes").select("*").order("created_at", { ascending: false }),
    sb.from("profiles").select("id, display_name"),
    sb.from("prode_members").select("prode_id"),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const membersCountMap = new Map<string, number>();
  for (const m of members ?? []) {
    membersCountMap.set(m.prode_id, (membersCountMap.get(m.prode_id) ?? 0) + 1);
  }

  return (prodes ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    admin_id: p.admin_id,
    admin_name: profileMap.get(p.admin_id)?.display_name ?? "Desconocido",
    invite_code: p.invite_code,
    prize_description: p.prize_description ?? null,
    created_at: p.created_at,
    members_count: membersCountMap.get(p.id) ?? 0,
  }));
}

export interface AdminProdeDetail extends AdminProde {
  members: {
    user_id: string;
    display_name: string;
    email: string;
    joined_at: string;
    total_points: number;
  }[];
  predictions_count: number;
}

export async function getProdeDetail(prodeId: string): Promise<AdminProdeDetail | null> {
  const sb = getAdminClient();
  const [{ data: prode }, { data: members }, { data: authUsers }, { data: profiles }, { data: scores }, { count: predsCount }] =
    await Promise.all([
      sb.from("prodes").select("*").eq("id", prodeId).single(),
      sb.from("prode_members").select("user_id, joined_at").eq("prode_id", prodeId),
      sb.auth.admin.listUsers({ perPage: 1000 }),
      sb.from("profiles").select("id, display_name"),
      sb.from("scores").select("user_id, total_points").eq("prode_id", prodeId),
      sb.from("predictions").select("*", { count: "exact", head: true }).eq("prode_id", prodeId),
    ]);

  if (!prode) return null;

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const authMap = new Map((authUsers?.users ?? []).map((u) => [u.id, u]));
  const scoresMap = new Map((scores ?? []).map((s) => [s.user_id, s.total_points]));

  return {
    id: prode.id,
    name: prode.name,
    admin_id: prode.admin_id,
    admin_name: profileMap.get(prode.admin_id)?.display_name ?? "Desconocido",
    invite_code: prode.invite_code,
    prize_description: prode.prize_description ?? null,
    created_at: prode.created_at,
    members_count: members?.length ?? 0,
    predictions_count: predsCount ?? 0,
    members: (members ?? []).map((m) => ({
      user_id: m.user_id,
      display_name: profileMap.get(m.user_id)?.display_name ?? "Sin nombre",
      email: authMap.get(m.user_id)?.email ?? "(sin email)",
      joined_at: m.joined_at,
      total_points: scoresMap.get(m.user_id) ?? 0,
    })).sort((a, b) => b.total_points - a.total_points),
  };
}

export async function deleteProde(prodeId: string) {
  const sb = getAdminClient();
  const { error } = await sb.from("prodes").delete().eq("id", prodeId);
  return { error: error?.message ?? null };
}

// -------------------------------------------------------
// Matches
// -------------------------------------------------------

export interface AdminMatch {
  id: string;
  api_id: string;
  home_team_name: string;
  away_team_name: string;
  phase: string;
  group_name: string | null;
  date: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
  updated_at: string;
  predictions_count: number;
}

export async function getAllMatches(): Promise<AdminMatch[]> {
  const sb = getAdminClient();
  const [{ data: matches }, { data: predCounts }] = await Promise.all([
    sb.from("matches").select("*").order("date", { ascending: true }),
    sb.from("predictions").select("match_id"),
  ]);

  const predCountMap = new Map<string, number>();
  for (const p of predCounts ?? []) {
    predCountMap.set(p.match_id, (predCountMap.get(p.match_id) ?? 0) + 1);
  }

  return (matches ?? []).map((m) => ({
    ...m,
    predictions_count: predCountMap.get(m.id) ?? 0,
  }));
}
