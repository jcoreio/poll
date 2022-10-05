// @flow

export type UntilCondition<T> = (
  error: ?Error,
  result?: T
) => boolean | Promise<boolean>

export type Poller<T> = Promise<T> & {
  cancel(): void,
  until(condition: UntilCondition<T>): Poller<T>,
  timeout(ms: number): Poller<T>,
  noWrapError(): Poller<T>,
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
  let fail, pass
  let attemptNumber = 0
  let until = (error: ?Error, result?: T) => !error
  let timeout: ?number
  let timeoutId: ?any
  let lastError: ?Error
  let wrapError: boolean = true

  if (!Number.isFinite(interval) || interval < 0) {
    throw new Error(`invalid interval: ${interval}`)
  }

  const promise = new Promise(
    (resolve: (value: T) => void, reject: (error: Error) => void) => {
      const startTime = Date.now()

      fail = (error: Error) => {
        if (timeoutId != null) clearTimeout(timeoutId)
        reject(error)
      }
      pass = (value: T) => {
        if (timeoutId != null) clearTimeout(timeoutId)
        resolve(value)
      }

      async function _attempt(): Promise<void> {
        let result, error
        const now = Date.now()
        try {
          result = await fn({
            attemptNumber: attemptNumber++,
            elapsedTime: now - startTime,
            fail,
            pass,
          })
        } catch (err) {
          lastError = error = err
        }

        if (await until(error, result)) {
          if (timeoutId != null) clearTimeout(timeoutId)
          if (error) reject(error)
          else resolve((result: any))
        } else {
          const nextTime = now + interval
          if (timeout != null && nextTime - startTime > timeout) {
            let message = 'timed out waiting for polling to succeed'
            if (wrapError) {
              if (lastError) message += `; last error: ${lastError.stack}`
              reject(new Error(message))
            } else {
              reject(lastError || new Error(message))
            }
          } else {
            const delay = Math.max(0, nextTime - Date.now())
            timeoutId = setTimeout(attempt, delay)
          }
        }
      }

      const attempt = () => _attempt().catch(() => {})

      attempt()
    }
  )

  ;(promise: any).cancel = () => fail(new Error('polling canceled'))
  ;(promise: any).until = (condition: UntilCondition<T>): Promise<T> => {
    until = condition
    return promise
  }
  ;(promise: any).timeout = (ms: number): Promise<T> => {
    timeout = ms
    return promise
  }
  ;(promise: any).noWrapError = (): Promise<T> => {
    wrapError = false
    return promise
  }

  return (promise: any)
}
poll.default = poll

export default poll
