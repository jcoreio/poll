# poll

[![Build Status](https://travis-ci.org/jcoreio/poll.svg?branch=master)](https://travis-ci.org/jcoreio/poll)
[![Coverage Status](https://codecov.io/gh/jcoreio/poll/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/poll)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)

yet another promise-based poller (I didn't like the API design of others out there)

## Example

```sh
npm install --save poll
```

```js
const poll = require('poll')
const superagent = require('superagent')

poll(() => superagent.get('http://google.com'), 1000)
  .timeout(30000)
  .then(() => console.log("You're connected to the internet!"))
```

## `poll(fn, interval)`

Begins calling `fn` every `interval` milliseconds until the condition passes
(which defaults to `fn` didn't throw an `Error` or return a rejected `Promise`).

Returns a `Promise` that resolves when polling finishes or fails, which may be:
* when `fn` calls the `pass` method provided to it
* when `fn` calls the `fail` method provided to it
* when `fn` returns/resolves to a value or throws/rejects with an `Error` that
  passes the condition
* when a timeout is specified and `poll` times out waiting for any of the above

`fn` will be called with a context object:
```js
{
  attemptNumber: number, // the number of this call (starting from 0)
  elapsedTime: number, // the number of milliseconds since polling started
  pass: (value: any) => void, // makes `poll` resolve immediately with this value
  fail: (error: Error) => void, // makes `poll` reject immediately with this Error
}
```

You can change the condition by calling `.until` on the returned `Promise`:
```js
poll(...).until((error, result) => result > 3)
```

`error` will be the `Error` from the last call to `fn` (if it rejected or threw)
and `result` will be the value it resolved to or returned otherwise.

You can specify a timeout (in milliseconds) by calling `.timeout` on the returned `Promise`:
```js
poll(...).timeout(30000) // time out after 30 seconds
```
