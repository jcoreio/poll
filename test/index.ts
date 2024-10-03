import { describe, it } from 'mocha'
import poll from '../src'
import { expect } from 'chai'

import type { CallContext } from '../src'

const noop = () => {
  /* ignore */
}

describe('poll', function () {
  this.timeout(2000)
  it('throws when interval is missing', async () => {
    // @ts-expect-error needs second argument
    expect(() => poll(noop)).to.throw(Error)
  })
  it('throws when interval is NaN', async () => {
    expect(() => poll(noop, NaN)).to.throw(Error)
  })
  it('throws when interval is negative', async () => {
    expect(() => poll(noop, -1)).to.throw(Error)
  })
  it('resolves when condition is met', async () => {
    let numAttempts
    await poll(({ attemptNumber, elapsedTime }: CallContext<void>) => {
      numAttempts = attemptNumber + 1
      if (elapsedTime < 250) throw new Error()
    }, 100).timeout(1000)
    expect(numAttempts).to.equal(4)
  })
  it('rejects when condition times out', async () => {
    let numAttempts
    let error
    await poll(({ attemptNumber, elapsedTime }: CallContext<void>) => {
      numAttempts = attemptNumber + 1
      if (elapsedTime < 500) throw new Error('test!')
    }, 100)
      .timeout(250)
      .catch((err) => (error = err))
    expect(numAttempts).to.equal(3)
    if (!error) throw new Error('expected error to be thrown')
    expect(error.message).to.match(/timed out/i)
    expect(error.message).to.match(/last error: Error: test!/i)
  })
  it(`doesn't wrap error if wrapError: false`, async () => {
    let numAttempts
    let error
    await poll(({ attemptNumber, elapsedTime }: CallContext<void>) => {
      numAttempts = attemptNumber + 1
      if (elapsedTime < 500) throw new Error('test!')
    }, 100)
      .timeout(250)
      .noWrapError()
      .catch((err) => (error = err))
    expect(numAttempts).to.equal(3)
    if (!error) throw new Error('expected error to be thrown')
    expect(error.message).to.equal('test!')
  })
  it('allows fn to manually pass', async () => {
    const result = await poll(
      ({ attemptNumber, pass }: CallContext<number>): any => {
        if (attemptNumber === 3) pass(attemptNumber)
      },
      20
    ).until((error, value) => value != null)
    expect(result).to.equal(3)
  })
  it('allows fn to manually fail', async () => {
    let numAttempts
    let error
    await poll(({ attemptNumber, elapsedTime, fail }: CallContext<void>) => {
      numAttempts = attemptNumber + 1
      if (elapsedTime < 50) throw new Error()
      else fail(new Error('manually failed!'))
    }, 20).catch((err) => (error = err))
    expect(numAttempts).to.equal(4)
    if (!error) throw new Error('expected error to be thrown')
    expect(error.message).to.equal('manually failed!')
  })
  it('allows until condition to be overridden', async () => {
    const value = await poll(
      ({ attemptNumber }: CallContext<number>) => attemptNumber,
      20
    ).until((error, value) => value === 3)
    expect(value).to.equal(3)
  })
  it('throws if condition becomes true on error', async () => {
    let error
    await poll(({ attemptNumber }: CallContext<void>) => {
      if (attemptNumber === 3) throw new Error('done!')
    }, 20)
      .until((error) => Boolean(error))
      .catch((err) => (error = err))
    if (!error) throw new Error('expected error to be thrown')
    expect(error.message).to.equal('done!')
  })
  it('rejects when canceled', async () => {
    let error
    const promise = poll(() => {
      throw new Error()
    }, 20)
    promise.cancel()
    await promise.catch((err) => (error = err))
    if (!error) throw new Error('expected error to be thrown')
    expect(error.message).to.match(/canceled/)
  })
})
