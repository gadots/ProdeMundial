import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

const ADMIN_COOKIE = "admin_session";

function getExpectedToken(): string {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "";
  return Buffer.from(`${username}:${password}`).toString("base64url");
}

export function isAdminAuthenticated(cookieStore: ReadonlyRequestCookies): boolean {
  if (!process.env.ADMIN_PASSWORD) return false;
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  return !!token && token === getExpectedToken();
}

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPass = process.env.ADMIN_PASSWORD ?? "";
  if (!expectedPass) return false;
  return username === expectedUser && password === expectedPass;
}

export function createSessionToken(): string {
  return getExpectedToken();
}

export { ADMIN_COOKIE };
