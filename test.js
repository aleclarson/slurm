const { test, beforeAll, afterEach } = require('testpass')
const slurm = require('slurm').default

beforeAll(setErrorHandler)
afterEach(clearArgv)

test('flag after rest argument', t => {
  setArgv(['xx', '-b', 'qq'])

  const args = slurm({ b: true })
  t.eq(args[0], 'xx')
  t.eq(args._, 'xx -b qq')
  t.eq(args.b, 'qq')
})

function setArgv(argv) {
  process.argv = process.argv.slice(0, 2).concat(argv)
}

function clearArgv() {
  setArgv([])
}

function setErrorHandler() {
  slurm.error = err => {
    throw err
  }
}
