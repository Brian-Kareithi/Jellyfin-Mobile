import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AppState, User } from '../types/jellyfin';

interface AuthStore extends AppState {
  setServerUrl: (url: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  loadStoredData: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  serverUrl: null,
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setServerUrl: (url) => {
    SecureStore.setItemAsync('serverUrl', url);
    set({ serverUrl: url });
  },
  
  setAccessToken: (token) => {
    SecureStore.setItemAsync('accessToken', token);
    set({ accessToken: token, isAuthenticated: true });
  },
  
  setUser: (user) => {
    SecureStore.setItemAsync('user', JSON.stringify(user));
    set({ user });
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('user');
    await SecureStore.deleteItemAsync('serverUrl');
    set({ serverUrl: null, accessToken: null, user: null, isAuthenticated: false });
  },
  
  loadStoredData: async () => {
    const accessToken = await SecureStore.getItemAsync('accessToken');
    const userStr = await SecureStore.getItemAsync('user');
    const serverUrl = await SecureStore.getItemAsync('serverUrl');
    
    if (accessToken && userStr && serverUrl) {
      const user = JSON.parse(userStr);
      set({ accessToken, user, serverUrl, isAuthenticated: true });
    }
  },
}));