import { QueryClient, QueryFunction } from "@tanstack/react-query";

export function getApiUrl(): string {
  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const port = window.location.port;

    // Local dev: Expo web runs on 8081/19006, API on 5000
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      if (port !== "5000") {
        return `${protocol}//${hostname}:5000`;
      }
    }

    // Production: Express serves both static files and API on the same port
    return window.location.origin;
  }

  // For native apps, use the environment variable
  const host = process.env.EXPO_PUBLIC_API_URL;

  if (!host) {
    throw new Error("EXPO_PUBLIC_API_URL is not set");
  }

  return host;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      staleTime: 30 * 1000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
