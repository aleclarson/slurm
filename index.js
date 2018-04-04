const huey = require('huey')

const falseRE = /^(0|false|no)$/i
const shortRE = /^\-[a-z]$/i
const longRE = /^\-\-[a-z\-]+$/i

const empty = {}

function slurm(flags = empty) {
  let args = process.argv.slice(2)
  args._ = args.join(' ')
  let flag = null, flagIdx = -1
  let flagsBegin = -1
  for (let i = 0; i < args.length; i++) {
    let arg = args[i], isFlag = false
    if (shortRE.test(arg)) {
      arg = arg.slice(1)
      isFlag = true
    }
    else if (longRE.test(arg)) {
      arg = arg.slice(2)
      isFlag = true
    }
    else if (arg == '--') {
      args[arg] = args.slice(i + 1)
      if (!flag) flagsBegin = i
      break
    }
    else if (flag) {
      let val = args[flag]
      let opts = getFlag(flag)
      if (typeof opts == 'function') {
        args[flag] = opts(arg)
      } else {
        switch (opts.type) {
          case 'boolean':
            arg = !falseRE.test(arg)
            break
          case 'number':
            arg = Number(arg)
            if (isNaN(arg))
              fatal(args[flagIdx] + ' must be a number')
            break
        }
        if (opts.list) {
          if (val) {
            val.push(arg)
          } else {
            args[flag] = [arg]
          }
        } else {
          args[flag] = arg
        }
      }
    }
    if (isFlag) {
      if (flags[arg] == null) {
        fatal('Unrecognized flag: ' + args[i])
      }
      if (!flag) {
        flagsBegin = i
      } else if (args[flag] === undefined) {
        setFlag(flag)
      }
      flag = arg
      flagIdx = i
    }
  }
  if (flag && args[flag] === undefined) {
    setFlag(flag)
  }
  function getFlag(flag) {
    let opts = flags[flag]
    if (typeof opts == 'string') {
      opts = flags[opts]
    }
    return opts === true ? empty : opts
  }
  function setFlag(flag) {
    let opts = getFlag(flag)
    if (typeof opts == 'function') {
      args[flag] = opts(true)
    } else if (opts.type && opts.type != 'boolean') {
      fatal(args[flagIdx] + ' must be a ' + opts.type)
    } else {
      args[flag] = opts.list ? [] : true
    }
  }
  if (flagsBegin >= 0) {
    args.splice(flagsBegin, Infinity)
  }
  for (let flag in flags) {
    let opts = flags[flag]
    if (typeof opts != 'object') {
      continue
    }
    if (opts.default !== undefined) {
      if (args[flag] === undefined) {
        args[flag] = opts.default
      }
    }
  }
  return args
}

module.exports = slurm

function fatal(msg) {
  console.log(huey.red('Error: ') + msg)
  process.exit()
}

