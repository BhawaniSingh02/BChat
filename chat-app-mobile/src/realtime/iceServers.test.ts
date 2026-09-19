import apiClient from '../api/client';
import { getIceServers, resetIceServerCache } from './iceServers';

jest.mock('../api/client', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const mockGet = apiClient.get as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  resetIceServerCache();
});

describe('getIceServers', () => {
  it('returns the backend-provided list (STUN + TURN with credentials)', async () => {
    const fromBackend = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:relay.example.com:443', username: 'u', credential: 'c' },
    ];
    mockGet.mockResolvedValue({ data: fromBackend });

    await expect(getIceServers()).resolves.toEqual(fromBackend);
    expect(mockGet).toHaveBeenCalledWith('/webrtc/ice-servers');
  });

  it('caches the result — only one network request per app session', async () => {
    mockGet.mockResolvedValue({ data: [{ urls: 'stun:a' }] });

    await getIceServers();
    await getIceServers();
    await getIceServers();

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('falls back to STUN-only when the backend is unreachable', async () => {
    mockGet.mockRejectedValue(new Error('network down'));

    const servers = await getIceServers();

    expect(servers.length).toBeGreaterThan(0);
    expect(servers.every((s) => s.urls.startsWith('stun:'))).toBe(true);
  });

  it('falls back to STUN-only when the backend returns an empty list', async () => {
    mockGet.mockResolvedValue({ data: [] });

    const servers = await getIceServers();

    expect(servers.every((s) => s.urls.startsWith('stun:'))).toBe(true);
  });

  it('does not cache a failed fetch — retries on the next call', async () => {
    mockGet.mockRejectedValueOnce(new Error('cold start timeout'));
    await getIceServers();

    const fromBackend = [{ urls: 'turn:relay.example.com:443', username: 'u', credential: 'c' }];
    mockGet.mockResolvedValue({ data: fromBackend });

    await expect(getIceServers()).resolves.toEqual(fromBackend);
    expect(mockGet).toHaveBeenCalledTimes(2);
  });
});
