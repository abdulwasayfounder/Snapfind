import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { UserProfile, UserEntitlement } from "../types";
import { loadUserProfile, saveUserProfile } from "../services/storage.ts";
import { StorageManager } from "../services/storage/StorageManager";
import { SyncEngine } from "../services/syncEngine";
import { SubscriptionManager } from "../services/billing/SubscriptionManager";
import { NotificationService } from "../services/notificationService";

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  entitlement: UserEntitlement;
  isPro: boolean;
  loading: boolean;
  isConfigured: boolean;
  isRecoveryMode: boolean;
  setIsRecoveryMode: (val: boolean) => void;
  refreshEntitlement: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (email: string, pass: string, name?: string) => Promise<{ error?: string }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<{ error?: string }>;
  reauthenticate: (password: string) => Promise<{ error?: string }>;
  updateName: (newName: string) => Promise<{ error?: string }>;
  updateProfilePicture: (avatarUrl: string) => Promise<{ error?: string }>;
  changeEmail: (newEmail: string, currentPassword?: string) => Promise<{ error?: string; requiresVerification?: boolean }>;
  changePassword: (newPass: string, currentPassword?: string) => Promise<{ error?: string }>;
  resetPassword: (email?: string) => Promise<{ error?: string }>;
  deleteAccount: (currentPassword?: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserProfile | null>(() => loadUserProfile());
  const [entitlement, setEntitlement] = useState<UserEntitlement>(() => SubscriptionManager.getEntitlement());
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Subscribe to SubscriptionManager real-time entitlement changes
  useEffect(() => {
    const unsub = SubscriptionManager.subscribe((newEntitlement) => {
      setEntitlement(newEntitlement);
      setUser((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          plan: newEntitlement.tier,
          storageLimitMB: newEntitlement.isPro ? 10000 : 500,
          entitlement: newEntitlement,
        };
        saveUserProfile(updated);
        return updated;
      });
    });
    return unsub;
  }, []);

  const refreshEntitlement = async () => {
    const userId = supabaseUser?.id || user?.id || "guest";
    const ent = await SubscriptionManager.syncEntitlementsFromServer(userId);
    setEntitlement(ent);
  };


  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Fallback local mode session management
      setLoading(false);
      return;
    }

    // 1. Callback Handler: Exchange OAuth code for session when returning from provider
    const processAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const hash = window.location.hash;

      if (code) {
        console.log("[AuthContext] Exchanging OAuth code for session via exchangeCodeForSession...");
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("[AuthContext] Code exchange error:", error.message);
          } else if (data?.session) {
            console.log("[AuthContext] Session created for user:", data.session.user.email);
            setSession(data.session);
            setSupabaseUser(data.session.user);
            syncProfile(data.session.user);
            SyncEngine.setCurrentUserId(data.session.user.id);

            // If running inside a popup window, notify parent opener and close self
            if (window.opener && window.opener !== window) {
              try {
                window.opener.postMessage(
                  { type: "OAUTH_AUTH_SUCCESS", session: data.session },
                  "*"
                );
              } catch (e) {
                console.warn("[AuthContext] Failed to postMessage to popup opener:", e);
              }
              window.close();
              return;
            }
          }
        } catch (err) {
          console.error("[AuthContext] Exception during code exchange:", err);
        } finally {
          // Clean up URL query param so code is not reused
          const cleanPath = window.location.pathname === "/auth/callback" ? "/" : window.location.pathname;
          window.history.replaceState({}, document.title, cleanPath);
        }
      } else if (hash && hash.includes("access_token")) {
        // Handle hash fragment authentication
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          setSupabaseUser(data.session.user);
          syncProfile(data.session.user);
          SyncEngine.setCurrentUserId(data.session.user.id);

          if (window.opener && window.opener !== window) {
            try {
              window.opener.postMessage(
                { type: "OAUTH_AUTH_SUCCESS", session: data.session },
                "*"
              );
            } catch (e) {
              console.warn("[AuthContext] Failed to postMessage to popup opener:", e);
            }
            window.close();
            return;
          }
        }
        const cleanPath = window.location.pathname === "/auth/callback" ? "/" : window.location.pathname;
        window.history.replaceState({}, document.title, cleanPath);
      }
    };

    processAuthCallback();

    // 2. Fetch current active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        syncProfile(session.user);
        SyncEngine.setCurrentUserId(session.user.id);
      } else {
        SyncEngine.setCurrentUserId("guest");
      }
      setLoading(false);
    });

    // 3. Listen to persistent Auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[AuthContext] onAuthStateChange event: ${_event}`);
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (_event === "PASSWORD_RECOVERY") {
        setIsRecoveryMode(true);
      }
      if (session?.user) {
        syncProfile(session.user);
        SyncEngine.setCurrentUserId(session.user.id);
      } else if (_event === "SIGNED_OUT") {
        // Logged out
        SyncEngine.setCurrentUserId("guest");
        const guestUser = loadUserProfile();
        const loggedOutUser = { ...guestUser, isLoggedIn: false };
        setUser(loggedOutUser);
        saveUserProfile(loggedOutUser);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = async (sbUser: User) => {
    const name =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      sbUser.email?.split("@")[0] ||
      "User";
    const avatarUrl =
      sbUser.user_metadata?.avatar_url ||
      sbUser.user_metadata?.picture ||
      undefined;

    // Fetch authoritative server-verified entitlement
    const userEntitlement = await SubscriptionManager.syncEntitlementsFromServer(sbUser.id);

    const updatedProfile: UserProfile = {
      id: sbUser.id,
      name,
      email: sbUser.email || "",
      avatarUrl,
      isLoggedIn: true,
      plan: userEntitlement.tier,
      storageLimitMB: (userEntitlement.isPro || userEntitlement.isFounder) ? 10000 : 500,
      createdAt: sbUser.created_at,
      emailConfirmedAt: sbUser.email_confirmed_at,
      provider: sbUser.app_metadata?.provider || "email",
      entitlement: userEntitlement,
    };
    setUser(updatedProfile);
    saveUserProfile(updatedProfile);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim();
    if (!isSupabaseConfigured) {
      // Demo authentication simulation with server-authoritative entitlement
      const localId = `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const currentEnt = await SubscriptionManager.syncEntitlementsFromServer(localId);
      const mockUser: UserProfile = {
        id: localId,
        name: cleanEmail.split("@")[0],
        email: cleanEmail,
        isLoggedIn: true,
        plan: currentEnt.tier,
        storageLimitMB: (currentEnt.isPro || currentEnt.isFounder) ? 10000 : 500,
        createdAt: new Date().toISOString(),
        provider: "email",
        entitlement: currentEnt,
      };
      setUser(mockUser);
      saveUserProfile(mockUser);
      SyncEngine.setCurrentUserId(mockUser.id);
      NotificationService.notifyNewLogin({ email: cleanEmail, platform: "Email / Web" });
      return {};
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });
    if (error) {
      console.error("[AuthContext] signInWithPassword error:", error.message);
      return { error: error.message };
    }
    if (data?.session?.user) {
      syncProfile(data.session.user);
      SyncEngine.setCurrentUserId(data.session.user.id);
      NotificationService.notifyNewLogin({ email: cleanEmail, platform: "Email / Web" });
    }
    return {};
  };

  const signUpWithEmail = async (email: string, pass: string, name?: string) => {
    const cleanEmail = email.trim();
    if (!isSupabaseConfigured) {
      const localId = `user_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const currentEnt = await SubscriptionManager.syncEntitlementsFromServer(localId);
      const mockUser: UserProfile = {
        id: localId,
        name: name || cleanEmail.split("@")[0],
        email: cleanEmail,
        isLoggedIn: true,
        plan: currentEnt.tier,
        storageLimitMB: (currentEnt.isPro || currentEnt.isFounder) ? 10000 : 500,
        createdAt: new Date().toISOString(),
        provider: "email",
        entitlement: currentEnt,
      };
      setUser(mockUser);
      saveUserProfile(mockUser);
      SyncEngine.setCurrentUserId(mockUser.id);
      return {};
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          full_name: name || cleanEmail.split("@")[0],
        },
      },
    });
    if (error) return { error: error.message };

    if (data?.user && !data?.session) {
      return {
        error: "Registration successful! Please check your email to confirm your account before logging in.",
      };
    }

    if (data?.session?.user) {
      syncProfile(data.session.user);
      SyncEngine.setCurrentUserId(data.session.user.id);
    }

    return {};
  };

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) {
      const googleUser: UserProfile = {
        id: `google_${Date.now()}`,
        name: "Google Account User",
        email: "user.google@gmail.com",
        avatarUrl: undefined,
        isLoggedIn: true,
        plan: "Pro",
        storageLimitMB: 5000,
        createdAt: new Date().toISOString(),
        provider: "google",
      };
      setUser(googleUser);
      saveUserProfile(googleUser);
      SyncEngine.setCurrentUserId(googleUser.id);
      return {};
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin + "/",
        },
      });

      if (error) {
        console.error("[AuthContext] Supabase Google OAuth error:", error.message);
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error("[AuthContext] Supabase Google Auth exception:", err);
      return { error: err?.message || "Google authentication failed" };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    SubscriptionManager.resetToFree();
    SyncEngine.setCurrentUserId("guest");
    const current = loadUserProfile();
    const loggedOutUser = { ...current, isLoggedIn: false };
    setUser(loggedOutUser);
    saveUserProfile(loggedOutUser);
  };

  const signOutAllDevices = async (): Promise<{ error?: string }> => {
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) {
          console.error("[AuthContext] Sign out global error:", error.message);
          return { error: error.message };
        }
      }
      SubscriptionManager.resetToFree();
      SyncEngine.setCurrentUserId("guest");
      const current = loadUserProfile();
      const loggedOutUser = { ...current, isLoggedIn: false };
      setUser(loggedOutUser);
      saveUserProfile(loggedOutUser);
      return {};
    } catch (err: any) {
      return { error: err?.message || "Failed to sign out from all devices" };
    }
  };

  // Re-authentication helper for sensitive operations
  const reauthenticate = async (password: string): Promise<{ error?: string }> => {
    if (!isSupabaseConfigured) return {};
    const email = supabaseUser?.email || user?.email;
    if (!email) return { error: "No active user email found" };
    if (!password) return { error: "Current password is required for verification" };

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { error: "Current password verification failed: " + error.message };
    }
    return {};
  };

  const updateName = async (newName: string): Promise<{ error?: string }> => {
    const cleanName = newName.trim();
    if (!cleanName) return { error: "Name cannot be empty" };

    if (isSupabaseConfigured && supabaseUser) {
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: cleanName },
      });
      if (error) return { error: error.message };

      try {
        await supabase.from("profiles").upsert({
          id: supabaseUser.id,
          name: cleanName,
          email: supabaseUser.email,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[AuthContext] Profile update error:", e);
      }

      if (data?.user) {
        syncProfile(data.user);
      }
    }

    if (user) {
      const updated = { ...user, name: cleanName };
      setUser(updated);
      saveUserProfile(updated);
    }
    NotificationService.notifyProfileUpdated("Updated account display name");
    return {};
  };

  const updateProfilePicture = async (avatarUrl: string): Promise<{ error?: string }> => {
    const cleanAvatar = avatarUrl.trim();
    if (isSupabaseConfigured && supabaseUser) {
      const { data, error } = await supabase.auth.updateUser({
        data: { avatar_url: cleanAvatar, picture: cleanAvatar },
      });
      if (error) return { error: error.message };

      try {
        await supabase.from("profiles").upsert({
          id: supabaseUser.id,
          avatar_url: cleanAvatar,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[AuthContext] Profile avatar update error:", e);
      }

      if (data?.user) {
        syncProfile(data.user);
      }
    }

    if (user) {
      const updated = { ...user, avatarUrl: cleanAvatar };
      setUser(updated);
      saveUserProfile(updated);
    }
    NotificationService.notifyProfileUpdated("Updated profile photo avatar");
    return {};
  };

  const changeEmail = async (
    newEmail: string,
    currentPassword?: string
  ): Promise<{ error?: string; requiresVerification?: boolean }> => {
    const cleanEmail = newEmail.trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { error: "Please enter a valid email address." };
    }

    if (currentPassword && isSupabaseConfigured) {
      const reauthRes = await reauthenticate(currentPassword);
      if (reauthRes.error) return reauthRes;
    }

    if (isSupabaseConfigured && supabaseUser) {
      const { error } = await supabase.auth.updateUser(
        { email: cleanEmail },
        { emailRedirectTo: `${window.location.origin}/` }
      );
      if (error) return { error: error.message };

      try {
        await supabase.from("profiles").upsert({
          id: supabaseUser.id,
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn("[AuthContext] Profile email sync error:", e);
      }

      return { requiresVerification: true };
    }

    if (user) {
      const oldEmail = user.email;
      const updated = { ...user, email: cleanEmail };
      setUser(updated);
      saveUserProfile(updated);
      NotificationService.notifyEmailChanged(cleanEmail, oldEmail);
    }
    return { requiresVerification: false };
  };

  const changePassword = async (
    newPass: string,
    currentPassword?: string
  ): Promise<{ error?: string }> => {
    if (!newPass || newPass.length < 6) {
      return { error: "Password must be at least 6 characters long." };
    }

    if (currentPassword && isSupabaseConfigured) {
      const reauthRes = await reauthenticate(currentPassword);
      if (reauthRes.error) return reauthRes;
    }

    const targetEmail = user?.email || supabaseUser?.email;

    if (!isSupabaseConfigured) {
      NotificationService.notifyPasswordChanged(targetEmail);
      return {};
    }

    if (!session) {
      return { error: "You must have an active logged-in session to change your password." };
    }

    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) return { error: error.message };
    NotificationService.notifyPasswordChanged(targetEmail);
    return {};
  };

  const resetPassword = async (emailToUse?: string): Promise<{ error?: string }> => {
    const targetEmail = (emailToUse || user?.email || supabaseUser?.email || "").trim();
    if (!targetEmail) {
      return { error: "Email address is required to send password reset link." };
    }

    NotificationService.notifyAccountRecovery(targetEmail);

    if (!isSupabaseConfigured) {
      return {};
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) return { error: error.message };
    return {};
  };

  const deleteAccount = async (currentPassword?: string): Promise<{ error?: string }> => {
    try {
      if (currentPassword && isSupabaseConfigured) {
        const reauthRes = await reauthenticate(currentPassword);
        if (reauthRes.error) return reauthRes;
      }

      if (isSupabaseConfigured && supabaseUser) {
        const uid = supabaseUser.id;
        await supabase.from("screenshots").delete().eq("user_id", uid);
        await supabase.from("search_history").delete().eq("user_id", uid);
        await supabase.from("settings").delete().eq("user_id", uid);
        await supabase.from("profiles").delete().eq("id", uid);
        await supabase.auth.signOut();
      }

      const provider = StorageManager.getProvider();
      await provider.clearAllData();
      localStorage.clear();

      const loggedOutUser: UserProfile = {
        id: "guest",
        name: "Guest User",
        email: "guest@snapfind.ai",
        isLoggedIn: false,
        plan: "Free",
        storageLimitMB: 500,
      };
      setUser(loggedOutUser);
      saveUserProfile(loggedOutUser);

      SyncEngine.setCurrentUserId("guest");

      return {};
    } catch (err: any) {
      console.error("[AuthContext] Delete account error:", err);
      return { error: err?.message || "Failed to delete account" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        entitlement,
        isPro: Boolean(entitlement?.isPro),
        loading,
        isConfigured: isSupabaseConfigured,
        isRecoveryMode,
        setIsRecoveryMode,
        refreshEntitlement,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        signOutAllDevices,
        reauthenticate,
        updateName,
        updateProfilePicture,
        changeEmail,
        changePassword,
        resetPassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

