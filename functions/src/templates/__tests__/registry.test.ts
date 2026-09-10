import { describe, expect, it } from 'vitest';
import { templateRegistry, galleryRegistry } from '../generated/registry';

describe('generated template registry', () => {
  it('has a template-03 entry whose embedded exampleContent parses against its own schema', () => {
    const entry = templateRegistry['template-03-standard-article-toc'];
    expect(entry.hbsSource.length).toBeGreaterThan(100);
    const parsed = entry.schema.parse(entry.exampleContent);
    expect(parsed.title).toContain('AR, VR OR MIXED REALITY');
  });

  it('computes a stable 12-hex-char templateVersion from the embedded .hbs source', () => {
    const entry = templateRegistry['template-03-standard-article-toc'];
    expect(entry.meta.templateVersion).toMatch(/^[0-9a-f]{12}$/);
  });

  it('has a gallery-accordion entry whose embedded exampleContent parses against its own schema', () => {
    const entry = galleryRegistry['gallery-accordion'];
    expect(entry.hbsSource.length).toBeGreaterThan(50);
    const parsed = entry.schema.parse(entry.exampleContent);
    expect(parsed.items).toHaveLength(6);
  });
});
