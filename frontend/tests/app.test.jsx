// frontend/tests/app.test.jsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

// useAuth must be vi.fn() so the second test can call mockReturnValue on it.
vi.mock("../src/auth/useAuth", () => ({
  useAuth: vi.fn(() => ({
    session: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));
vi.mock("../src/auth/supabase", () => ({ supabase: {} }));

import App from "../src/App";

test("renders Login when unauthenticated", () => {
  render(<App />);
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
});

test("shows loading state", async () => {
  const { useAuth } = await import("../src/auth/useAuth");
  useAuth.mockReturnValue({
    session: null,
    loading: true,
    signIn: vi.fn(),
    signOut: vi.fn(),
  });
  render(<App />);
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});
