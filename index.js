const falseRE = /^(0|false|no)$/i
const shortRE = /^\-[^\-]$/i
const longRE = /^\-\-[^\-].+$/i

const empty = {}

function slurm(flags = empty) {
  let args = process.argv.slice(2)
  args._ = args.join(' ')
  let flag = null, flagIdx = -1
  let flagsBegin = -1
  for (let i = 0; i < args.length; i++) {
    let arg = args[i]
    let isFlag = false

    // Flags like -z
    if (shortRE.test(arg)) {
      arg = arg.slice(1)
      isFlag = true
    }

    // Flags like --foo
    else if (longRE.test(arg)) {
      arg = arg.slice(2)
      isFlag = true
    }

    // The -- arg acts as an unnamed rest flag.
    else if (arg == '--') {
      args[arg] = args.slice(i + 1)
      if (!flag) flagsBegin = i
      break
    }

    // When `flag` exists, this argument is a flag value.
    else if (flag) {
      let val = args[flag]
      let opts = getFlag(flag)
      if (typeof opts == 'function') {
        // Flag functions are called once per associated value.
        args[flag] = opts(arg)
      } else {
        if (opts.rest) {
          // Rest flags consume the remaining args.
          args[flag] = args.slice(i)
          break
        }
        // Validate flag-associated values.
        switch (opts.type) {
          case 'boolean':
            arg = !falseRE.test(arg)
            break
          case 'number':
            arg = Number(arg)
            if (isNaN(arg))
              return slurm.error(args[flagIdx] + ' must be a number')
            break
        }
        // Flags may have one or many values.
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
      // Support -x=1 or --foo=1,2
      let eq = arg.indexOf('=')
      if (eq !== -1) {
        arg = arg.slice(0, eq)
        args.splice(i + 1, 0, arg.slice(eq + 1))
      }

      // Unknown flags are considered errors.
      if (flags[arg] == null) {
        return slurm.error('Unrecognized flag: ' + args[i])
      }

      if (!flag) {
        // Track where the first flag is.
        flagsBegin = i
      } else if (args[flag] === undefined) {
        // Ensure a property exists for the previous flag.
        setFlag(flag)
      }

      flag = arg
      flagIdx = i
    }
  }

  // Ensure a property exists for the last flag.
  if (flag && args[flag] === undefined) {
    setFlag(flag)
  }

  function getFlag(flag) {
    let opts = flags[flag]
    if (typeof opts == 'string') {
      // Alias flags are supported.
      opts = flags[opts]
    }
    // Reuse the same empty object for simple flags.
    return opts === true ? empty : opts
  }

  function setFlag(flag) {
    let opts = getFlag(flag)
    if (typeof opts == 'function') {
      // Flag functions are passed `true` if no values exist
      // between it and the next flag (or the end).
      args[flag] = opts(true)
    }
    else if (opts.type) {
      switch (opts.type) {
        case 'boolean':
          args[flag] = true
          return
        case 'string':
          args[flag] = ''
          return
      }
      // Other types must have a value.
      return slurm.error(args[flagIdx] + ' must be a ' + opts.type)
    }
    else {
      // List flags default to an empty array.
      args[flag] = opts.list ? [] : true
    }
  }

  // Remove raw flags from `args` array.
  if (flagsBegin >= 0) {
    args.splice(flagsBegin, Infinity)
  }

  // Apply default values.
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

slurm.error = function(msg) {
  console.log('error:', msg)
  process.exit(1)
}

module.exports = slurm
