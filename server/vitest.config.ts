import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Several test files are integration tests that hit a real, shared
    // Postgres database (see tests/*.test.ts using prisma directly) rather
    // than an isolated per-test transaction. Vitest runs different test
    // FILES in parallel by default, which lets one file's fixture
    // creation/cleanup race another's broad "all approved locations" query
    // (searchStorageLocations has no per-test scoping - it deliberately
    // queries the whole table, matching production behavior). Running
    // files sequentially trades a bit of wall-clock time for a suite that
    // doesn't intermittently fail for reasons unrelated to the code being
    // tested. Tests *within* a file still run in their normal order.
    fileParallelism: false,
  },
});
