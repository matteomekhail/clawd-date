// Runs before any test module is imported. Used to prime env vars that
// Convex modules read at evaluation time (e.g. CLAWD_AUTH_SECRET in
// convex/auth.ts).
import { TEST_AUTH_SECRET } from "./test/convex/test-helpers";
process.env.CLAWD_AUTH_SECRET = TEST_AUTH_SECRET;
