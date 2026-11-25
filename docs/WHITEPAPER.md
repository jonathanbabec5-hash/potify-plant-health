# Plant Health Journal
## Whitepaper · public developer edition

**November 25, 2026 · Application source**

### Goal and audience

Help a grower see how conditions and care change over a plant's lifetime. The immediate audience is grow journal keepers.

### Design and implementation

The browser app stores workspaces locally in IndexedDB. Its build script embeds static files in a Worker, with separate views for observations, feeding and forecasts. A local journal allows an observation to survive a dropped connection. Losing a browser profile also loses records unless a usable export exists.

### What a contributor can establish

The portable build emits a worker. The local development server served the journal and its status route without a provider credential. Hosted assistant answers and device recovery were outside the check. Check export and recovery on a disposable phone profile before advertising portability. The separate hosted AI assistance requires its own binding.

### Evidence and outstanding work

Personal device histories and forecasts require their own verification. This export is application source. The next acceptance case is concrete. Create a fictional plant, record an observation, reload, and verify its timeline on the same device.

### Place in POTIFY

Offer a printable season journal after validating demand with three separately opted-in readers. The marketing plan gives the test window and the evidence for a commercial outcome.

[Source provenance](source.json) · [Build log](BUILD-LOG.md) · [Marketing plan](MARKETING.md)
