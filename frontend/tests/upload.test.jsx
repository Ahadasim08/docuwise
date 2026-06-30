import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import DocumentPanel from "../src/components/DocumentPanel";

test("renders upload dropzone", () => {
  render(<DocumentPanel documents={[]} uploading={false} onUpload={vi.fn()} onRequestSummary={vi.fn()} />);
  expect(screen.getByText(/drop file or click/i)).toBeInTheDocument();
});

test("rejects unsupported file type", () => {
  const onUpload = vi.fn();
  render(<DocumentPanel documents={[]} uploading={false} onUpload={onUpload} onRequestSummary={vi.fn()} />);
  const input = screen.getByTestId("file-input");
  const file = new File(["content"], "test.txt", { type: "text/plain" });
  fireEvent.change(input, { target: { files: [file] } });
  expect(onUpload).not.toHaveBeenCalled();
  expect(screen.getByText(/not supported/i)).toBeInTheDocument();
});

test("calls onUpload for valid file", () => {
  const onUpload = vi.fn();
  render(<DocumentPanel documents={[]} uploading={false} onUpload={onUpload} onRequestSummary={vi.fn()} />);
  const input = screen.getByTestId("file-input");
  const file = new File(["content"], "report.pdf", { type: "application/pdf" });
  fireEvent.change(input, { target: { files: [file] } });
  expect(onUpload).toHaveBeenCalledWith(file);
});

test("shows document in list", () => {
  const docs = [{ id: "d1", filename: "report.pdf", status: "ready" }];
  render(<DocumentPanel documents={docs} uploading={false} onUpload={vi.fn()} onRequestSummary={vi.fn()} />);
  expect(screen.getByText("report.pdf")).toBeInTheDocument();
});
