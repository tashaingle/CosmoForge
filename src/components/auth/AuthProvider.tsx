"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchCloudFleet,
  fetchCloudWallet,
  getDisplayName,
  mergeFleets,
  migrateLocalToCloud,
  pushWalletToCloud,
  setDisplayName,
} from "@/lib/cloud-fleet";
import {
  loadFleet,
  replaceFleet,
  setLocalCommanderName,
  getLocalCommanderName,
} from "@/lib/storage";
import {
  loadWallet,
  mergeWallets,
  replaceWallet,
  type PlayerWallet,
} from "@/lib/economy";

type AuthContextValue = {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  user: User | null;
  displayName: string;
  cloudSyncing: boolean;
  cloudSynced: boolean;
  wallet: PlayerWallet;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  refreshCloudFleet: () => Promise<void>;
  refreshWallet: () => void;
  persistWallet: (w: PlayerWallet) => Promise<void>;
  syncContext: { userId?: string; commanderName?: string };
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [ready, setReady] = useState(!configured);
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayNameState] = useState("Commander");
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [cloudSynced, setCloudSynced] = useState(false);
  const [wallet, setWallet] = useState<PlayerWallet>(() =>
    typeof window !== "undefined" ? loadWallet() : loadWallet()
  );

  const persistWallet = useCallback(
    async (w: PlayerWallet) => {
      replaceWallet(w);
      setWallet({ ...w });
      if (session?.user) {
        await pushWalletToCloud(session.user.id, w);
      }
    },
    [session?.user]
  );

  const refreshWallet = useCallback(() => {
    setWallet(loadWallet());
  }, []);

  const syncFleetForUser = useCallback(async (user: User) => {
    setCloudSyncing(true);
    try {
      const name =
        (await getDisplayName(user.id)) ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        getLocalCommanderName();
      setDisplayNameState(name);
      setLocalCommanderName(name);

      const local = loadFleet().crafts;
      await migrateLocalToCloud(local, user.id, name);
      const cloud = await fetchCloudFleet(user.id);
      const merged = mergeFleets(local, cloud);
      replaceFleet(merged);
      await migrateLocalToCloud(merged, user.id, name);

      // Wallet / cosmetics
      const localW = loadWallet();
      const cloudW = await fetchCloudWallet(user.id);
      const mergedW = mergeWallets(localW, cloudW);
      replaceWallet(mergedW);
      setWallet(mergedW);
      await pushWalletToCloud(user.id, mergedW);

      setCloudSynced(true);
    } catch (e) {
      console.warn("[auth] fleet sync failed", e);
      setCloudSynced(false);
    } finally {
      setCloudSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      setDisplayNameState(getLocalCommanderName());
      setWallet(loadWallet());
      return;
    }
    const sb = getSupabaseBrowser();
    if (!sb) {
      setReady(true);
      return;
    }

    let mounted = true;
    sb.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        void syncFleetForUser(data.session.user).finally(() => {
          if (mounted) setReady(true);
        });
      } else {
        setDisplayNameState(getLocalCommanderName());
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next?.user) {
        void syncFleetForUser(next.user);
      } else {
        setCloudSynced(false);
        setDisplayNameState(getLocalCommanderName());
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [configured, syncFleetForUser]);

  const signInWithEmail = useCallback(async (email: string) => {
    const sb = getSupabaseBrowser();
    if (!sb) return { error: "Cloud auth is not configured." };
    const origin = window.location.origin;
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabaseBrowser();
    if (sb) await sb.auth.signOut();
    setSession(null);
    setCloudSynced(false);
  }, []);

  const updateDisplayName = useCallback(
    async (name: string) => {
      const trimmed = name.trim().slice(0, 40) || "Commander";
      setDisplayNameState(trimmed);
      setLocalCommanderName(trimmed);
      if (session?.user) {
        await setDisplayName(session.user.id, trimmed);
      }
    },
    [session?.user]
  );

  const refreshCloudFleet = useCallback(async () => {
    if (session?.user) await syncFleetForUser(session.user);
  }, [session?.user, syncFleetForUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      configured,
      session,
      user: session?.user ?? null,
      displayName,
      cloudSyncing,
      cloudSynced,
      wallet,
      signInWithEmail,
      signOut,
      updateDisplayName,
      refreshCloudFleet,
      refreshWallet,
      persistWallet,
      syncContext: {
        userId: session?.user?.id,
        commanderName: displayName,
      },
    }),
    [
      ready,
      configured,
      session,
      displayName,
      cloudSyncing,
      cloudSynced,
      wallet,
      signInWithEmail,
      signOut,
      updateDisplayName,
      refreshCloudFleet,
      refreshWallet,
      persistWallet,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
