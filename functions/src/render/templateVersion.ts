import { createHash } from 'node:crypto';

/** sha256 of the annotated template's source, first 12 hex chars. */
export function computeTemplateVersion(hbsSource: string): string {
  return createHash('sha256').update(hbsSource).digest('hex').slice(0, 12);
}
