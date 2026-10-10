// Hosted demo mode (FORK_HOSTED_DEMO=1) for a public deployment that judges and
// visitors can try. The server then runs only the bundled demo fixture, only on
// the Nemotron runtime, one run at a time. Arbitrary repositories and commands
// stay a local, self-hosted feature.

export function hostedDemoMode(): boolean {
  return process.env.FORK_HOSTED_DEMO === "1";
}

export const HOSTED_DEMO_MAX_ACTIVE_RUNS = Number(process.env.FORK_HOSTED_MAX_ACTIVE_RUNS ?? 1);

export const HOSTED_DEMO_REASON =
  "This is the hosted demo: it runs the bundled demo task on NVIDIA Nemotron. Clone the repository to run FORK on your own code.";
