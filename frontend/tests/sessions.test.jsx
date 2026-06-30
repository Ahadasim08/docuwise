// frontend/tests/sessions.test.jsx
import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import SessionList from "../src/components/SessionList";

const sessions = [
  { id: "s1", title: "Report Analysis", created_at: "2026-06-30" },
  { id: "s2", title: "Data Review", created_at: "2026-06-30" },
];

test("renders session titles", () => {
  render(<SessionList sessions={sessions} currentId="s1" onSelect={() => {}} onNew={() => {}} />);
  expect(screen.getByText("Report Analysis")).toBeInTheDocument();
  expect(screen.getByText("Data Review")).toBeInTheDocument();
});

test("calls onSelect with session id on click", () => {
  const onSelect = vi.fn();
  render(<SessionList sessions={sessions} currentId="s1" onSelect={onSelect} onNew={() => {}} />);
  fireEvent.click(screen.getByText("Data Review"));
  expect(onSelect).toHaveBeenCalledWith("s2");
});

test("calls onNew when new session clicked", () => {
  const onNew = vi.fn();
  render(<SessionList sessions={[]} currentId={null} onSelect={() => {}} onNew={onNew} />);
  fireEvent.click(screen.getByText(/new session/i));
  expect(onNew).toHaveBeenCalled();
});
