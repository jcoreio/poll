export type UntilCondition<T> = (
  error: Error | null | undefined,
  result?: T
) => boolean | Promise<boolean>

export class Poller<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2>
  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult>
  finally(onfinally?: (() => void) | undefined | null): Promise<T>
  cancel(): void
  until(condition: UntilCondition<T>): this
  timeout(ms: number): this
  noWrapError(): this
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
