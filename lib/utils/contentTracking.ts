/**
 * Detects if a document has been manually edited by comparing timestamps
 *
 * The autosave system triggers 2 seconds after changes. If updated_at is
 * significantly after created_at (>5 seconds), we assume the user made manual edits.
 */
export function hasManualEdits(document: {
  created_at: string;
  updated_at: string;
}): boolean {
  const created = new Date(document.created_at);
  const updated = new Date(document.updated_at);

  // If updated_at is more than 5 seconds after created_at, assume manual edits
  const diffMs = updated.getTime() - created.getTime();
  return diffMs > 5000;
}

/**
 * Checks if sufficient time has passed since document creation
 * to warrant edit protection
 */
export function shouldProtectEdits(document: {
  created_at: string;
  updated_at: string;
}): boolean {
  // Only protect if document has been edited
  return hasManualEdits(document);
}
