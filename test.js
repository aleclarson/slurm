const { test, ftest, beforeAll, beforeEach } = require('testpass')
const slurm = require('slurm').default

beforeAll(() => {
  slurm.error = err => {
    throw err
  }
})

let res, config
beforeEach(() => {
  res = config = undefined
  clearArgv()
})

test('untyped flag', t => {
  setConfig({
    b: true,
  })

  setArgv(['-b'])
  t.eq(res.b, true)

  setArgv(['-b', 'bq'])
  t.eq(res.b, 'bq')
})

test('string flag', t => {
  setConfig({
    b: { type: 'string' },
  })

  setArgv(['-b', 'bq'])
  t.eq(res.b, 'bq')
})

test('string alias', t => {
  setConfig({
    branch: { type: 'string' },
    b: 'branch',
  })

  setArgv(['-b', 'bq'])
  t.eq(res.branch, 'bq')
})

test('boolean flag with no value', t => {
  setConfig({
    f: { type: 'boolean' },
    x: { type: 'boolean' },
  })

  setArgv(['-f', '-x'])
  t.eq(res.f, true)
  t.eq(res.x, true)
})

test('boolean alias with no value', t => {
  setConfig({
    force: { type: 'boolean' },
    f: 'force',
    x: { type: 'boolean' },
  })

  setArgv(['-f', '-x'])
  t.eq(res.force, true)
  t.eq(res.x, true)
})

test('flagless value before flag', t => {
  setArgv(['hi', '-f'])
  setConfig({
    f: { type: 'boolean' },
  })

  t.eq(res[0], 'hi')
  t.eq(res.f, true)
})

test('flagless value after flag', t => {
  setArgv(['-f', 'hi'])
  setConfig({
    f: { type: 'boolean' },
  })

  t.eq(res[0], 'hi')
  t.eq(res.f, true)
})

function runSlurm() {
  if (config) res = slurm(config)
}

function setArgv(argv) {
  process.argv = process.argv.slice(0, 2).concat(argv)
  runSlurm()
}

function setConfig(newConfig) {
  config = newConfig
  runSlurm()
}

function clearArgv() {
  setArgv([])
}
