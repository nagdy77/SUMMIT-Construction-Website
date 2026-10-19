/**
 * Set one genuine ISO 8601 expiration timestamp when the review period is agreed.
 * Keeping this null displays the duration label without inventing a deadline.
 * Expiration is informational and never blocks access to the preview.
 */
export const PREVIEW_EXPIRES_AT: string | null = null

export const PREVIEW_DISCLAIMER =
  'This is a design preview, not the official live SUMMIT Construction website. Content, visuals, and functionality are subject to review and approval.'
