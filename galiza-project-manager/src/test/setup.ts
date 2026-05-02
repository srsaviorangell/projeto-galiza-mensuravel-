import "@testing-library/jest-dom";
import { vi } from 'vitest';

// Mock global do Supabase para todos os testes
vi.mock('../lib/supabase', async () => {
  const actual = await vi.importActual('../lib/supabase');
  return {
    ...actual,
    supabase: {
      auth: {
        signInWithPassword: vi.fn(),
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn(() => ({
          data: {
            subscription: { unsubscribe: vi.fn() }
          }
        })),
        getUser: vi.fn(),
        signUp: vi.fn(),
        updateUser: vi.fn(),
        signOut: vi.fn()
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(),
            then: vi.fn()
          })),
          single: vi.fn()
        })),
        insert: vi.fn(() => ({
          select: vi.fn()
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn()
          }))
        })),
        delete: vi.fn(() => ({
          eq: vi.fn()
        }))
      })),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn()
        }))
      }
    }
  };
});

// Mock de localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock de geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn()
  },
  writable: true
});

// Mock de matchMedia para testes com breakpoints CSS
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});
