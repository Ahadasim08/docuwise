import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import UserMessage from "../src/components/UserMessage";
import AssistantMessage from "../src/components/AssistantMessage";
import CitationChip from "../src/components/CitationChip";
import ChatInput from "../src/components/ChatInput";

test("UserMessage renders content", () => {
  render(<UserMessage content="What is the revenue?" />);
  expect(screen.getByText("What is the revenue?")).toBeInTheDocument();
});

test("AssistantMessage renders content", () => {
  render(<AssistantMessage content="Revenue was $5M." citations={[]} docMap={{}} />);
  expect(screen.getByText("Revenue was $5M.")).toBeInTheDocument();
});

test("AssistantMessage renders citation chips", () => {
  const citations = [{ document_id: "d1", page_number: 3, section: null }];
  const docMap = { d1: "report.pdf" };
  render(<AssistantMessage content="See source." citations={citations} docMap={docMap} />);
  expect(screen.getByText(/report\.pdf/i)).toBeInTheDocument();
});

test("CitationChip shows filename and page", () => {
  render(<CitationChip citation={{ document_id: "d1", page_number: 5, section: null }} filename="data.pdf" />);
  expect(screen.getByText(/data\.pdf.*p\.5/i)).toBeInTheDocument();
});

test("ChatInput calls onSend on Enter", () => {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} disabled={false} />);
  const textarea = screen.getByPlaceholderText(/ask anything/i);
  fireEvent.change(textarea, { target: { value: "What is revenue?" } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
  expect(onSend).toHaveBeenCalledWith("What is revenue?");
});

test("ChatInput does not send on Shift+Enter", () => {
  const onSend = vi.fn();
  render(<ChatInput onSend={onSend} disabled={false} />);
  const textarea = screen.getByPlaceholderText(/ask anything/i);
  fireEvent.change(textarea, { target: { value: "draft" } });
  fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
  expect(onSend).not.toHaveBeenCalled();
});
