/** For resolving mapped types to object literals */
type Remap<T> = { [P in keyof T]: T[P] }

/** Decide on a type when a boolean is exact */
type Either<Bool extends boolean, True, False> =
  Bool extends true ? True :
  Bool extends false ? False :
  True | False

/** Extract keys whose values match a condition */
type Filter<T, Cond, U extends keyof T = keyof T> = {
  [K in U]: T[K] extends Cond ? K : never
}[U]

interface ValueFlag {
  /**
   * Determine how the flag's value is parsed. By default, the value is either
   * a non-empty string or `undefined`.
   */
  type?: 'boolean' | 'string' | 'number'

  /**
   * The value to use when this flag is not specified.
   */
  default?: any
}

interface ListFlag extends ValueFlag {
  /**
   * Let this flag have multiple values after it. Other flags end the list.
   */
  list: boolean
}

interface RestFlag extends ValueFlag {
  /**
   * Use the remaining arguments as this flag's value.
   */
  rest: boolean
}

type FlagType<Flag extends ValueFlag> =
  Flag['type'] extends 'boolean' ? boolean :
  Flag['type'] extends 'number' ? number :
  string

type VarFlagType<Flag extends ListFlag | RestFlag> = Either<
  Flag extends ListFlag ? Flag['list'] :
    Flag extends RestFlag ? Flag['rest'] :
    any,
  FlagType<Flag>[],
  FlagType<Flag>
>

type FlagValue<Flag> =
  Flag extends string ? never :
  Flag extends ListFlag | RestFlag ? VarFlagType<Flag> :
  Flag extends ValueFlag ? FlagType<Flag> :
  string

/** Extract flag names whose value is never `never` */
type MaybeFlags<T> = Exclude<
  keyof T,
  '*' | Filter<{ [P in keyof T]: FlagValue<T[P]> }, never>
>

interface StaticArgs extends Array<string> {
  /** The original `process.argv.slice(2).join(' ')` */
  _: string

  /** The `--` flag that steals the remaining arguments */
  ['--']?: string
}

declare module 'slurm' {
  /**
   * Any of the values in the `flags` map you pass can be: a `FlagConfig`
   * object, a function, a string, or `true`.
   *
   * When a value is a function, it's called for every non-flag argument
   * following this flag. The function is passed `true` when no values exist
   * between this flag and either the next flag or the end of arguments.
   *
   * When a value is a string, the flag is used as an alias for another flag.
   *
   * When a value is `true`, it's equivalent to an empty `FlagConfig` object.
   */
  const slurm: ISlurm
  export default slurm
  export interface ISlurm {
    <T extends FlagSchema = FlagSchema>(flags?: T): ParsedArgs<T> & StaticArgs;
    (flags: '*'): ParsedArgs & StaticArgs;

    error: (msg: string) => void;
  }

  export type FlagSchema = { [name: string]: FlagConfig }
  export type FlagConfig =
    true |
    string |
    ListFlag |
    RestFlag |
    ValueFlag |
    ((value: string | true) => void)

  export type ParsedArgs<T extends FlagSchema = FlagSchema> = Remap<{} &
    FlagSchema extends T ? {} : { [P in MaybeFlags<T>]?: FlagValue<T[P]> }
  >
}
