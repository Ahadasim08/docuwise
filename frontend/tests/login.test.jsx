// frontend/tests/login.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import Login from "../src/auth/Login";

test("renders email and password fields", () => {
  render(<Login onSignIn={vi.fn()} />);
  expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
});

test("calls onSignIn with email and password on submit", async () => {
  const onSignIn = vi.fn().mockResolvedValue({});
  render(<Login onSignIn={onSignIn} />);
  fireEvent.change(screen.getByPlaceholderText(/email/i), {
    target: { value: "a@b.com" },
  });
  fireEvent.change(screen.getByPlaceholderText(/password/i), {
    target: { value: "pass" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(onSignIn).toHaveBeenCalledWith("a@b.com", "pass");
});
