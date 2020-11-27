const shortRE = /^\-[^\-]+/i
const longRE = /^\-\-[^\-].+$/i

const empty = {}
const forbiddenFlags = ['*', '_', 'length']
const quoteSpaces = arg => (arg.includes(' ') ? '"' + arg + '"' : arg)

function slurm(flags = empty) {
  let args = process.argv.slice(2)
  args._ = args.map(quoteSpaces).join(' ')

  // Pass "*" to disable strict mode.
  if (flags == '*') {
    flags = { '*': true }
  }

  let flag = null
  let flagIdx = -1
  let flagsBegin = -1
  for (let i = 0; i < args.length; i++) {
    let arg = args[i]
    let isFlag = false

    // Flags like -z
    if (shortRE.test(arg)) {
      // Treat -abc like -a -b -c
      if (arg.length > 2) {
        let expanded = arg
          .slice(2)
          .split('')
          .map(ch => '-' + ch)

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
      let offset = -1
      if (args._.startsWith('-- ')) {
        offset = 0
      } else {
        offset = args._.indexOf(' -- ')
        if (offset >= 0) offset++
      }
      if (offset !== -1) {
        // Define '--' property on `args`
        args[arg] = args._.slice(offset + 3)

        // Remove '--' and every arg after it
        args._ = args._.slice(0, offset)

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
      let name = resolveFlag(flag)
      let cfg = getFlag(name)

      // Flag functions are called once per associated value.
      if (typeof cfg == 'function') {
        args[name] = cfg(arg)
      }

      // Rest flags consume the remaining args.
      else if (cfg.rest) {
        args[name] = args.slice(i)
        break
      }

      // Validate flag-associated values.
      else {
        let val = args[name]
        switch (cfg.type) {
          case 'boolean':
            if (arg == 0 || arg == 1) {
              arg = !!arg
              break
            }

            // Non-boolean strings are flagless arguments.
            // Move them to before the flag index.
            args.splice(flagsBegin++, 0, arg)
            i += 1

            // Ensure a value exists for this flag.
            setFlagDefault()
            flag = null
            continue

          case 'number':
            arg = Number(arg)
            if (isNaN(arg))
              return slurm.error(args[flagIdx] + ' must be a number')
            break
        }

        // Flags may have one or many values.
        if (cfg.list) {
          if (val) {
            val.push(arg)
          } else {
            args[name] = [arg]
          }
        } else {
          args[name] = arg
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
      else {
        setFlagDefault()
      }

      flag = arg
      flagIdx = i
    }
  }

  // Ensure a value exists for the last flag.
  setFlagDefault()

  // Resolve flag aliases.
  function resolveFlag(name) {
    let flag = flags[name]
    return typeof flag == 'string' ? flag : name
  }

  // Get a flag's config.
  function getFlag(name) {
    let flag = flags[resolveFlag(name)]
    return flag && flag !== true ? flag : empty
  }

  // Use a default value if necessary.
  function setFlagDefault() {
    if (!flag) return
    let name = resolveFlag(flag)
    if (args[name] !== undefined) {
      return
    }
    let cfg = getFlag(name)
    if (typeof cfg == 'function') {
      // Flag functions are passed `true` if no values exist
      // between it and the next flag (or the end).
      args[name] = cfg(true)
    } else if (cfg.type) {
      switch (cfg.type) {
        case 'boolean':
          args[name] = true
          return
        case 'string':
          args[name] = ''
          return
      }
      // Other types must have a value.
      return slurm.error(args[flagIdx] + ' must be a ' + cfg.type)
    } else {
      // List flags default to an empty array.
      args[name] = cfg.list ? [] : true
    }
  }

  // Remove raw flags from `args` array.
  if (flagsBegin >= 0) {
    args.length = flagsBegin
  }

  // Apply default values.
  for (let flag in flags) {
    let cfg = flags[flag]
    if (!cfg || typeof cfg != 'object') {
      continue
    }
    if (cfg.default !== undefined) {
      if (args[flag] === undefined) {
        args[flag] = cfg.default
      }
    }
  }

  return args
}

slurm.error = function (msg) {
  console.log('error:', msg)
  process.exit(1)
}

slurm.default = slurm
module.exports = slurm
