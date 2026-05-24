import { create } from "zustand";

export interface LoginHistory { id: number; user_id: number; ip_address: string; user_agent: string; language_code: string; logged_in_at: string; }
export interface LogoutHistory { id: number; user_id: number; ip_address: string; user_agent: string; logged_out_at: string; }
export interface PasswordChange { id: number; user_id: number; changed_at: string; }
export interface PrivacyChange { id: number; user_id: number; privacy_status: string; changed_at: string; }
export interface AccountStatus { id: number; user_id: number; activation_type: string; reason: string; changed_at: string; }
export interface SignupInfo { id: number; user_id: number; username_at_signup: string; email_at_signup: string; signup_ip: string; device_model: string; signed_up_at: string; }

interface SecurityState {
  login_history: LoginHistory[];
  logout_history: LogoutHistory[];
  password_changes: PasswordChange[];
  privacy_changes: PrivacyChange[];
  account_status: AccountStatus[];
  signup_info: SignupInfo | null;
  loading: boolean;
  error: string | null;
  fetchSecurity: (token: string) => Promise<void>;
}

export const useSecurityStore = create<SecurityState>((set) => ({
  login_history: [],
  logout_history: [],
  password_changes: [],
  privacy_changes: [],
  account_status: [],
  signup_info: null,
  loading: false,
  error: null,
  fetchSecurity: async (token) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/v1/security", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to fetch security");
      const data = await res.json();
      set({
        login_history: data.login_history ?? [],
        logout_history: data.logout_history ?? [],
        password_changes: data.password_changes ?? [],
        privacy_changes: data.privacy_changes ?? [],
        account_status: data.account_status ?? [],
        signup_info: data.signup_info ?? null,
        loading: false,
      });
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
    }
  },
}));
