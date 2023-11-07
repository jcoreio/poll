export type UntilCondition<T> = (
  error: Error | null | undefined,
  result?: T
) => boolean | Promise<boolean>

export type Poller<T> = Promise<T> & {
  cancel(): void
  until(condition: UntilCondition<T>): Poller<T>
  timeout(ms: number): Poller<T>
  noWrapError(): Poller<T>
}

export type CallContext<T> = {
  attemptNumber: number
  elapsedTime: number
  fail(error: Error): void
  pass(value: T): void
}

export default function poll<T>(
  fn: (info: CallContext<T>) => T | Promise<T>,
  interval: number
): Poller<T>
