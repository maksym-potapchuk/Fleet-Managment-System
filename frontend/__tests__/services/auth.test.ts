/**
 * authService tests
 *
 * WHY: auth functions must send correct payloads and call the right endpoints.
 * A bug here silently breaks login/logout for all users.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginRequest, logoutRequest, getMeRequest } from '@/services/auth';
import api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── loginRequest ────────────────────────────────────────────────────────────

describe('loginRequest', () => {
  it('POSTs email, password and remember_me to /auth/login/', async () => {
    mockedApi.post.mockResolvedValue({ data: {} });

    await loginRequest('user@example.com', 'pass123');

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login/', {
      email: 'user@example.com',
      password: 'pass123',
      remember_me: false,
    });
  });

  it('passes remember_me=true when specified', async () => {
    mockedApi.post.mockResolvedValue({ data: {} });

    await loginRequest('user@example.com', 'pass123', true);

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/login/', {
      email: 'user@example.com',
      password: 'pass123',
      remember_me: true,
    });
  });
});

// ─── logoutRequest ───────────────────────────────────────────────────────────

describe('logoutRequest', () => {
  it('POSTs to /auth/logout/', async () => {
    mockedApi.post.mockResolvedValue({ data: {} });

    await logoutRequest();

    expect(mockedApi.post).toHaveBeenCalledWith('/auth/logout/');
  });
});

// ─── getMeRequest ────────────────────────────────────────────────────────────

describe('getMeRequest', () => {
  it('calls GET /auth/me/ and returns user data', async () => {
    const user = { id: 1, email: 'user@example.com' };
    mockedApi.get.mockResolvedValue({ data: user });

    const result = await getMeRequest();

    expect(mockedApi.get).toHaveBeenCalledWith('/auth/me/');
    expect(result.data).toEqual(user);
  });
});
