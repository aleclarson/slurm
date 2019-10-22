# slurm v0.5.9

CLI argument parser

```js
const slurm = require('slurm')

const argv = '-f -b=0 --list 1 2 3 -n=100 --func [1,2,3] -xyz'
process.argv.push(...argv.split(' '))

const args = slurm({
  '*': true,            // (no throw for unknown flags)
  f: 'foo',             // -f (alias of --foo)
  foo: true,            // --foo
  list: {               // --list 1 2 3
    list: true
  },
  b: {                  // -b=0
    type: 'boolean'
  },
  n: {                  // -n=100
    type: 'number',
    default: 0,
  },
  func(value) {         // --func [1,2,3]
    return JSON.parse(value)
  }
})

args.foo   // => true
args.list  // => ['1', '2', '3']
args.b     // => false
args.n     // => 100
args.func  // => [1, 2, 3]
args.x     // => true
args.y     // => true
args.z     // => true
```
