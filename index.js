const shortRE = /^\-[^\-]+/i
const longRE = /^\-\-[^\-].+$/i

const empty = {}
const forbiddenFlags = ['*', '_', 'length']

function slurm(flags = empty) {
  let args = process.argv.slice(2)
  args._ = args.join(' ')

  // Pass "*" to disable strict mode.
  if (flags == '*') {
    flags = { '*': true }
  }

  let flag = null, flagIdx = -1
  let flagsBegin = -1
  for (let i = 0; i < args.length; i++) {
    let arg = args[i]
    let isFlag = false

    // Flags like -z
    if (shortRE.test(arg)) {
      // Treat -abc like -a -b -c
      if (arg.length > 2) {
        let expanded = arg.slice(2).split('').map(ch => '-' + ch)
        args.splice(i, 0, ...expanded)
      }
      arg = arg.slice(1, 2)
      isFlag = true
    }

    // Flags like --foo
    else if (longRE.test(arg)) {
      arg = arg.slice(2)
      isFlag = true
    }

    // The -- arg acts as an unnamed rest flag.
    else if (arg == '--') {
      let offset = args._.indexOf(' -- ')
      if (offset !== -1) {
        // Remove '--' and every arg after it
        args._ = args._.slice(0, offset)

        // Define '--' property on `args`
        args[arg] = args.slice(i + 1)

        // Track where the first flag starts.
        if (flagsBegin == -1) {
          flagsBegin = i
        }
      }
      // All arguments are processed.
      break
    }

    // When `flag` exists, this argument is a flag value.
    else if (flag) {
      let opts = getFlag(flag)

      // Flag functions are called once per associated value.
      if (typeof opts == 'function') {
        args[flag] = opts(arg)
      }

      // Rest flags consume the remaining args.
      else if (opts.rest) {
        args[flag] = args.slice(i)
        break
      }

      // Validate flag-associated values.
      else {
        let val = args[flag]
        switch (opts.type) {
          case 'boolean':
            if (arg == 0 || arg == 1) {
              arg = !!arg
              break
            }

            // Ensure a value exists for this flag.
            if (val === undefined) {
              setDefaultFlag(flag)
            }

            // Non-boolean strings are flagless arguments.
            // Reuse `arg` with `flag` set to null.
            i--
            flag = null
            continue

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
        args.splice(i + 1, 0, arg.slice(eq + 1))
        arg = arg.slice(0, eq)
      }

      if (forbiddenFlags.indexOf(arg) >= 0) {
        return slurm.error('Forbidden flag: ' + args[i])
      }

      // Unknown flags are considered errors.
      if (flags[arg] == null && flags['*'] !== true) {
        return slurm.error('Unrecognized flag: ' + args[i])
      }

      // Track where the first flag is.
      if (flagsBegin == -1) {
        flagsBegin = i
      }
      // Ensure a value exists for the previous flag.
      else if (args[flag] === undefined) {
        setDefaultFlag(flag)
      }

      flag = arg
      flagIdx = i
    }
  }

  // Ensure a value exists for the last flag.
  if (flag && args[flag] === undefined) {
    setDefaultFlag(flag)
  }

  function getFlag(flag) {
    let opts = flags[flag]
    if (opts === undefined) return empty
    if (typeof opts == 'string') {
      // Alias flags are supported.
      opts = flags[opts]
    }
    // Reuse the same empty object for simple flags.
    return opts === true ? empty : opts
  }

  function setDefaultFlag(flag) {
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
    args.length = flagsBegin
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

slurm.default = slurm
module.exports = slurm
