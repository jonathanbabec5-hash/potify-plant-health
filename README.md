# Plant Health Journal

[Complete repository directory tree](docs/DIRECTORY.md)

**Application source.** Help a grower see how conditions and care change over a plant's lifetime.

### Setup and usage

Use Node.js 24 for the included checks. Optional hosted AI review needs a trusted authentication boundary and a server-held API key. The local journal starts without either.

```sh
npm run dev
```

Record a first observation. Open http://127.0.0.1:3000 in a browser. 

### Developer entry points

The browser app stores workspaces locally in IndexedDB. Its build script embeds static files in a Worker, with separate views for observations, feeding and forecasts. Explore `app/`, `scripts/`, `worker/` in the full tree.

### Verification

The portable build emits a worker. The local development server served the journal and its status route without a provider credential. Hosted assistant answers and device recovery were outside the check.

```sh
node scripts/build.mjs
```

### Release scope

Personal device histories and forecasts require their own verification. This export is application source. potify-plant-health at `360fc24d570212c2c6f07c9c6cdbd73cef162f41`. Complete application and build scripts, excluding hosted site identity.

[Technical whitepaper](docs/WHITEPAPER.md) · [Marketing and sales plan](docs/MARKETING.md) · [Dated developer log](docs/BUILD-LOG.md)

Existing asset and code terms remain applicable. Public access to a recording, illustration, brand or manuscript does not itself grant commercial reuse rights.
