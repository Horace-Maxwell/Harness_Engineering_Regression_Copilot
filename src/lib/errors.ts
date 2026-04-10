export interface CliErrorOptions {
  fix?: string;
  next?: string;
  details?: unknown;
}

export class CliError extends Error {
  fix?: string;
  next?: string;
  details?: unknown;

  constructor(message: string, options: CliErrorOptions = {}) {
    super(message);
    this.name = "CliError";
    this.fix = options.fix;
    this.next = options.next;
    this.details = options.details;
  }
}

export function asCliError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError(error.message);
  }

  return new CliError(String(error));
}
