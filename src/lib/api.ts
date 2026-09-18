const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8788';

export interface LiveOffer {
  network: string;
  externalOfferId: string;
  title: string;
  description: string;
  rewardCents: number;
  estimatedMinutes: number | null;
  category: string;
  clickUrl: string;
}

export interface RankedOffer extends LiveOffer {
  matchScore: number;
  reason: string;
}

export interface EarningsEntry {
  id: string;
  network: string;
  offerId: string;
  rewardCents: number;
  status: 'pending' | 'confirmed' | 'reversed';
  createdAt: string;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export function identifyUser(email: string) {
  return http<{ id: string; email: string }>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export function getLiveOpportunities(userId: string) {
  return http<{ offers: LiveOffer[]; networksConfigured: boolean }>(`/api/opportunities/${userId}`);
}

export function getRankedOpportunities(userId: string, interests: string[]) {
  return http<{ ranked: RankedOffer[] }>(`/api/opportunities/${userId}/rank`, {
    method: 'POST',
    body: JSON.stringify({ interests }),
  });
}

export function getEarnings(userId: string) {
  return http<{ totalCents: number; entries: EarningsEntry[] }>(`/api/earnings/${userId}`);
}

export function requestPayout(userId: string, amountCents: number) {
  return http<{ id: string; status: string; amountCents: number }>(`/api/payouts/${userId}`, {
    method: 'POST',
    body: JSON.stringify({ amountCents }),
  });
}

export interface SettingStatus {
  key: string;
  configured: boolean;
  source: 'settings' | 'env' | 'none';
  masked: string;
  updatedAt: string | null;
}

export function getAdminSettings(adminToken: string) {
  return http<{ settings: SettingStatus[] }>('/api/admin/settings', {
    headers: { 'x-admin-token': adminToken },
  });
}

export function setAdminSetting(adminToken: string, key: string, value: string) {
  return http<{ ok: true }>(`/api/admin/settings/${key}`, {
    method: 'PUT',
    headers: { 'x-admin-token': adminToken },
    body: JSON.stringify({ value }),
  });
}
