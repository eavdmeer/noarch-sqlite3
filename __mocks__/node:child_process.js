/* global jest */
/* eslint-disable no-sync */

const cp = jest.genMockFromModule('node:child_process');

const realCp = jest.requireActual('node:child_process');

// Override is initially inactive
let override = false;
let callCount = 0;

// Function to activate our override
cp.activateOverride = () => override = true;

// Override execFileSync if override is active
cp.execFileSync = jest.fn((...args) =>
{
  const results = [
    '4.37.0 2021-12-09 01:34:53 9ff244ce0739f8ee52a3e9671adb4ee54c83c640b02e3f9d185fd2f9a179aapl',
    '3.30.0 2021-12-09 01:34:53 9ff244ce0739f8ee52a3e9671adb4ee54c83c640b02e3f9d185fd2f9a179aapl'
  ];

  if (! override)
  {
    return realCp.execFileSync(...args);
  }

  // First call will use the real system call
  const result = callCount > results.length ?
    results[results.length - 1] : results[callCount];

  callCount++;

  return result;
});

// Override execFile if override is active
cp.execFile = jest.fn((...args) =>
{
  if (! override)
  {
    realCp.execFile(...args);
    return;
  }
  const callback = args.pop();
  callback(null, '[{"timeout":30000}]\n[{"name": "fake"}]');
});

module.exports = cp;
