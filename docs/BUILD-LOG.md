# November 25, 2026 · Plant Health Journal

**Question.** Help a grower see how conditions and care change over a plant's lifetime.

**Source and change.** potify-plant-health at `360fc24d570212c2c6f07c9c6cdbd73cef162f41`. Complete application and build scripts, excluding hosted site identity.

**Observed result.** The portable build emits a worker. The local development server served the journal and its status route without a provider credential. Hosted assistant answers and device recovery were outside the check.

```sh
node scripts/build.mjs
```

**Next acceptance check.** Create a fictional plant, record an observation, reload, and verify its timeline on the same device.

**Owner and decision.** Chance owns the public release and approves campaign copy. Personal device histories and forecasts require their own verification. This export is application source.

This dated record describes the developer package. Verify remote commit and tree in the publication receipt before announcing a GitHub release.
