# BillShield US

BillShield reconciles one US medical visit across the insurer’s Explanation of Benefits (EOB), the provider’s statement and the patient’s receipts. It prepares a billing question and checks the next statement against the updated figures and any promise made on the call. The calculations and printable report run with local case data and require no API keys.

## Run locally

Use Node.js 24.x and npm from the repository root. The lockfile includes the development dependencies used by the tests and the production build.

```sh
npm ci
npm run dev
```

Open the [printable sample](http://localhost:3000/report/sample) for a fictional visit with a $150 payment and a $50 discrepancy on the next statement. Select **Print / Save as PDF** and choose the browser’s PDF destination.

The [one-page example PDF](output/pdf/BillShield-sample.pdf) was printed from this route. To print an open guest case, render [PrintableBillReport](src/components/PrintableBillReport.tsx) after demo unlock and pass the current `first`, `call` and `next` values.

## Prepare a release

Run the same checks as the [GitHub Actions workflow](.github/workflows/preflight.yml).

```sh
npm test
npm run typecheck
npm run build
PORT=3100 npm start
```

From another terminal, check the built server. The health endpoint returns `{"status":"ok"}`. The sample page contains the print control.

```sh
curl -fsS http://localhost:3100/api/health
curl -fsS http://localhost:3100/report/sample
```

## Combine the interface and deploy

1. The interface owner merges `origin/billshield/calculations` into `billshield/interface` after fetching the latest changes. Connect the live case to the printable report and exercise the complete guest flow at `/try`. The [implementation plan](BILLSHIELD_PLAN.md) includes the shared types, sample inputs and expected amounts.
2. Merge the tested interface and calculations into the release branch. This repository’s default branch is `nurzhan-zhumabekov/festive-pascal-7krgh2`. Record the merged commit using `git rev-parse HEAD` on that branch.
3. For Vercel, import the integrated GitHub repository, select the **Next.js** preset, use the repository root and Node.js **24.x**. Use `npm ci` for installation and `npm run build` for the build. Check that the production branch tracks the integrated release branch and that the deployment points to the recorded commit. [Vercel Git deployment guide](https://vercel.com/docs/git)
4. Open the production URL in a private window. Check `/api/health`, `/report/sample`, then `/try` with the $600 EOB, $150 posted payment and $500 follow-up statement. Print the user’s case through the guest demo unlock and verify that the amount to clarify is $50. Submit the working production URL with the repository containing that commit.

On a Node web-service host, build with `npm ci && npm run build`, start with `npm start` and configure `/api/health` as the health path. Next.js reads the port assigned by the host from `PORT`.
