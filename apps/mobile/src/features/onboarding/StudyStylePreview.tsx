import { DesignPreview } from './DesignPreview';

/** Development-only visual harness for D to mount in the shell.
 * Shows callback values; intentionally does not claim to persist preferences. */
export function StudyStylePreview() {
  return <DesignPreview screen="study-style" />;
}
