// @flow

export type UntilCondition<T> = (
  error: ?Error,
  result?: T
) => boolean | Promise<boolean>

export class Poller<T> {
  _fn: (info: CallContext<T>) => T | Promise<T>
  _until: (UntilCondition<T>) => boolean = (error: ?Error, result?: T) => !error
  _interval: number
  _timeout: ?number
  _timeoutId: ?any
  _wrapError: boolean = true
  _canceled: boolean = false
  _fail: (error: Error) => void

  constructor(fn: (info: CallContext<T>) => T | Promise<T>, interval: number) {
    if (!Number.isFinite(interval) || interval < 0) {
      throw new Error(`invalid interval: ${interval}`)
    }

    this._fn = fn
    this._interval = interval
  }

  async _run(): Promise<T> {
    let attemptNumber = 0
    const startTime = Date.now()
    let timeoutId: any
    let passed: ?[T], failed: ?[Error]
    let fail: (error: Error) => void, pass: (value: T) => void
    const manualPromise = new Promise<T>(
      (resolve: (value: T) => void, reject: (error: Error) => void) => {
        pass = (value: T) => {
          passed = [value]
          resolve(value)
        }
        this._fail = fail = (error: Error) => {
          failed = [error]
          reject(error)
        }
        if (this._canceled) fail(new Error('polling canceled'))
      }
    )
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        let result: ?T = undefined,
          error: ?Error = undefined
        const now = Date.now()
        try {
          result = await Promise.race([
            manualPromise,
            this._fn({
              attemptNumber: attemptNumber++,
              elapsedTime: now - startTime,
              fail,
              pass,
            }),
          ])
        } catch (err) {
          error = err
        }
        if (passed) return passed[0]
        if (failed) throw failed[0]

        if (await this._until(error, result)) {
          if (error) throw error
          return result
        }
        const nextTime = now + this._interval
        if (this._timeout != null && nextTime - startTime > this._timeout) {
          let message = 'timed out waiting for polling to succeed'
          if (this._wrapError) {
            if (error) message += `; last error: ${error.stack}`
            throw new Error(message)
          } else {
            throw error || new Error(message)
          }
        } else {
          const delay = Math.max(0, nextTime - Date.now())
          await new Promise<void>((resolve: () => void) => {
            timeoutId = setTimeout(resolve, delay)
          })
        }
      }
    } finally {
      if (timeoutId != null) clearTimeout(timeoutId)
    }
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?:
      | ((value: T) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2> {
    return this._run().then(onfulfilled, onrejected)
  }

  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null
  ): Promise<T | TResult> {
    return this._run().catch(onrejected)
  }

  finally(onfinally?: (() => void) | undefined | null): Promise<T> {
    return this._run().finally(onfinally)
  }

  cancel() {
    this._canceled = true
    this._fail?.(new Error('polling canceled'))
  }

  until(condition: UntilCondition<T>): this {
    this._until = condition
    return this
  }

  timeout(ms: number): this {
    this._timeout = ms
    return this
  }

  noWrapError(): this {
    this._wrapError = false
    return this
  }
}

export type CallContext<T> = {
  attemptNumber: number,
  elapsedTime: number,
  fail(error: Error): void,
  pass(value: T): void,
}
function poll<T>(
  fn: (info: CallContext<T>) => T | Promise<T>,
  interval: number
): Poller<T> {
  return new Poller(fn, interval)
}
poll.default = poll

export default poll
