// Registers @testing-library/jest-dom matchers (toBeInTheDocument, etc.) for
// jsdom specs. Harmless for Node-environment specs — it only augments expect.
import '@testing-library/jest-dom/vitest';
