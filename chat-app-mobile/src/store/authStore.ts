import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import apiClient, { TOKEN_KEY } from '../api/client';
import { registerForPushNotifications, unregisterPushNotifications } from '../notifications/push';
import { socketManager } from '../realtime/socket';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  // Absent for an account that verified its email but hasn't claimed a public
  // @handle yet — RootNavigator gates on this to show the onboarding screen.
  uniqueHandle?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  statusMessage?: string;
  emailVerified?: boolean;
  whoCanMessage?: string;
  lastSeenPrivacy?: string;
  onlinePrivacy?: string;
  profilePhotoPrivacy?: string;
  blockedUsers?: string[];
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isBootstrapping: boolean;
  isSigningIn: boolean;
  error: string | null;
  /** Email waiting for OTP verification after registration. */
  pendingVerificationEmail: string | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (
    patch: Partial<Pick<AuthUser, 'displayName' | 'bio' | 'statusMessage' | 'lastSeenPrivacy' | 'onlinePrivacy' | 'profilePhotoPrivacy'>>,
  ) => Promise<void>;
  uploadAvatar: (file: { uri: string; name: string; mimeType: string }) => Promise<void>;
  removeAvatar: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateWhoCanMessage: (value: string) => Promise<void>;
  blockUser: (username: string) => Promise<void>;
  unblockUser: (username: string) => Promise<void>;
  /** Creates a pending account and emails a 6-digit OTP. Does not log in. */
  register: (displayName: string, email: string, password: string) => Promise<void>;
  /** Verifies the OTP, activates the account, and logs in. */
  verifyEmailOtp: (email: string, code: string) => Promise<void>;
  resendVerification: (email: string) => Promise<string>;
  /** Claims (or changes) the public @handle for the current user. */
  claimHandle: (handle: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

function userFromMe(data: any): AuthUser {
  return {
    id: data.id,
    username: data.username,
    email: data.email,
    uniqueHandle: data.uniqueHandle,
    displayName: data.displayName,
    avatarUrl: data.avatarUrl,
    bio: data.bio,
    statusMessage: data.statusMessage,
    emailVerified: data.emailVerified,
    whoCanMessage: data.whoCanMessage,
    lastSeenPrivacy: data.lastSeenPrivacy,
    onlinePrivacy: data.onlinePrivacy,
    profilePhotoPrivacy: data.profilePhotoPrivacy,
    blockedUsers: data.blockedUsers,
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isBootstrapping: true,
  isSigningIn: false,
  error: null,
  pendingVerificationEmail: null,

  bootstrap: async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      set({ isBootstrapping: false });
      return;
    }
    set({ token });
    socketManager.connect(token);
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: userFromMe(data), isBootstrapping: false });
      registerForPushNotifications();
    } catch {
      // Token expired/invalid — drop the stale session and start signed out.
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      socketManager.disconnect();
      set({ token: null, user: null, isBootstrapping: false });
    }
  },

  signIn: async (email, password) => {
    set({ isSigningIn: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/login', { email, password });
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      set({
        token: data.token,
        user: {
          id: data.userId,
          username: data.username,
          email: data.email,
          uniqueHandle: data.uniqueHandle,
        },
        isSigningIn: false,
      });
      socketManager.connect(data.token);
      get().refreshProfile();
      registerForPushNotifications();
    } catch (err: any) {
      const isTimeout = err?.code === 'ECONNABORTED';
      const message = err?.response?.data?.detail
        ?? (isTimeout
          ? 'The server is waking up — please try again in a moment.'
          : 'Could not sign in. Check your connection and try again.');
      set({ isSigningIn: false, error: message });
      throw err;
    }
  },

  signOut: async () => {
    await unregisterPushNotifications();
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    socketManager.disconnect();
    set({ token: null, user: null });
  },

  register: async (displayName, email, password) => {
    set({ isSigningIn: true, error: null });
    try {
      await apiClient.post('/auth/register', { displayName, email, password });
      set({ pendingVerificationEmail: email, isSigningIn: false });
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'Could not create account. Please try again.';
      set({ isSigningIn: false, error: message });
      throw err;
    }
  },

  verifyEmailOtp: async (email, code) => {
    set({ isSigningIn: true, error: null });
    try {
      const { data } = await apiClient.post('/auth/verify-email', { email, code });
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      set({
        token: data.token,
        user: {
          id: data.userId,
          username: data.username,
          email: data.email,
          uniqueHandle: data.uniqueHandle,
        },
        pendingVerificationEmail: null,
        isSigningIn: false,
      });
      socketManager.connect(data.token);
      get().refreshProfile();
      registerForPushNotifications();
    } catch (err: any) {
      const message = err?.response?.data?.detail ?? 'That code is invalid or expired.';
      set({ isSigningIn: false, error: message });
      throw err;
    }
  },

  resendVerification: async (email) => {
    const { data } = await apiClient.post('/auth/resend-verification', { email });
    return data.message as string;
  },

  claimHandle: async (handle) => {
    const { data } = await apiClient.post('/users/me/handle', { handle });
    set({ user: userFromMe(data) });
  },

  forgotPassword: async (email) => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  clearError: () => set({ error: null }),

  refreshProfile: async () => {
    try {
      const { data } = await apiClient.get('/auth/me');
      set({ user: userFromMe(data) });
    } catch {
      // Non-fatal — keep the minimal user info already set from login.
    }
  },

  updateProfile: async (patch) => {
    const { data } = await apiClient.patch('/users/me', patch);
    set({ user: userFromMe(data) });
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    const { data } = await apiClient.post('/users/me/avatar', formData);
    set({ user: userFromMe(data) });
  },

  removeAvatar: async () => {
    const { data } = await apiClient.delete('/users/me/avatar');
    set({ user: userFromMe(data) });
  },

  changePassword: async (currentPassword, newPassword) => {
    await apiClient.put('/users/me/password', { currentPassword, newPassword });
  },

  updateWhoCanMessage: async (value) => {
    await apiClient.patch('/users/me/privacy', { whoCanMessage: value });
    set((state) => (state.user ? { user: { ...state.user, whoCanMessage: value } } : state));
  },

  blockUser: async (username) => {
    await apiClient.post(`/users/${username}/block`);
    set((state) =>
      state.user ? { user: { ...state.user, blockedUsers: [...(state.user.blockedUsers ?? []), username] } } : state,
    );
  },

  unblockUser: async (username) => {
    await apiClient.delete(`/users/${username}/block`);
    set((state) =>
      state.user ? { user: { ...state.user, blockedUsers: (state.user.blockedUsers ?? []).filter((u) => u !== username) } } : state,
    );
  },
}));
