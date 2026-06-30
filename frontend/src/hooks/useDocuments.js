// frontend/src/hooks/useDocuments.js
// Stub — implemented in Task 5.4.
import { useState } from "react";

export function useDocuments(_token) {
  const [documents] = useState([]);
  const [uploading] = useState(false);

  const uploadFile = async () => {};
  const requestSummary = async () => {};

  return { documents, uploading, uploadFile, requestSummary };
}
