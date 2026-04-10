interface OutputState {
  json: boolean;
  quiet: boolean;
  noColor: boolean;
}

const state: OutputState = {
  json: false,
  quiet: false,
  noColor: false,
};

export function setOutputOptions(nextState: Partial<OutputState>): void {
  state.json = nextState.json ?? false;
  state.quiet = nextState.quiet ?? false;
  state.noColor = nextState.noColor ?? false;
}

export function isJsonOutput(): boolean {
  return state.json;
}

export function isQuietOutput(): boolean {
  return state.quiet;
}

export function outputJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function info(text: string): void {
  if (state.json || state.quiet) {
    return;
  }

  console.log(text);
}

export function section(title: string): void {
  info(title);
}

export function bullet(text: string): void {
  info(`- ${text}`);
}

export function blank(): void {
  info("");
}

export function nextStep(command: string): void {
  info(`Next:\n  ${command}`);
}
