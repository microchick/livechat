import { env } from "@/lib/env";

const buildUrl = (path: string) => `${env.apiBaseUrl}${path}`;

type ApiRequestInit = RequestInit & {
  authToken?: string;
  skipAuth?: boolean;
};

function getAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem("chat_access_token") || "";
}

function isFormDataBody(body: BodyInit | null | undefined) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

export async function apiRequest<T>(path: string, init?: ApiRequestInit): Promise<T> {
  const { authToken, skipAuth, ...requestInit } = init ?? {};
  const headers = new Headers(requestInit.headers);

  if (!isFormDataBody(requestInit.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = authToken ?? (skipAuth ? "" : getAccessToken());
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    ...requestInit,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "请求失败");
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, init?: ApiRequestInit) => apiRequest<T>(path, init),
  post: <T>(path: string, body?: unknown, init?: ApiRequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  postForm: <T>(path: string, body: FormData, init?: ApiRequestInit) =>
    apiRequest<T>(path, {
      ...init,
      method: "POST",
      body,
    }),
};
