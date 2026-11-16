const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "student" | "instructor" | "admin";
  institution_id?: string;
  department?: string;
  avatar_url?: string;
  is_verified?: boolean;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      access: string;
      refresh: string;
    };
  };
  error?: {
    code: string;
    message: string;
    details: any[];
  };
}

export const authStorage = {
  getTokens: () => {
    if (typeof window === "undefined") return null;
    const access = localStorage.getItem("arx_access_token");
    const refresh = localStorage.getItem("arx_refresh_token");
    return access && refresh ? { access, refresh } : null;
  },
  getUser: (): User | null => {
    if (typeof window === "undefined") return null;
    const userStr = localStorage.getItem("arx_user");
    return userStr ? JSON.parse(userStr) : null;
  },
  saveSession: (user: User, tokens: { access: string; refresh: string }) => {
    localStorage.setItem("arx_access_token", tokens.access);
    localStorage.setItem("arx_refresh_token", tokens.refresh);
    localStorage.setItem("arx_user", JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem("arx_access_token");
    localStorage.removeItem("arx_refresh_token");
    localStorage.removeItem("arx_user");
  },
};

export async function loginUser(email: string, password: string, expected_role?: string): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, expected_role }),
    });
  } catch {
    throw new Error("Unable to connect to backend server. Please make sure the Django backend is running at http://127.0.0.1:8000.");
  }

  const data = await res.json();
  if (!res.ok) {
    const errorDetail = data.error?.details?.[0]?.message || data.error?.message || data.detail || "Authentication failed.";
    throw new Error(errorDetail);
  }
  return data;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  institution_id?: string;
  department?: string;
  role?: "student" | "instructor";
}): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("Unable to connect to backend server. Please make sure the Django backend is running at http://127.0.0.1:8000.");
  }

  const data = await res.json();
  if (!res.ok) {
    const errorDetail = data.error?.details?.[0]?.message || data.error?.message || data.detail || "Registration failed.";
    throw new Error(errorDetail);
  }
  return data;
}

export const registerStudent = registerUser;
