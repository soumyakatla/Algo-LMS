const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("algolms_token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const authStorage = {
  getToken: () => (typeof window !== "undefined" ? localStorage.getItem("algolms_token") : null),
  setToken: (token: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("algolms_token", token);
    }
  },
  removeToken: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("algolms_token");
    }
  },
};
