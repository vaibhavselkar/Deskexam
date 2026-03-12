import { createContext, useContext, useEffect, useState } from 'react';
import { getProfile, signOut as apiSignOut } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);     // { id, email, fullName, ... }
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    const token = localStorage.getItem('ss_token');
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await getProfile();
    if (error || !data) {
      // Token invalid/expired
      localStorage.removeItem('ss_token');
      setUser(null);
      setProfile(null);
    } else {
      // Normalize MongoDB field names to what the frontend expects
      const normalized = normalizeUser(data);
      setUser(normalized);
      setProfile(normalized);
      console.log('User data loaded:', normalized);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshProfile = () => fetchProfile();

  const signOut = () => {
    apiSignOut();
    setUser(null);
    setProfile(null);
  };

  const canDownload = () => {
    if (!profile) return false;
    if (['monthly', 'yearly'].includes(profile.subscription_status)) {
      return new Date(profile.subscription_end) > new Date();
    }
    return profile.credits > 0;
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut, canDownload }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// ─── Helpers ─────────────────────────────────────────────────────────────────
// MongoDB model uses camelCase; legacy frontend code expects snake_case fields.
function normalizeUser(u) {
  return {
    ...u,
    id: u._id || u.id,
    full_name: u.fullName || u.full_name,
    subscription_status: u.subscriptionStatus || u.subscription_status || 'free',
    subscription_end: u.subscriptionEnd ?? u.subscription_end ?? null,
    total_papers_created: u.totalPapersCreated ?? u.total_papers_created ?? 0,
    institute_name: u.instituteName || u.institute_name || '',
    credits: u.credits ?? 3,
  };
}
