
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model BibleVersion
 * 
 */
export type BibleVersion = $Result.DefaultSelection<Prisma.$BibleVersionPayload>
/**
 * Model Book
 * 
 */
export type Book = $Result.DefaultSelection<Prisma.$BookPayload>
/**
 * Model Chapter
 * 
 */
export type Chapter = $Result.DefaultSelection<Prisma.$ChapterPayload>
/**
 * Model Verse
 * 
 */
export type Verse = $Result.DefaultSelection<Prisma.$VersePayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more BibleVersions
 * const bibleVersions = await prisma.bibleVersion.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more BibleVersions
   * const bibleVersions = await prisma.bibleVersion.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): void;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb, ExtArgs, $Utils.Call<Prisma.TypeMapCb, {
    extArgs: ExtArgs
  }>, ClientOptions>

      /**
   * `prisma.bibleVersion`: Exposes CRUD operations for the **BibleVersion** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more BibleVersions
    * const bibleVersions = await prisma.bibleVersion.findMany()
    * ```
    */
  get bibleVersion(): Prisma.BibleVersionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.book`: Exposes CRUD operations for the **Book** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Books
    * const books = await prisma.book.findMany()
    * ```
    */
  get book(): Prisma.BookDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.chapter`: Exposes CRUD operations for the **Chapter** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Chapters
    * const chapters = await prisma.chapter.findMany()
    * ```
    */
  get chapter(): Prisma.ChapterDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.verse`: Exposes CRUD operations for the **Verse** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Verses
    * const verses = await prisma.verse.findMany()
    * ```
    */
  get verse(): Prisma.VerseDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics 
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.2.1
   * Query Engine version: 4123509d24aa4dede1e864b46351bf2790323b69
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion 

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    * 
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    * 
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   * 
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? K : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    BibleVersion: 'BibleVersion',
    Book: 'Book',
    Chapter: 'Chapter',
    Verse: 'Verse'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb extends $Utils.Fn<{extArgs: $Extensions.InternalArgs, clientOptions: PrismaClientOptions }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], this['params']['clientOptions']>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> = {
    meta: {
      modelProps: "bibleVersion" | "book" | "chapter" | "verse"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      BibleVersion: {
        payload: Prisma.$BibleVersionPayload<ExtArgs>
        fields: Prisma.BibleVersionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BibleVersionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BibleVersionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>
          }
          findFirst: {
            args: Prisma.BibleVersionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BibleVersionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>
          }
          findMany: {
            args: Prisma.BibleVersionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>[]
          }
          create: {
            args: Prisma.BibleVersionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>
          }
          createMany: {
            args: Prisma.BibleVersionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BibleVersionCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>[]
          }
          delete: {
            args: Prisma.BibleVersionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>
          }
          update: {
            args: Prisma.BibleVersionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>
          }
          deleteMany: {
            args: Prisma.BibleVersionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BibleVersionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BibleVersionUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>[]
          }
          upsert: {
            args: Prisma.BibleVersionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BibleVersionPayload>
          }
          aggregate: {
            args: Prisma.BibleVersionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBibleVersion>
          }
          groupBy: {
            args: Prisma.BibleVersionGroupByArgs<ExtArgs>
            result: $Utils.Optional<BibleVersionGroupByOutputType>[]
          }
          count: {
            args: Prisma.BibleVersionCountArgs<ExtArgs>
            result: $Utils.Optional<BibleVersionCountAggregateOutputType> | number
          }
        }
      }
      Book: {
        payload: Prisma.$BookPayload<ExtArgs>
        fields: Prisma.BookFieldRefs
        operations: {
          findUnique: {
            args: Prisma.BookFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.BookFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>
          }
          findFirst: {
            args: Prisma.BookFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.BookFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>
          }
          findMany: {
            args: Prisma.BookFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>[]
          }
          create: {
            args: Prisma.BookCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>
          }
          createMany: {
            args: Prisma.BookCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.BookCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>[]
          }
          delete: {
            args: Prisma.BookDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>
          }
          update: {
            args: Prisma.BookUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>
          }
          deleteMany: {
            args: Prisma.BookDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.BookUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.BookUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>[]
          }
          upsert: {
            args: Prisma.BookUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$BookPayload>
          }
          aggregate: {
            args: Prisma.BookAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateBook>
          }
          groupBy: {
            args: Prisma.BookGroupByArgs<ExtArgs>
            result: $Utils.Optional<BookGroupByOutputType>[]
          }
          count: {
            args: Prisma.BookCountArgs<ExtArgs>
            result: $Utils.Optional<BookCountAggregateOutputType> | number
          }
        }
      }
      Chapter: {
        payload: Prisma.$ChapterPayload<ExtArgs>
        fields: Prisma.ChapterFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ChapterFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ChapterFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>
          }
          findFirst: {
            args: Prisma.ChapterFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ChapterFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>
          }
          findMany: {
            args: Prisma.ChapterFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>[]
          }
          create: {
            args: Prisma.ChapterCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>
          }
          createMany: {
            args: Prisma.ChapterCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.ChapterCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>[]
          }
          delete: {
            args: Prisma.ChapterDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>
          }
          update: {
            args: Prisma.ChapterUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>
          }
          deleteMany: {
            args: Prisma.ChapterDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ChapterUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.ChapterUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>[]
          }
          upsert: {
            args: Prisma.ChapterUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ChapterPayload>
          }
          aggregate: {
            args: Prisma.ChapterAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateChapter>
          }
          groupBy: {
            args: Prisma.ChapterGroupByArgs<ExtArgs>
            result: $Utils.Optional<ChapterGroupByOutputType>[]
          }
          count: {
            args: Prisma.ChapterCountArgs<ExtArgs>
            result: $Utils.Optional<ChapterCountAggregateOutputType> | number
          }
        }
      }
      Verse: {
        payload: Prisma.$VersePayload<ExtArgs>
        fields: Prisma.VerseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.VerseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.VerseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>
          }
          findFirst: {
            args: Prisma.VerseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.VerseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>
          }
          findMany: {
            args: Prisma.VerseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>[]
          }
          create: {
            args: Prisma.VerseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>
          }
          createMany: {
            args: Prisma.VerseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.VerseCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>[]
          }
          delete: {
            args: Prisma.VerseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>
          }
          update: {
            args: Prisma.VerseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>
          }
          deleteMany: {
            args: Prisma.VerseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.VerseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.VerseUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>[]
          }
          upsert: {
            args: Prisma.VerseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$VersePayload>
          }
          aggregate: {
            args: Prisma.VerseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateVerse>
          }
          groupBy: {
            args: Prisma.VerseGroupByArgs<ExtArgs>
            result: $Utils.Optional<VerseGroupByOutputType>[]
          }
          count: {
            args: Prisma.VerseCountArgs<ExtArgs>
            result: $Utils.Optional<VerseCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    bibleVersion?: BibleVersionOmit
    book?: BookOmit
    chapter?: ChapterOmit
    verse?: VerseOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type BibleVersionCountOutputType
   */

  export type BibleVersionCountOutputType = {
    books: number
  }

  export type BibleVersionCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    books?: boolean | BibleVersionCountOutputTypeCountBooksArgs
  }

  // Custom InputTypes
  /**
   * BibleVersionCountOutputType without action
   */
  export type BibleVersionCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersionCountOutputType
     */
    select?: BibleVersionCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * BibleVersionCountOutputType without action
   */
  export type BibleVersionCountOutputTypeCountBooksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BookWhereInput
  }


  /**
   * Count Type BookCountOutputType
   */

  export type BookCountOutputType = {
    chapters: number
  }

  export type BookCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chapters?: boolean | BookCountOutputTypeCountChaptersArgs
  }

  // Custom InputTypes
  /**
   * BookCountOutputType without action
   */
  export type BookCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BookCountOutputType
     */
    select?: BookCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * BookCountOutputType without action
   */
  export type BookCountOutputTypeCountChaptersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ChapterWhereInput
  }


  /**
   * Count Type ChapterCountOutputType
   */

  export type ChapterCountOutputType = {
    verses: number
  }

  export type ChapterCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    verses?: boolean | ChapterCountOutputTypeCountVersesArgs
  }

  // Custom InputTypes
  /**
   * ChapterCountOutputType without action
   */
  export type ChapterCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ChapterCountOutputType
     */
    select?: ChapterCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * ChapterCountOutputType without action
   */
  export type ChapterCountOutputTypeCountVersesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VerseWhereInput
  }


  /**
   * Models
   */

  /**
   * Model BibleVersion
   */

  export type AggregateBibleVersion = {
    _count: BibleVersionCountAggregateOutputType | null
    _avg: BibleVersionAvgAggregateOutputType | null
    _sum: BibleVersionSumAggregateOutputType | null
    _min: BibleVersionMinAggregateOutputType | null
    _max: BibleVersionMaxAggregateOutputType | null
  }

  export type BibleVersionAvgAggregateOutputType = {
    id: number | null
  }

  export type BibleVersionSumAggregateOutputType = {
    id: number | null
  }

  export type BibleVersionMinAggregateOutputType = {
    id: number | null
    name: string | null
    fullName: string | null
    createdAt: Date | null
  }

  export type BibleVersionMaxAggregateOutputType = {
    id: number | null
    name: string | null
    fullName: string | null
    createdAt: Date | null
  }

  export type BibleVersionCountAggregateOutputType = {
    id: number
    name: number
    fullName: number
    createdAt: number
    _all: number
  }


  export type BibleVersionAvgAggregateInputType = {
    id?: true
  }

  export type BibleVersionSumAggregateInputType = {
    id?: true
  }

  export type BibleVersionMinAggregateInputType = {
    id?: true
    name?: true
    fullName?: true
    createdAt?: true
  }

  export type BibleVersionMaxAggregateInputType = {
    id?: true
    name?: true
    fullName?: true
    createdAt?: true
  }

  export type BibleVersionCountAggregateInputType = {
    id?: true
    name?: true
    fullName?: true
    createdAt?: true
    _all?: true
  }

  export type BibleVersionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BibleVersion to aggregate.
     */
    where?: BibleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BibleVersions to fetch.
     */
    orderBy?: BibleVersionOrderByWithRelationInput | BibleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BibleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BibleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BibleVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned BibleVersions
    **/
    _count?: true | BibleVersionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BibleVersionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BibleVersionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BibleVersionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BibleVersionMaxAggregateInputType
  }

  export type GetBibleVersionAggregateType<T extends BibleVersionAggregateArgs> = {
        [P in keyof T & keyof AggregateBibleVersion]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBibleVersion[P]>
      : GetScalarType<T[P], AggregateBibleVersion[P]>
  }




  export type BibleVersionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BibleVersionWhereInput
    orderBy?: BibleVersionOrderByWithAggregationInput | BibleVersionOrderByWithAggregationInput[]
    by: BibleVersionScalarFieldEnum[] | BibleVersionScalarFieldEnum
    having?: BibleVersionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BibleVersionCountAggregateInputType | true
    _avg?: BibleVersionAvgAggregateInputType
    _sum?: BibleVersionSumAggregateInputType
    _min?: BibleVersionMinAggregateInputType
    _max?: BibleVersionMaxAggregateInputType
  }

  export type BibleVersionGroupByOutputType = {
    id: number
    name: string
    fullName: string
    createdAt: Date
    _count: BibleVersionCountAggregateOutputType | null
    _avg: BibleVersionAvgAggregateOutputType | null
    _sum: BibleVersionSumAggregateOutputType | null
    _min: BibleVersionMinAggregateOutputType | null
    _max: BibleVersionMaxAggregateOutputType | null
  }

  type GetBibleVersionGroupByPayload<T extends BibleVersionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BibleVersionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BibleVersionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BibleVersionGroupByOutputType[P]>
            : GetScalarType<T[P], BibleVersionGroupByOutputType[P]>
        }
      >
    >


  export type BibleVersionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    fullName?: boolean
    createdAt?: boolean
    books?: boolean | BibleVersion$booksArgs<ExtArgs>
    _count?: boolean | BibleVersionCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["bibleVersion"]>

  export type BibleVersionSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    fullName?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["bibleVersion"]>

  export type BibleVersionSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    fullName?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["bibleVersion"]>

  export type BibleVersionSelectScalar = {
    id?: boolean
    name?: boolean
    fullName?: boolean
    createdAt?: boolean
  }

  export type BibleVersionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "fullName" | "createdAt", ExtArgs["result"]["bibleVersion"]>
  export type BibleVersionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    books?: boolean | BibleVersion$booksArgs<ExtArgs>
    _count?: boolean | BibleVersionCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type BibleVersionIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type BibleVersionIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $BibleVersionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "BibleVersion"
    objects: {
      books: Prisma.$BookPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      fullName: string
      createdAt: Date
    }, ExtArgs["result"]["bibleVersion"]>
    composites: {}
  }

  type BibleVersionGetPayload<S extends boolean | null | undefined | BibleVersionDefaultArgs> = $Result.GetResult<Prisma.$BibleVersionPayload, S>

  type BibleVersionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BibleVersionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BibleVersionCountAggregateInputType | true
    }

  export interface BibleVersionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['BibleVersion'], meta: { name: 'BibleVersion' } }
    /**
     * Find zero or one BibleVersion that matches the filter.
     * @param {BibleVersionFindUniqueArgs} args - Arguments to find a BibleVersion
     * @example
     * // Get one BibleVersion
     * const bibleVersion = await prisma.bibleVersion.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BibleVersionFindUniqueArgs>(args: SelectSubset<T, BibleVersionFindUniqueArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "findUnique", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find one BibleVersion that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BibleVersionFindUniqueOrThrowArgs} args - Arguments to find a BibleVersion
     * @example
     * // Get one BibleVersion
     * const bibleVersion = await prisma.bibleVersion.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BibleVersionFindUniqueOrThrowArgs>(args: SelectSubset<T, BibleVersionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find the first BibleVersion that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionFindFirstArgs} args - Arguments to find a BibleVersion
     * @example
     * // Get one BibleVersion
     * const bibleVersion = await prisma.bibleVersion.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BibleVersionFindFirstArgs>(args?: SelectSubset<T, BibleVersionFindFirstArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "findFirst", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find the first BibleVersion that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionFindFirstOrThrowArgs} args - Arguments to find a BibleVersion
     * @example
     * // Get one BibleVersion
     * const bibleVersion = await prisma.bibleVersion.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BibleVersionFindFirstOrThrowArgs>(args?: SelectSubset<T, BibleVersionFindFirstOrThrowArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "findFirstOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find zero or more BibleVersions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all BibleVersions
     * const bibleVersions = await prisma.bibleVersion.findMany()
     * 
     * // Get first 10 BibleVersions
     * const bibleVersions = await prisma.bibleVersion.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const bibleVersionWithIdOnly = await prisma.bibleVersion.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BibleVersionFindManyArgs>(args?: SelectSubset<T, BibleVersionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "findMany", ClientOptions>>

    /**
     * Create a BibleVersion.
     * @param {BibleVersionCreateArgs} args - Arguments to create a BibleVersion.
     * @example
     * // Create one BibleVersion
     * const BibleVersion = await prisma.bibleVersion.create({
     *   data: {
     *     // ... data to create a BibleVersion
     *   }
     * })
     * 
     */
    create<T extends BibleVersionCreateArgs>(args: SelectSubset<T, BibleVersionCreateArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "create", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Create many BibleVersions.
     * @param {BibleVersionCreateManyArgs} args - Arguments to create many BibleVersions.
     * @example
     * // Create many BibleVersions
     * const bibleVersion = await prisma.bibleVersion.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BibleVersionCreateManyArgs>(args?: SelectSubset<T, BibleVersionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many BibleVersions and returns the data saved in the database.
     * @param {BibleVersionCreateManyAndReturnArgs} args - Arguments to create many BibleVersions.
     * @example
     * // Create many BibleVersions
     * const bibleVersion = await prisma.bibleVersion.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many BibleVersions and only return the `id`
     * const bibleVersionWithIdOnly = await prisma.bibleVersion.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BibleVersionCreateManyAndReturnArgs>(args?: SelectSubset<T, BibleVersionCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "createManyAndReturn", ClientOptions>>

    /**
     * Delete a BibleVersion.
     * @param {BibleVersionDeleteArgs} args - Arguments to delete one BibleVersion.
     * @example
     * // Delete one BibleVersion
     * const BibleVersion = await prisma.bibleVersion.delete({
     *   where: {
     *     // ... filter to delete one BibleVersion
     *   }
     * })
     * 
     */
    delete<T extends BibleVersionDeleteArgs>(args: SelectSubset<T, BibleVersionDeleteArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "delete", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Update one BibleVersion.
     * @param {BibleVersionUpdateArgs} args - Arguments to update one BibleVersion.
     * @example
     * // Update one BibleVersion
     * const bibleVersion = await prisma.bibleVersion.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BibleVersionUpdateArgs>(args: SelectSubset<T, BibleVersionUpdateArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "update", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Delete zero or more BibleVersions.
     * @param {BibleVersionDeleteManyArgs} args - Arguments to filter BibleVersions to delete.
     * @example
     * // Delete a few BibleVersions
     * const { count } = await prisma.bibleVersion.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BibleVersionDeleteManyArgs>(args?: SelectSubset<T, BibleVersionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BibleVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many BibleVersions
     * const bibleVersion = await prisma.bibleVersion.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BibleVersionUpdateManyArgs>(args: SelectSubset<T, BibleVersionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more BibleVersions and returns the data updated in the database.
     * @param {BibleVersionUpdateManyAndReturnArgs} args - Arguments to update many BibleVersions.
     * @example
     * // Update many BibleVersions
     * const bibleVersion = await prisma.bibleVersion.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more BibleVersions and only return the `id`
     * const bibleVersionWithIdOnly = await prisma.bibleVersion.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BibleVersionUpdateManyAndReturnArgs>(args: SelectSubset<T, BibleVersionUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "updateManyAndReturn", ClientOptions>>

    /**
     * Create or update one BibleVersion.
     * @param {BibleVersionUpsertArgs} args - Arguments to update or create a BibleVersion.
     * @example
     * // Update or create a BibleVersion
     * const bibleVersion = await prisma.bibleVersion.upsert({
     *   create: {
     *     // ... data to create a BibleVersion
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the BibleVersion we want to update
     *   }
     * })
     */
    upsert<T extends BibleVersionUpsertArgs>(args: SelectSubset<T, BibleVersionUpsertArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "upsert", ClientOptions>, never, ExtArgs, ClientOptions>


    /**
     * Count the number of BibleVersions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionCountArgs} args - Arguments to filter BibleVersions to count.
     * @example
     * // Count the number of BibleVersions
     * const count = await prisma.bibleVersion.count({
     *   where: {
     *     // ... the filter for the BibleVersions we want to count
     *   }
     * })
    **/
    count<T extends BibleVersionCountArgs>(
      args?: Subset<T, BibleVersionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BibleVersionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a BibleVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BibleVersionAggregateArgs>(args: Subset<T, BibleVersionAggregateArgs>): Prisma.PrismaPromise<GetBibleVersionAggregateType<T>>

    /**
     * Group by BibleVersion.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BibleVersionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BibleVersionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BibleVersionGroupByArgs['orderBy'] }
        : { orderBy?: BibleVersionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BibleVersionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBibleVersionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the BibleVersion model
   */
  readonly fields: BibleVersionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for BibleVersion.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BibleVersionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    books<T extends BibleVersion$booksArgs<ExtArgs> = {}>(args?: Subset<T, BibleVersion$booksArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findMany", ClientOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the BibleVersion model
   */ 
  interface BibleVersionFieldRefs {
    readonly id: FieldRef<"BibleVersion", 'Int'>
    readonly name: FieldRef<"BibleVersion", 'String'>
    readonly fullName: FieldRef<"BibleVersion", 'String'>
    readonly createdAt: FieldRef<"BibleVersion", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * BibleVersion findUnique
   */
  export type BibleVersionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * Filter, which BibleVersion to fetch.
     */
    where: BibleVersionWhereUniqueInput
  }

  /**
   * BibleVersion findUniqueOrThrow
   */
  export type BibleVersionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * Filter, which BibleVersion to fetch.
     */
    where: BibleVersionWhereUniqueInput
  }

  /**
   * BibleVersion findFirst
   */
  export type BibleVersionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * Filter, which BibleVersion to fetch.
     */
    where?: BibleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BibleVersions to fetch.
     */
    orderBy?: BibleVersionOrderByWithRelationInput | BibleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BibleVersions.
     */
    cursor?: BibleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BibleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BibleVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BibleVersions.
     */
    distinct?: BibleVersionScalarFieldEnum | BibleVersionScalarFieldEnum[]
  }

  /**
   * BibleVersion findFirstOrThrow
   */
  export type BibleVersionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * Filter, which BibleVersion to fetch.
     */
    where?: BibleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BibleVersions to fetch.
     */
    orderBy?: BibleVersionOrderByWithRelationInput | BibleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for BibleVersions.
     */
    cursor?: BibleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BibleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BibleVersions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of BibleVersions.
     */
    distinct?: BibleVersionScalarFieldEnum | BibleVersionScalarFieldEnum[]
  }

  /**
   * BibleVersion findMany
   */
  export type BibleVersionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * Filter, which BibleVersions to fetch.
     */
    where?: BibleVersionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of BibleVersions to fetch.
     */
    orderBy?: BibleVersionOrderByWithRelationInput | BibleVersionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing BibleVersions.
     */
    cursor?: BibleVersionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` BibleVersions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` BibleVersions.
     */
    skip?: number
    distinct?: BibleVersionScalarFieldEnum | BibleVersionScalarFieldEnum[]
  }

  /**
   * BibleVersion create
   */
  export type BibleVersionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * The data needed to create a BibleVersion.
     */
    data: XOR<BibleVersionCreateInput, BibleVersionUncheckedCreateInput>
  }

  /**
   * BibleVersion createMany
   */
  export type BibleVersionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many BibleVersions.
     */
    data: BibleVersionCreateManyInput | BibleVersionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BibleVersion createManyAndReturn
   */
  export type BibleVersionCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * The data used to create many BibleVersions.
     */
    data: BibleVersionCreateManyInput | BibleVersionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * BibleVersion update
   */
  export type BibleVersionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * The data needed to update a BibleVersion.
     */
    data: XOR<BibleVersionUpdateInput, BibleVersionUncheckedUpdateInput>
    /**
     * Choose, which BibleVersion to update.
     */
    where: BibleVersionWhereUniqueInput
  }

  /**
   * BibleVersion updateMany
   */
  export type BibleVersionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update BibleVersions.
     */
    data: XOR<BibleVersionUpdateManyMutationInput, BibleVersionUncheckedUpdateManyInput>
    /**
     * Filter which BibleVersions to update
     */
    where?: BibleVersionWhereInput
  }

  /**
   * BibleVersion updateManyAndReturn
   */
  export type BibleVersionUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * The data used to update BibleVersions.
     */
    data: XOR<BibleVersionUpdateManyMutationInput, BibleVersionUncheckedUpdateManyInput>
    /**
     * Filter which BibleVersions to update
     */
    where?: BibleVersionWhereInput
  }

  /**
   * BibleVersion upsert
   */
  export type BibleVersionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * The filter to search for the BibleVersion to update in case it exists.
     */
    where: BibleVersionWhereUniqueInput
    /**
     * In case the BibleVersion found by the `where` argument doesn't exist, create a new BibleVersion with this data.
     */
    create: XOR<BibleVersionCreateInput, BibleVersionUncheckedCreateInput>
    /**
     * In case the BibleVersion was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BibleVersionUpdateInput, BibleVersionUncheckedUpdateInput>
  }

  /**
   * BibleVersion delete
   */
  export type BibleVersionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
    /**
     * Filter which BibleVersion to delete.
     */
    where: BibleVersionWhereUniqueInput
  }

  /**
   * BibleVersion deleteMany
   */
  export type BibleVersionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which BibleVersions to delete
     */
    where?: BibleVersionWhereInput
  }

  /**
   * BibleVersion.books
   */
  export type BibleVersion$booksArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    where?: BookWhereInput
    orderBy?: BookOrderByWithRelationInput | BookOrderByWithRelationInput[]
    cursor?: BookWhereUniqueInput
    take?: number
    skip?: number
    distinct?: BookScalarFieldEnum | BookScalarFieldEnum[]
  }

  /**
   * BibleVersion without action
   */
  export type BibleVersionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the BibleVersion
     */
    select?: BibleVersionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the BibleVersion
     */
    omit?: BibleVersionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BibleVersionInclude<ExtArgs> | null
  }


  /**
   * Model Book
   */

  export type AggregateBook = {
    _count: BookCountAggregateOutputType | null
    _avg: BookAvgAggregateOutputType | null
    _sum: BookSumAggregateOutputType | null
    _min: BookMinAggregateOutputType | null
    _max: BookMaxAggregateOutputType | null
  }

  export type BookAvgAggregateOutputType = {
    id: number | null
    bookOrder: number | null
    versionId: number | null
  }

  export type BookSumAggregateOutputType = {
    id: number | null
    bookOrder: number | null
    versionId: number | null
  }

  export type BookMinAggregateOutputType = {
    id: number | null
    name: string | null
    testament: string | null
    abbr: string | null
    bookOrder: number | null
    versionId: number | null
    createdAt: Date | null
  }

  export type BookMaxAggregateOutputType = {
    id: number | null
    name: string | null
    testament: string | null
    abbr: string | null
    bookOrder: number | null
    versionId: number | null
    createdAt: Date | null
  }

  export type BookCountAggregateOutputType = {
    id: number
    name: number
    testament: number
    abbr: number
    bookOrder: number
    versionId: number
    createdAt: number
    _all: number
  }


  export type BookAvgAggregateInputType = {
    id?: true
    bookOrder?: true
    versionId?: true
  }

  export type BookSumAggregateInputType = {
    id?: true
    bookOrder?: true
    versionId?: true
  }

  export type BookMinAggregateInputType = {
    id?: true
    name?: true
    testament?: true
    abbr?: true
    bookOrder?: true
    versionId?: true
    createdAt?: true
  }

  export type BookMaxAggregateInputType = {
    id?: true
    name?: true
    testament?: true
    abbr?: true
    bookOrder?: true
    versionId?: true
    createdAt?: true
  }

  export type BookCountAggregateInputType = {
    id?: true
    name?: true
    testament?: true
    abbr?: true
    bookOrder?: true
    versionId?: true
    createdAt?: true
    _all?: true
  }

  export type BookAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Book to aggregate.
     */
    where?: BookWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Books to fetch.
     */
    orderBy?: BookOrderByWithRelationInput | BookOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: BookWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Books from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Books.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Books
    **/
    _count?: true | BookCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: BookAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: BookSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: BookMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: BookMaxAggregateInputType
  }

  export type GetBookAggregateType<T extends BookAggregateArgs> = {
        [P in keyof T & keyof AggregateBook]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateBook[P]>
      : GetScalarType<T[P], AggregateBook[P]>
  }




  export type BookGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: BookWhereInput
    orderBy?: BookOrderByWithAggregationInput | BookOrderByWithAggregationInput[]
    by: BookScalarFieldEnum[] | BookScalarFieldEnum
    having?: BookScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: BookCountAggregateInputType | true
    _avg?: BookAvgAggregateInputType
    _sum?: BookSumAggregateInputType
    _min?: BookMinAggregateInputType
    _max?: BookMaxAggregateInputType
  }

  export type BookGroupByOutputType = {
    id: number
    name: string
    testament: string
    abbr: string | null
    bookOrder: number | null
    versionId: number
    createdAt: Date
    _count: BookCountAggregateOutputType | null
    _avg: BookAvgAggregateOutputType | null
    _sum: BookSumAggregateOutputType | null
    _min: BookMinAggregateOutputType | null
    _max: BookMaxAggregateOutputType | null
  }

  type GetBookGroupByPayload<T extends BookGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<BookGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof BookGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], BookGroupByOutputType[P]>
            : GetScalarType<T[P], BookGroupByOutputType[P]>
        }
      >
    >


  export type BookSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    testament?: boolean
    abbr?: boolean
    bookOrder?: boolean
    versionId?: boolean
    createdAt?: boolean
    chapters?: boolean | Book$chaptersArgs<ExtArgs>
    version?: boolean | BibleVersionDefaultArgs<ExtArgs>
    _count?: boolean | BookCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["book"]>

  export type BookSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    testament?: boolean
    abbr?: boolean
    bookOrder?: boolean
    versionId?: boolean
    createdAt?: boolean
    version?: boolean | BibleVersionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["book"]>

  export type BookSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    testament?: boolean
    abbr?: boolean
    bookOrder?: boolean
    versionId?: boolean
    createdAt?: boolean
    version?: boolean | BibleVersionDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["book"]>

  export type BookSelectScalar = {
    id?: boolean
    name?: boolean
    testament?: boolean
    abbr?: boolean
    bookOrder?: boolean
    versionId?: boolean
    createdAt?: boolean
  }

  export type BookOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "testament" | "abbr" | "bookOrder" | "versionId" | "createdAt", ExtArgs["result"]["book"]>
  export type BookInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chapters?: boolean | Book$chaptersArgs<ExtArgs>
    version?: boolean | BibleVersionDefaultArgs<ExtArgs>
    _count?: boolean | BookCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type BookIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    version?: boolean | BibleVersionDefaultArgs<ExtArgs>
  }
  export type BookIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    version?: boolean | BibleVersionDefaultArgs<ExtArgs>
  }

  export type $BookPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Book"
    objects: {
      chapters: Prisma.$ChapterPayload<ExtArgs>[]
      version: Prisma.$BibleVersionPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      testament: string
      abbr: string | null
      bookOrder: number | null
      versionId: number
      createdAt: Date
    }, ExtArgs["result"]["book"]>
    composites: {}
  }

  type BookGetPayload<S extends boolean | null | undefined | BookDefaultArgs> = $Result.GetResult<Prisma.$BookPayload, S>

  type BookCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<BookFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: BookCountAggregateInputType | true
    }

  export interface BookDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Book'], meta: { name: 'Book' } }
    /**
     * Find zero or one Book that matches the filter.
     * @param {BookFindUniqueArgs} args - Arguments to find a Book
     * @example
     * // Get one Book
     * const book = await prisma.book.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends BookFindUniqueArgs>(args: SelectSubset<T, BookFindUniqueArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findUnique", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find one Book that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {BookFindUniqueOrThrowArgs} args - Arguments to find a Book
     * @example
     * // Get one Book
     * const book = await prisma.book.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends BookFindUniqueOrThrowArgs>(args: SelectSubset<T, BookFindUniqueOrThrowArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find the first Book that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookFindFirstArgs} args - Arguments to find a Book
     * @example
     * // Get one Book
     * const book = await prisma.book.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends BookFindFirstArgs>(args?: SelectSubset<T, BookFindFirstArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findFirst", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find the first Book that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookFindFirstOrThrowArgs} args - Arguments to find a Book
     * @example
     * // Get one Book
     * const book = await prisma.book.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends BookFindFirstOrThrowArgs>(args?: SelectSubset<T, BookFindFirstOrThrowArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findFirstOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find zero or more Books that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Books
     * const books = await prisma.book.findMany()
     * 
     * // Get first 10 Books
     * const books = await prisma.book.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const bookWithIdOnly = await prisma.book.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends BookFindManyArgs>(args?: SelectSubset<T, BookFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findMany", ClientOptions>>

    /**
     * Create a Book.
     * @param {BookCreateArgs} args - Arguments to create a Book.
     * @example
     * // Create one Book
     * const Book = await prisma.book.create({
     *   data: {
     *     // ... data to create a Book
     *   }
     * })
     * 
     */
    create<T extends BookCreateArgs>(args: SelectSubset<T, BookCreateArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "create", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Create many Books.
     * @param {BookCreateManyArgs} args - Arguments to create many Books.
     * @example
     * // Create many Books
     * const book = await prisma.book.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends BookCreateManyArgs>(args?: SelectSubset<T, BookCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Books and returns the data saved in the database.
     * @param {BookCreateManyAndReturnArgs} args - Arguments to create many Books.
     * @example
     * // Create many Books
     * const book = await prisma.book.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Books and only return the `id`
     * const bookWithIdOnly = await prisma.book.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends BookCreateManyAndReturnArgs>(args?: SelectSubset<T, BookCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "createManyAndReturn", ClientOptions>>

    /**
     * Delete a Book.
     * @param {BookDeleteArgs} args - Arguments to delete one Book.
     * @example
     * // Delete one Book
     * const Book = await prisma.book.delete({
     *   where: {
     *     // ... filter to delete one Book
     *   }
     * })
     * 
     */
    delete<T extends BookDeleteArgs>(args: SelectSubset<T, BookDeleteArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "delete", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Update one Book.
     * @param {BookUpdateArgs} args - Arguments to update one Book.
     * @example
     * // Update one Book
     * const book = await prisma.book.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends BookUpdateArgs>(args: SelectSubset<T, BookUpdateArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "update", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Delete zero or more Books.
     * @param {BookDeleteManyArgs} args - Arguments to filter Books to delete.
     * @example
     * // Delete a few Books
     * const { count } = await prisma.book.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends BookDeleteManyArgs>(args?: SelectSubset<T, BookDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Books.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Books
     * const book = await prisma.book.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends BookUpdateManyArgs>(args: SelectSubset<T, BookUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Books and returns the data updated in the database.
     * @param {BookUpdateManyAndReturnArgs} args - Arguments to update many Books.
     * @example
     * // Update many Books
     * const book = await prisma.book.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Books and only return the `id`
     * const bookWithIdOnly = await prisma.book.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends BookUpdateManyAndReturnArgs>(args: SelectSubset<T, BookUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "updateManyAndReturn", ClientOptions>>

    /**
     * Create or update one Book.
     * @param {BookUpsertArgs} args - Arguments to update or create a Book.
     * @example
     * // Update or create a Book
     * const book = await prisma.book.upsert({
     *   create: {
     *     // ... data to create a Book
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Book we want to update
     *   }
     * })
     */
    upsert<T extends BookUpsertArgs>(args: SelectSubset<T, BookUpsertArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "upsert", ClientOptions>, never, ExtArgs, ClientOptions>


    /**
     * Count the number of Books.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookCountArgs} args - Arguments to filter Books to count.
     * @example
     * // Count the number of Books
     * const count = await prisma.book.count({
     *   where: {
     *     // ... the filter for the Books we want to count
     *   }
     * })
    **/
    count<T extends BookCountArgs>(
      args?: Subset<T, BookCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], BookCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Book.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends BookAggregateArgs>(args: Subset<T, BookAggregateArgs>): Prisma.PrismaPromise<GetBookAggregateType<T>>

    /**
     * Group by Book.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {BookGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends BookGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: BookGroupByArgs['orderBy'] }
        : { orderBy?: BookGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, BookGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetBookGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Book model
   */
  readonly fields: BookFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Book.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__BookClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    chapters<T extends Book$chaptersArgs<ExtArgs> = {}>(args?: Subset<T, Book$chaptersArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findMany", ClientOptions> | Null>
    version<T extends BibleVersionDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BibleVersionDefaultArgs<ExtArgs>>): Prisma__BibleVersionClient<$Result.GetResult<Prisma.$BibleVersionPayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions> | Null, Null, ExtArgs, ClientOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Book model
   */ 
  interface BookFieldRefs {
    readonly id: FieldRef<"Book", 'Int'>
    readonly name: FieldRef<"Book", 'String'>
    readonly testament: FieldRef<"Book", 'String'>
    readonly abbr: FieldRef<"Book", 'String'>
    readonly bookOrder: FieldRef<"Book", 'Int'>
    readonly versionId: FieldRef<"Book", 'Int'>
    readonly createdAt: FieldRef<"Book", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Book findUnique
   */
  export type BookFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * Filter, which Book to fetch.
     */
    where: BookWhereUniqueInput
  }

  /**
   * Book findUniqueOrThrow
   */
  export type BookFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * Filter, which Book to fetch.
     */
    where: BookWhereUniqueInput
  }

  /**
   * Book findFirst
   */
  export type BookFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * Filter, which Book to fetch.
     */
    where?: BookWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Books to fetch.
     */
    orderBy?: BookOrderByWithRelationInput | BookOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Books.
     */
    cursor?: BookWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Books from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Books.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Books.
     */
    distinct?: BookScalarFieldEnum | BookScalarFieldEnum[]
  }

  /**
   * Book findFirstOrThrow
   */
  export type BookFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * Filter, which Book to fetch.
     */
    where?: BookWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Books to fetch.
     */
    orderBy?: BookOrderByWithRelationInput | BookOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Books.
     */
    cursor?: BookWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Books from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Books.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Books.
     */
    distinct?: BookScalarFieldEnum | BookScalarFieldEnum[]
  }

  /**
   * Book findMany
   */
  export type BookFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * Filter, which Books to fetch.
     */
    where?: BookWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Books to fetch.
     */
    orderBy?: BookOrderByWithRelationInput | BookOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Books.
     */
    cursor?: BookWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Books from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Books.
     */
    skip?: number
    distinct?: BookScalarFieldEnum | BookScalarFieldEnum[]
  }

  /**
   * Book create
   */
  export type BookCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * The data needed to create a Book.
     */
    data: XOR<BookCreateInput, BookUncheckedCreateInput>
  }

  /**
   * Book createMany
   */
  export type BookCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Books.
     */
    data: BookCreateManyInput | BookCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Book createManyAndReturn
   */
  export type BookCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * The data used to create many Books.
     */
    data: BookCreateManyInput | BookCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Book update
   */
  export type BookUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * The data needed to update a Book.
     */
    data: XOR<BookUpdateInput, BookUncheckedUpdateInput>
    /**
     * Choose, which Book to update.
     */
    where: BookWhereUniqueInput
  }

  /**
   * Book updateMany
   */
  export type BookUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Books.
     */
    data: XOR<BookUpdateManyMutationInput, BookUncheckedUpdateManyInput>
    /**
     * Filter which Books to update
     */
    where?: BookWhereInput
  }

  /**
   * Book updateManyAndReturn
   */
  export type BookUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * The data used to update Books.
     */
    data: XOR<BookUpdateManyMutationInput, BookUncheckedUpdateManyInput>
    /**
     * Filter which Books to update
     */
    where?: BookWhereInput
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Book upsert
   */
  export type BookUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * The filter to search for the Book to update in case it exists.
     */
    where: BookWhereUniqueInput
    /**
     * In case the Book found by the `where` argument doesn't exist, create a new Book with this data.
     */
    create: XOR<BookCreateInput, BookUncheckedCreateInput>
    /**
     * In case the Book was found with the provided `where` argument, update it with this data.
     */
    update: XOR<BookUpdateInput, BookUncheckedUpdateInput>
  }

  /**
   * Book delete
   */
  export type BookDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
    /**
     * Filter which Book to delete.
     */
    where: BookWhereUniqueInput
  }

  /**
   * Book deleteMany
   */
  export type BookDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Books to delete
     */
    where?: BookWhereInput
  }

  /**
   * Book.chapters
   */
  export type Book$chaptersArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    where?: ChapterWhereInput
    orderBy?: ChapterOrderByWithRelationInput | ChapterOrderByWithRelationInput[]
    cursor?: ChapterWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ChapterScalarFieldEnum | ChapterScalarFieldEnum[]
  }

  /**
   * Book without action
   */
  export type BookDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Book
     */
    select?: BookSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Book
     */
    omit?: BookOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: BookInclude<ExtArgs> | null
  }


  /**
   * Model Chapter
   */

  export type AggregateChapter = {
    _count: ChapterCountAggregateOutputType | null
    _avg: ChapterAvgAggregateOutputType | null
    _sum: ChapterSumAggregateOutputType | null
    _min: ChapterMinAggregateOutputType | null
    _max: ChapterMaxAggregateOutputType | null
  }

  export type ChapterAvgAggregateOutputType = {
    id: number | null
    number: number | null
    bookId: number | null
  }

  export type ChapterSumAggregateOutputType = {
    id: number | null
    number: number | null
    bookId: number | null
  }

  export type ChapterMinAggregateOutputType = {
    id: number | null
    number: number | null
    bookId: number | null
    createdAt: Date | null
  }

  export type ChapterMaxAggregateOutputType = {
    id: number | null
    number: number | null
    bookId: number | null
    createdAt: Date | null
  }

  export type ChapterCountAggregateOutputType = {
    id: number
    number: number
    bookId: number
    createdAt: number
    _all: number
  }


  export type ChapterAvgAggregateInputType = {
    id?: true
    number?: true
    bookId?: true
  }

  export type ChapterSumAggregateInputType = {
    id?: true
    number?: true
    bookId?: true
  }

  export type ChapterMinAggregateInputType = {
    id?: true
    number?: true
    bookId?: true
    createdAt?: true
  }

  export type ChapterMaxAggregateInputType = {
    id?: true
    number?: true
    bookId?: true
    createdAt?: true
  }

  export type ChapterCountAggregateInputType = {
    id?: true
    number?: true
    bookId?: true
    createdAt?: true
    _all?: true
  }

  export type ChapterAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Chapter to aggregate.
     */
    where?: ChapterWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Chapters to fetch.
     */
    orderBy?: ChapterOrderByWithRelationInput | ChapterOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ChapterWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Chapters from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Chapters.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Chapters
    **/
    _count?: true | ChapterCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ChapterAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ChapterSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ChapterMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ChapterMaxAggregateInputType
  }

  export type GetChapterAggregateType<T extends ChapterAggregateArgs> = {
        [P in keyof T & keyof AggregateChapter]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateChapter[P]>
      : GetScalarType<T[P], AggregateChapter[P]>
  }




  export type ChapterGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ChapterWhereInput
    orderBy?: ChapterOrderByWithAggregationInput | ChapterOrderByWithAggregationInput[]
    by: ChapterScalarFieldEnum[] | ChapterScalarFieldEnum
    having?: ChapterScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ChapterCountAggregateInputType | true
    _avg?: ChapterAvgAggregateInputType
    _sum?: ChapterSumAggregateInputType
    _min?: ChapterMinAggregateInputType
    _max?: ChapterMaxAggregateInputType
  }

  export type ChapterGroupByOutputType = {
    id: number
    number: number
    bookId: number
    createdAt: Date
    _count: ChapterCountAggregateOutputType | null
    _avg: ChapterAvgAggregateOutputType | null
    _sum: ChapterSumAggregateOutputType | null
    _min: ChapterMinAggregateOutputType | null
    _max: ChapterMaxAggregateOutputType | null
  }

  type GetChapterGroupByPayload<T extends ChapterGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ChapterGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ChapterGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ChapterGroupByOutputType[P]>
            : GetScalarType<T[P], ChapterGroupByOutputType[P]>
        }
      >
    >


  export type ChapterSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    number?: boolean
    bookId?: boolean
    createdAt?: boolean
    book?: boolean | BookDefaultArgs<ExtArgs>
    verses?: boolean | Chapter$versesArgs<ExtArgs>
    _count?: boolean | ChapterCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chapter"]>

  export type ChapterSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    number?: boolean
    bookId?: boolean
    createdAt?: boolean
    book?: boolean | BookDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chapter"]>

  export type ChapterSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    number?: boolean
    bookId?: boolean
    createdAt?: boolean
    book?: boolean | BookDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["chapter"]>

  export type ChapterSelectScalar = {
    id?: boolean
    number?: boolean
    bookId?: boolean
    createdAt?: boolean
  }

  export type ChapterOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "number" | "bookId" | "createdAt", ExtArgs["result"]["chapter"]>
  export type ChapterInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    book?: boolean | BookDefaultArgs<ExtArgs>
    verses?: boolean | Chapter$versesArgs<ExtArgs>
    _count?: boolean | ChapterCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type ChapterIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    book?: boolean | BookDefaultArgs<ExtArgs>
  }
  export type ChapterIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    book?: boolean | BookDefaultArgs<ExtArgs>
  }

  export type $ChapterPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Chapter"
    objects: {
      book: Prisma.$BookPayload<ExtArgs>
      verses: Prisma.$VersePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      number: number
      bookId: number
      createdAt: Date
    }, ExtArgs["result"]["chapter"]>
    composites: {}
  }

  type ChapterGetPayload<S extends boolean | null | undefined | ChapterDefaultArgs> = $Result.GetResult<Prisma.$ChapterPayload, S>

  type ChapterCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ChapterFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ChapterCountAggregateInputType | true
    }

  export interface ChapterDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Chapter'], meta: { name: 'Chapter' } }
    /**
     * Find zero or one Chapter that matches the filter.
     * @param {ChapterFindUniqueArgs} args - Arguments to find a Chapter
     * @example
     * // Get one Chapter
     * const chapter = await prisma.chapter.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ChapterFindUniqueArgs>(args: SelectSubset<T, ChapterFindUniqueArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findUnique", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find one Chapter that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ChapterFindUniqueOrThrowArgs} args - Arguments to find a Chapter
     * @example
     * // Get one Chapter
     * const chapter = await prisma.chapter.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ChapterFindUniqueOrThrowArgs>(args: SelectSubset<T, ChapterFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find the first Chapter that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterFindFirstArgs} args - Arguments to find a Chapter
     * @example
     * // Get one Chapter
     * const chapter = await prisma.chapter.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ChapterFindFirstArgs>(args?: SelectSubset<T, ChapterFindFirstArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findFirst", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find the first Chapter that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterFindFirstOrThrowArgs} args - Arguments to find a Chapter
     * @example
     * // Get one Chapter
     * const chapter = await prisma.chapter.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ChapterFindFirstOrThrowArgs>(args?: SelectSubset<T, ChapterFindFirstOrThrowArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findFirstOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find zero or more Chapters that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Chapters
     * const chapters = await prisma.chapter.findMany()
     * 
     * // Get first 10 Chapters
     * const chapters = await prisma.chapter.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const chapterWithIdOnly = await prisma.chapter.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ChapterFindManyArgs>(args?: SelectSubset<T, ChapterFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findMany", ClientOptions>>

    /**
     * Create a Chapter.
     * @param {ChapterCreateArgs} args - Arguments to create a Chapter.
     * @example
     * // Create one Chapter
     * const Chapter = await prisma.chapter.create({
     *   data: {
     *     // ... data to create a Chapter
     *   }
     * })
     * 
     */
    create<T extends ChapterCreateArgs>(args: SelectSubset<T, ChapterCreateArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "create", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Create many Chapters.
     * @param {ChapterCreateManyArgs} args - Arguments to create many Chapters.
     * @example
     * // Create many Chapters
     * const chapter = await prisma.chapter.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ChapterCreateManyArgs>(args?: SelectSubset<T, ChapterCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Chapters and returns the data saved in the database.
     * @param {ChapterCreateManyAndReturnArgs} args - Arguments to create many Chapters.
     * @example
     * // Create many Chapters
     * const chapter = await prisma.chapter.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Chapters and only return the `id`
     * const chapterWithIdOnly = await prisma.chapter.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends ChapterCreateManyAndReturnArgs>(args?: SelectSubset<T, ChapterCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "createManyAndReturn", ClientOptions>>

    /**
     * Delete a Chapter.
     * @param {ChapterDeleteArgs} args - Arguments to delete one Chapter.
     * @example
     * // Delete one Chapter
     * const Chapter = await prisma.chapter.delete({
     *   where: {
     *     // ... filter to delete one Chapter
     *   }
     * })
     * 
     */
    delete<T extends ChapterDeleteArgs>(args: SelectSubset<T, ChapterDeleteArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "delete", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Update one Chapter.
     * @param {ChapterUpdateArgs} args - Arguments to update one Chapter.
     * @example
     * // Update one Chapter
     * const chapter = await prisma.chapter.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ChapterUpdateArgs>(args: SelectSubset<T, ChapterUpdateArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "update", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Delete zero or more Chapters.
     * @param {ChapterDeleteManyArgs} args - Arguments to filter Chapters to delete.
     * @example
     * // Delete a few Chapters
     * const { count } = await prisma.chapter.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ChapterDeleteManyArgs>(args?: SelectSubset<T, ChapterDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Chapters.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Chapters
     * const chapter = await prisma.chapter.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ChapterUpdateManyArgs>(args: SelectSubset<T, ChapterUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Chapters and returns the data updated in the database.
     * @param {ChapterUpdateManyAndReturnArgs} args - Arguments to update many Chapters.
     * @example
     * // Update many Chapters
     * const chapter = await prisma.chapter.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Chapters and only return the `id`
     * const chapterWithIdOnly = await prisma.chapter.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends ChapterUpdateManyAndReturnArgs>(args: SelectSubset<T, ChapterUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "updateManyAndReturn", ClientOptions>>

    /**
     * Create or update one Chapter.
     * @param {ChapterUpsertArgs} args - Arguments to update or create a Chapter.
     * @example
     * // Update or create a Chapter
     * const chapter = await prisma.chapter.upsert({
     *   create: {
     *     // ... data to create a Chapter
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Chapter we want to update
     *   }
     * })
     */
    upsert<T extends ChapterUpsertArgs>(args: SelectSubset<T, ChapterUpsertArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "upsert", ClientOptions>, never, ExtArgs, ClientOptions>


    /**
     * Count the number of Chapters.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterCountArgs} args - Arguments to filter Chapters to count.
     * @example
     * // Count the number of Chapters
     * const count = await prisma.chapter.count({
     *   where: {
     *     // ... the filter for the Chapters we want to count
     *   }
     * })
    **/
    count<T extends ChapterCountArgs>(
      args?: Subset<T, ChapterCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ChapterCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Chapter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ChapterAggregateArgs>(args: Subset<T, ChapterAggregateArgs>): Prisma.PrismaPromise<GetChapterAggregateType<T>>

    /**
     * Group by Chapter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ChapterGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ChapterGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ChapterGroupByArgs['orderBy'] }
        : { orderBy?: ChapterGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ChapterGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetChapterGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Chapter model
   */
  readonly fields: ChapterFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Chapter.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ChapterClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    book<T extends BookDefaultArgs<ExtArgs> = {}>(args?: Subset<T, BookDefaultArgs<ExtArgs>>): Prisma__BookClient<$Result.GetResult<Prisma.$BookPayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions> | Null, Null, ExtArgs, ClientOptions>
    verses<T extends Chapter$versesArgs<ExtArgs> = {}>(args?: Subset<T, Chapter$versesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "findMany", ClientOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Chapter model
   */ 
  interface ChapterFieldRefs {
    readonly id: FieldRef<"Chapter", 'Int'>
    readonly number: FieldRef<"Chapter", 'Int'>
    readonly bookId: FieldRef<"Chapter", 'Int'>
    readonly createdAt: FieldRef<"Chapter", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Chapter findUnique
   */
  export type ChapterFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * Filter, which Chapter to fetch.
     */
    where: ChapterWhereUniqueInput
  }

  /**
   * Chapter findUniqueOrThrow
   */
  export type ChapterFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * Filter, which Chapter to fetch.
     */
    where: ChapterWhereUniqueInput
  }

  /**
   * Chapter findFirst
   */
  export type ChapterFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * Filter, which Chapter to fetch.
     */
    where?: ChapterWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Chapters to fetch.
     */
    orderBy?: ChapterOrderByWithRelationInput | ChapterOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Chapters.
     */
    cursor?: ChapterWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Chapters from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Chapters.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Chapters.
     */
    distinct?: ChapterScalarFieldEnum | ChapterScalarFieldEnum[]
  }

  /**
   * Chapter findFirstOrThrow
   */
  export type ChapterFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * Filter, which Chapter to fetch.
     */
    where?: ChapterWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Chapters to fetch.
     */
    orderBy?: ChapterOrderByWithRelationInput | ChapterOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Chapters.
     */
    cursor?: ChapterWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Chapters from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Chapters.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Chapters.
     */
    distinct?: ChapterScalarFieldEnum | ChapterScalarFieldEnum[]
  }

  /**
   * Chapter findMany
   */
  export type ChapterFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * Filter, which Chapters to fetch.
     */
    where?: ChapterWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Chapters to fetch.
     */
    orderBy?: ChapterOrderByWithRelationInput | ChapterOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Chapters.
     */
    cursor?: ChapterWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Chapters from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Chapters.
     */
    skip?: number
    distinct?: ChapterScalarFieldEnum | ChapterScalarFieldEnum[]
  }

  /**
   * Chapter create
   */
  export type ChapterCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * The data needed to create a Chapter.
     */
    data: XOR<ChapterCreateInput, ChapterUncheckedCreateInput>
  }

  /**
   * Chapter createMany
   */
  export type ChapterCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Chapters.
     */
    data: ChapterCreateManyInput | ChapterCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Chapter createManyAndReturn
   */
  export type ChapterCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * The data used to create many Chapters.
     */
    data: ChapterCreateManyInput | ChapterCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Chapter update
   */
  export type ChapterUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * The data needed to update a Chapter.
     */
    data: XOR<ChapterUpdateInput, ChapterUncheckedUpdateInput>
    /**
     * Choose, which Chapter to update.
     */
    where: ChapterWhereUniqueInput
  }

  /**
   * Chapter updateMany
   */
  export type ChapterUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Chapters.
     */
    data: XOR<ChapterUpdateManyMutationInput, ChapterUncheckedUpdateManyInput>
    /**
     * Filter which Chapters to update
     */
    where?: ChapterWhereInput
  }

  /**
   * Chapter updateManyAndReturn
   */
  export type ChapterUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * The data used to update Chapters.
     */
    data: XOR<ChapterUpdateManyMutationInput, ChapterUncheckedUpdateManyInput>
    /**
     * Filter which Chapters to update
     */
    where?: ChapterWhereInput
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Chapter upsert
   */
  export type ChapterUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * The filter to search for the Chapter to update in case it exists.
     */
    where: ChapterWhereUniqueInput
    /**
     * In case the Chapter found by the `where` argument doesn't exist, create a new Chapter with this data.
     */
    create: XOR<ChapterCreateInput, ChapterUncheckedCreateInput>
    /**
     * In case the Chapter was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ChapterUpdateInput, ChapterUncheckedUpdateInput>
  }

  /**
   * Chapter delete
   */
  export type ChapterDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
    /**
     * Filter which Chapter to delete.
     */
    where: ChapterWhereUniqueInput
  }

  /**
   * Chapter deleteMany
   */
  export type ChapterDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Chapters to delete
     */
    where?: ChapterWhereInput
  }

  /**
   * Chapter.verses
   */
  export type Chapter$versesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    where?: VerseWhereInput
    orderBy?: VerseOrderByWithRelationInput | VerseOrderByWithRelationInput[]
    cursor?: VerseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: VerseScalarFieldEnum | VerseScalarFieldEnum[]
  }

  /**
   * Chapter without action
   */
  export type ChapterDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Chapter
     */
    select?: ChapterSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Chapter
     */
    omit?: ChapterOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ChapterInclude<ExtArgs> | null
  }


  /**
   * Model Verse
   */

  export type AggregateVerse = {
    _count: VerseCountAggregateOutputType | null
    _avg: VerseAvgAggregateOutputType | null
    _sum: VerseSumAggregateOutputType | null
    _min: VerseMinAggregateOutputType | null
    _max: VerseMaxAggregateOutputType | null
  }

  export type VerseAvgAggregateOutputType = {
    id: number | null
    number: number | null
    chapterId: number | null
  }

  export type VerseSumAggregateOutputType = {
    id: number | null
    number: number | null
    chapterId: number | null
  }

  export type VerseMinAggregateOutputType = {
    id: number | null
    number: number | null
    text: string | null
    chapterId: number | null
    createdAt: Date | null
  }

  export type VerseMaxAggregateOutputType = {
    id: number | null
    number: number | null
    text: string | null
    chapterId: number | null
    createdAt: Date | null
  }

  export type VerseCountAggregateOutputType = {
    id: number
    number: number
    text: number
    chapterId: number
    createdAt: number
    _all: number
  }


  export type VerseAvgAggregateInputType = {
    id?: true
    number?: true
    chapterId?: true
  }

  export type VerseSumAggregateInputType = {
    id?: true
    number?: true
    chapterId?: true
  }

  export type VerseMinAggregateInputType = {
    id?: true
    number?: true
    text?: true
    chapterId?: true
    createdAt?: true
  }

  export type VerseMaxAggregateInputType = {
    id?: true
    number?: true
    text?: true
    chapterId?: true
    createdAt?: true
  }

  export type VerseCountAggregateInputType = {
    id?: true
    number?: true
    text?: true
    chapterId?: true
    createdAt?: true
    _all?: true
  }

  export type VerseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Verse to aggregate.
     */
    where?: VerseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verses to fetch.
     */
    orderBy?: VerseOrderByWithRelationInput | VerseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: VerseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Verses
    **/
    _count?: true | VerseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: VerseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: VerseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: VerseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: VerseMaxAggregateInputType
  }

  export type GetVerseAggregateType<T extends VerseAggregateArgs> = {
        [P in keyof T & keyof AggregateVerse]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateVerse[P]>
      : GetScalarType<T[P], AggregateVerse[P]>
  }




  export type VerseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: VerseWhereInput
    orderBy?: VerseOrderByWithAggregationInput | VerseOrderByWithAggregationInput[]
    by: VerseScalarFieldEnum[] | VerseScalarFieldEnum
    having?: VerseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: VerseCountAggregateInputType | true
    _avg?: VerseAvgAggregateInputType
    _sum?: VerseSumAggregateInputType
    _min?: VerseMinAggregateInputType
    _max?: VerseMaxAggregateInputType
  }

  export type VerseGroupByOutputType = {
    id: number
    number: number
    text: string
    chapterId: number
    createdAt: Date
    _count: VerseCountAggregateOutputType | null
    _avg: VerseAvgAggregateOutputType | null
    _sum: VerseSumAggregateOutputType | null
    _min: VerseMinAggregateOutputType | null
    _max: VerseMaxAggregateOutputType | null
  }

  type GetVerseGroupByPayload<T extends VerseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<VerseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof VerseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], VerseGroupByOutputType[P]>
            : GetScalarType<T[P], VerseGroupByOutputType[P]>
        }
      >
    >


  export type VerseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    number?: boolean
    text?: boolean
    chapterId?: boolean
    createdAt?: boolean
    chapter?: boolean | ChapterDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["verse"]>

  export type VerseSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    number?: boolean
    text?: boolean
    chapterId?: boolean
    createdAt?: boolean
    chapter?: boolean | ChapterDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["verse"]>

  export type VerseSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    number?: boolean
    text?: boolean
    chapterId?: boolean
    createdAt?: boolean
    chapter?: boolean | ChapterDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["verse"]>

  export type VerseSelectScalar = {
    id?: boolean
    number?: boolean
    text?: boolean
    chapterId?: boolean
    createdAt?: boolean
  }

  export type VerseOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "number" | "text" | "chapterId" | "createdAt", ExtArgs["result"]["verse"]>
  export type VerseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chapter?: boolean | ChapterDefaultArgs<ExtArgs>
  }
  export type VerseIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chapter?: boolean | ChapterDefaultArgs<ExtArgs>
  }
  export type VerseIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    chapter?: boolean | ChapterDefaultArgs<ExtArgs>
  }

  export type $VersePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Verse"
    objects: {
      chapter: Prisma.$ChapterPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      number: number
      text: string
      chapterId: number
      createdAt: Date
    }, ExtArgs["result"]["verse"]>
    composites: {}
  }

  type VerseGetPayload<S extends boolean | null | undefined | VerseDefaultArgs> = $Result.GetResult<Prisma.$VersePayload, S>

  type VerseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<VerseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: VerseCountAggregateInputType | true
    }

  export interface VerseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Verse'], meta: { name: 'Verse' } }
    /**
     * Find zero or one Verse that matches the filter.
     * @param {VerseFindUniqueArgs} args - Arguments to find a Verse
     * @example
     * // Get one Verse
     * const verse = await prisma.verse.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends VerseFindUniqueArgs>(args: SelectSubset<T, VerseFindUniqueArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "findUnique", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find one Verse that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {VerseFindUniqueOrThrowArgs} args - Arguments to find a Verse
     * @example
     * // Get one Verse
     * const verse = await prisma.verse.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends VerseFindUniqueOrThrowArgs>(args: SelectSubset<T, VerseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find the first Verse that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseFindFirstArgs} args - Arguments to find a Verse
     * @example
     * // Get one Verse
     * const verse = await prisma.verse.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends VerseFindFirstArgs>(args?: SelectSubset<T, VerseFindFirstArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "findFirst", ClientOptions> | null, null, ExtArgs, ClientOptions>

    /**
     * Find the first Verse that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseFindFirstOrThrowArgs} args - Arguments to find a Verse
     * @example
     * // Get one Verse
     * const verse = await prisma.verse.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends VerseFindFirstOrThrowArgs>(args?: SelectSubset<T, VerseFindFirstOrThrowArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "findFirstOrThrow", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Find zero or more Verses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Verses
     * const verses = await prisma.verse.findMany()
     * 
     * // Get first 10 Verses
     * const verses = await prisma.verse.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const verseWithIdOnly = await prisma.verse.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends VerseFindManyArgs>(args?: SelectSubset<T, VerseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "findMany", ClientOptions>>

    /**
     * Create a Verse.
     * @param {VerseCreateArgs} args - Arguments to create a Verse.
     * @example
     * // Create one Verse
     * const Verse = await prisma.verse.create({
     *   data: {
     *     // ... data to create a Verse
     *   }
     * })
     * 
     */
    create<T extends VerseCreateArgs>(args: SelectSubset<T, VerseCreateArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "create", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Create many Verses.
     * @param {VerseCreateManyArgs} args - Arguments to create many Verses.
     * @example
     * // Create many Verses
     * const verse = await prisma.verse.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends VerseCreateManyArgs>(args?: SelectSubset<T, VerseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Verses and returns the data saved in the database.
     * @param {VerseCreateManyAndReturnArgs} args - Arguments to create many Verses.
     * @example
     * // Create many Verses
     * const verse = await prisma.verse.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Verses and only return the `id`
     * const verseWithIdOnly = await prisma.verse.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends VerseCreateManyAndReturnArgs>(args?: SelectSubset<T, VerseCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "createManyAndReturn", ClientOptions>>

    /**
     * Delete a Verse.
     * @param {VerseDeleteArgs} args - Arguments to delete one Verse.
     * @example
     * // Delete one Verse
     * const Verse = await prisma.verse.delete({
     *   where: {
     *     // ... filter to delete one Verse
     *   }
     * })
     * 
     */
    delete<T extends VerseDeleteArgs>(args: SelectSubset<T, VerseDeleteArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "delete", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Update one Verse.
     * @param {VerseUpdateArgs} args - Arguments to update one Verse.
     * @example
     * // Update one Verse
     * const verse = await prisma.verse.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends VerseUpdateArgs>(args: SelectSubset<T, VerseUpdateArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "update", ClientOptions>, never, ExtArgs, ClientOptions>

    /**
     * Delete zero or more Verses.
     * @param {VerseDeleteManyArgs} args - Arguments to filter Verses to delete.
     * @example
     * // Delete a few Verses
     * const { count } = await prisma.verse.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends VerseDeleteManyArgs>(args?: SelectSubset<T, VerseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Verses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Verses
     * const verse = await prisma.verse.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends VerseUpdateManyArgs>(args: SelectSubset<T, VerseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Verses and returns the data updated in the database.
     * @param {VerseUpdateManyAndReturnArgs} args - Arguments to update many Verses.
     * @example
     * // Update many Verses
     * const verse = await prisma.verse.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Verses and only return the `id`
     * const verseWithIdOnly = await prisma.verse.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends VerseUpdateManyAndReturnArgs>(args: SelectSubset<T, VerseUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "updateManyAndReturn", ClientOptions>>

    /**
     * Create or update one Verse.
     * @param {VerseUpsertArgs} args - Arguments to update or create a Verse.
     * @example
     * // Update or create a Verse
     * const verse = await prisma.verse.upsert({
     *   create: {
     *     // ... data to create a Verse
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Verse we want to update
     *   }
     * })
     */
    upsert<T extends VerseUpsertArgs>(args: SelectSubset<T, VerseUpsertArgs<ExtArgs>>): Prisma__VerseClient<$Result.GetResult<Prisma.$VersePayload<ExtArgs>, T, "upsert", ClientOptions>, never, ExtArgs, ClientOptions>


    /**
     * Count the number of Verses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseCountArgs} args - Arguments to filter Verses to count.
     * @example
     * // Count the number of Verses
     * const count = await prisma.verse.count({
     *   where: {
     *     // ... the filter for the Verses we want to count
     *   }
     * })
    **/
    count<T extends VerseCountArgs>(
      args?: Subset<T, VerseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], VerseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Verse.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends VerseAggregateArgs>(args: Subset<T, VerseAggregateArgs>): Prisma.PrismaPromise<GetVerseAggregateType<T>>

    /**
     * Group by Verse.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {VerseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends VerseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: VerseGroupByArgs['orderBy'] }
        : { orderBy?: VerseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, VerseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetVerseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Verse model
   */
  readonly fields: VerseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Verse.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__VerseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, ClientOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    chapter<T extends ChapterDefaultArgs<ExtArgs> = {}>(args?: Subset<T, ChapterDefaultArgs<ExtArgs>>): Prisma__ChapterClient<$Result.GetResult<Prisma.$ChapterPayload<ExtArgs>, T, "findUniqueOrThrow", ClientOptions> | Null, Null, ExtArgs, ClientOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Verse model
   */ 
  interface VerseFieldRefs {
    readonly id: FieldRef<"Verse", 'Int'>
    readonly number: FieldRef<"Verse", 'Int'>
    readonly text: FieldRef<"Verse", 'String'>
    readonly chapterId: FieldRef<"Verse", 'Int'>
    readonly createdAt: FieldRef<"Verse", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Verse findUnique
   */
  export type VerseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * Filter, which Verse to fetch.
     */
    where: VerseWhereUniqueInput
  }

  /**
   * Verse findUniqueOrThrow
   */
  export type VerseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * Filter, which Verse to fetch.
     */
    where: VerseWhereUniqueInput
  }

  /**
   * Verse findFirst
   */
  export type VerseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * Filter, which Verse to fetch.
     */
    where?: VerseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verses to fetch.
     */
    orderBy?: VerseOrderByWithRelationInput | VerseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Verses.
     */
    cursor?: VerseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Verses.
     */
    distinct?: VerseScalarFieldEnum | VerseScalarFieldEnum[]
  }

  /**
   * Verse findFirstOrThrow
   */
  export type VerseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * Filter, which Verse to fetch.
     */
    where?: VerseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verses to fetch.
     */
    orderBy?: VerseOrderByWithRelationInput | VerseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Verses.
     */
    cursor?: VerseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Verses.
     */
    distinct?: VerseScalarFieldEnum | VerseScalarFieldEnum[]
  }

  /**
   * Verse findMany
   */
  export type VerseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * Filter, which Verses to fetch.
     */
    where?: VerseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Verses to fetch.
     */
    orderBy?: VerseOrderByWithRelationInput | VerseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Verses.
     */
    cursor?: VerseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Verses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Verses.
     */
    skip?: number
    distinct?: VerseScalarFieldEnum | VerseScalarFieldEnum[]
  }

  /**
   * Verse create
   */
  export type VerseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * The data needed to create a Verse.
     */
    data: XOR<VerseCreateInput, VerseUncheckedCreateInput>
  }

  /**
   * Verse createMany
   */
  export type VerseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Verses.
     */
    data: VerseCreateManyInput | VerseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Verse createManyAndReturn
   */
  export type VerseCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * The data used to create many Verses.
     */
    data: VerseCreateManyInput | VerseCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Verse update
   */
  export type VerseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * The data needed to update a Verse.
     */
    data: XOR<VerseUpdateInput, VerseUncheckedUpdateInput>
    /**
     * Choose, which Verse to update.
     */
    where: VerseWhereUniqueInput
  }

  /**
   * Verse updateMany
   */
  export type VerseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Verses.
     */
    data: XOR<VerseUpdateManyMutationInput, VerseUncheckedUpdateManyInput>
    /**
     * Filter which Verses to update
     */
    where?: VerseWhereInput
  }

  /**
   * Verse updateManyAndReturn
   */
  export type VerseUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * The data used to update Verses.
     */
    data: XOR<VerseUpdateManyMutationInput, VerseUncheckedUpdateManyInput>
    /**
     * Filter which Verses to update
     */
    where?: VerseWhereInput
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Verse upsert
   */
  export type VerseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * The filter to search for the Verse to update in case it exists.
     */
    where: VerseWhereUniqueInput
    /**
     * In case the Verse found by the `where` argument doesn't exist, create a new Verse with this data.
     */
    create: XOR<VerseCreateInput, VerseUncheckedCreateInput>
    /**
     * In case the Verse was found with the provided `where` argument, update it with this data.
     */
    update: XOR<VerseUpdateInput, VerseUncheckedUpdateInput>
  }

  /**
   * Verse delete
   */
  export type VerseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
    /**
     * Filter which Verse to delete.
     */
    where: VerseWhereUniqueInput
  }

  /**
   * Verse deleteMany
   */
  export type VerseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Verses to delete
     */
    where?: VerseWhereInput
  }

  /**
   * Verse without action
   */
  export type VerseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Verse
     */
    select?: VerseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Verse
     */
    omit?: VerseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: VerseInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const BibleVersionScalarFieldEnum: {
    id: 'id',
    name: 'name',
    fullName: 'fullName',
    createdAt: 'createdAt'
  };

  export type BibleVersionScalarFieldEnum = (typeof BibleVersionScalarFieldEnum)[keyof typeof BibleVersionScalarFieldEnum]


  export const BookScalarFieldEnum: {
    id: 'id',
    name: 'name',
    testament: 'testament',
    abbr: 'abbr',
    bookOrder: 'bookOrder',
    versionId: 'versionId',
    createdAt: 'createdAt'
  };

  export type BookScalarFieldEnum = (typeof BookScalarFieldEnum)[keyof typeof BookScalarFieldEnum]


  export const ChapterScalarFieldEnum: {
    id: 'id',
    number: 'number',
    bookId: 'bookId',
    createdAt: 'createdAt'
  };

  export type ChapterScalarFieldEnum = (typeof ChapterScalarFieldEnum)[keyof typeof ChapterScalarFieldEnum]


  export const VerseScalarFieldEnum: {
    id: 'id',
    number: 'number',
    text: 'text',
    chapterId: 'chapterId',
    createdAt: 'createdAt'
  };

  export type VerseScalarFieldEnum = (typeof VerseScalarFieldEnum)[keyof typeof VerseScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const BibleVersionOrderByRelevanceFieldEnum: {
    name: 'name',
    fullName: 'fullName'
  };

  export type BibleVersionOrderByRelevanceFieldEnum = (typeof BibleVersionOrderByRelevanceFieldEnum)[keyof typeof BibleVersionOrderByRelevanceFieldEnum]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const BookOrderByRelevanceFieldEnum: {
    name: 'name',
    testament: 'testament',
    abbr: 'abbr'
  };

  export type BookOrderByRelevanceFieldEnum = (typeof BookOrderByRelevanceFieldEnum)[keyof typeof BookOrderByRelevanceFieldEnum]


  export const VerseOrderByRelevanceFieldEnum: {
    text: 'text'
  };

  export type VerseOrderByRelevanceFieldEnum = (typeof VerseOrderByRelevanceFieldEnum)[keyof typeof VerseOrderByRelevanceFieldEnum]


  /**
   * Field references 
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    
  /**
   * Deep Input Types
   */


  export type BibleVersionWhereInput = {
    AND?: BibleVersionWhereInput | BibleVersionWhereInput[]
    OR?: BibleVersionWhereInput[]
    NOT?: BibleVersionWhereInput | BibleVersionWhereInput[]
    id?: IntFilter<"BibleVersion"> | number
    name?: StringFilter<"BibleVersion"> | string
    fullName?: StringFilter<"BibleVersion"> | string
    createdAt?: DateTimeFilter<"BibleVersion"> | Date | string
    books?: BookListRelationFilter
  }

  export type BibleVersionOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    books?: BookOrderByRelationAggregateInput
    _relevance?: BibleVersionOrderByRelevanceInput
  }

  export type BibleVersionWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    name?: string
    AND?: BibleVersionWhereInput | BibleVersionWhereInput[]
    OR?: BibleVersionWhereInput[]
    NOT?: BibleVersionWhereInput | BibleVersionWhereInput[]
    fullName?: StringFilter<"BibleVersion"> | string
    createdAt?: DateTimeFilter<"BibleVersion"> | Date | string
    books?: BookListRelationFilter
  }, "id" | "name">

  export type BibleVersionOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
    _count?: BibleVersionCountOrderByAggregateInput
    _avg?: BibleVersionAvgOrderByAggregateInput
    _max?: BibleVersionMaxOrderByAggregateInput
    _min?: BibleVersionMinOrderByAggregateInput
    _sum?: BibleVersionSumOrderByAggregateInput
  }

  export type BibleVersionScalarWhereWithAggregatesInput = {
    AND?: BibleVersionScalarWhereWithAggregatesInput | BibleVersionScalarWhereWithAggregatesInput[]
    OR?: BibleVersionScalarWhereWithAggregatesInput[]
    NOT?: BibleVersionScalarWhereWithAggregatesInput | BibleVersionScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"BibleVersion"> | number
    name?: StringWithAggregatesFilter<"BibleVersion"> | string
    fullName?: StringWithAggregatesFilter<"BibleVersion"> | string
    createdAt?: DateTimeWithAggregatesFilter<"BibleVersion"> | Date | string
  }

  export type BookWhereInput = {
    AND?: BookWhereInput | BookWhereInput[]
    OR?: BookWhereInput[]
    NOT?: BookWhereInput | BookWhereInput[]
    id?: IntFilter<"Book"> | number
    name?: StringFilter<"Book"> | string
    testament?: StringFilter<"Book"> | string
    abbr?: StringNullableFilter<"Book"> | string | null
    bookOrder?: IntNullableFilter<"Book"> | number | null
    versionId?: IntFilter<"Book"> | number
    createdAt?: DateTimeFilter<"Book"> | Date | string
    chapters?: ChapterListRelationFilter
    version?: XOR<BibleVersionScalarRelationFilter, BibleVersionWhereInput>
  }

  export type BookOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    testament?: SortOrder
    abbr?: SortOrderInput | SortOrder
    bookOrder?: SortOrderInput | SortOrder
    versionId?: SortOrder
    createdAt?: SortOrder
    chapters?: ChapterOrderByRelationAggregateInput
    version?: BibleVersionOrderByWithRelationInput
    _relevance?: BookOrderByRelevanceInput
  }

  export type BookWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    name_versionId?: BookNameVersionIdCompoundUniqueInput
    AND?: BookWhereInput | BookWhereInput[]
    OR?: BookWhereInput[]
    NOT?: BookWhereInput | BookWhereInput[]
    name?: StringFilter<"Book"> | string
    testament?: StringFilter<"Book"> | string
    abbr?: StringNullableFilter<"Book"> | string | null
    bookOrder?: IntNullableFilter<"Book"> | number | null
    versionId?: IntFilter<"Book"> | number
    createdAt?: DateTimeFilter<"Book"> | Date | string
    chapters?: ChapterListRelationFilter
    version?: XOR<BibleVersionScalarRelationFilter, BibleVersionWhereInput>
  }, "id" | "name_versionId">

  export type BookOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    testament?: SortOrder
    abbr?: SortOrderInput | SortOrder
    bookOrder?: SortOrderInput | SortOrder
    versionId?: SortOrder
    createdAt?: SortOrder
    _count?: BookCountOrderByAggregateInput
    _avg?: BookAvgOrderByAggregateInput
    _max?: BookMaxOrderByAggregateInput
    _min?: BookMinOrderByAggregateInput
    _sum?: BookSumOrderByAggregateInput
  }

  export type BookScalarWhereWithAggregatesInput = {
    AND?: BookScalarWhereWithAggregatesInput | BookScalarWhereWithAggregatesInput[]
    OR?: BookScalarWhereWithAggregatesInput[]
    NOT?: BookScalarWhereWithAggregatesInput | BookScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Book"> | number
    name?: StringWithAggregatesFilter<"Book"> | string
    testament?: StringWithAggregatesFilter<"Book"> | string
    abbr?: StringNullableWithAggregatesFilter<"Book"> | string | null
    bookOrder?: IntNullableWithAggregatesFilter<"Book"> | number | null
    versionId?: IntWithAggregatesFilter<"Book"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Book"> | Date | string
  }

  export type ChapterWhereInput = {
    AND?: ChapterWhereInput | ChapterWhereInput[]
    OR?: ChapterWhereInput[]
    NOT?: ChapterWhereInput | ChapterWhereInput[]
    id?: IntFilter<"Chapter"> | number
    number?: IntFilter<"Chapter"> | number
    bookId?: IntFilter<"Chapter"> | number
    createdAt?: DateTimeFilter<"Chapter"> | Date | string
    book?: XOR<BookScalarRelationFilter, BookWhereInput>
    verses?: VerseListRelationFilter
  }

  export type ChapterOrderByWithRelationInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
    createdAt?: SortOrder
    book?: BookOrderByWithRelationInput
    verses?: VerseOrderByRelationAggregateInput
  }

  export type ChapterWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    number_bookId?: ChapterNumberBookIdCompoundUniqueInput
    AND?: ChapterWhereInput | ChapterWhereInput[]
    OR?: ChapterWhereInput[]
    NOT?: ChapterWhereInput | ChapterWhereInput[]
    number?: IntFilter<"Chapter"> | number
    bookId?: IntFilter<"Chapter"> | number
    createdAt?: DateTimeFilter<"Chapter"> | Date | string
    book?: XOR<BookScalarRelationFilter, BookWhereInput>
    verses?: VerseListRelationFilter
  }, "id" | "number_bookId">

  export type ChapterOrderByWithAggregationInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
    createdAt?: SortOrder
    _count?: ChapterCountOrderByAggregateInput
    _avg?: ChapterAvgOrderByAggregateInput
    _max?: ChapterMaxOrderByAggregateInput
    _min?: ChapterMinOrderByAggregateInput
    _sum?: ChapterSumOrderByAggregateInput
  }

  export type ChapterScalarWhereWithAggregatesInput = {
    AND?: ChapterScalarWhereWithAggregatesInput | ChapterScalarWhereWithAggregatesInput[]
    OR?: ChapterScalarWhereWithAggregatesInput[]
    NOT?: ChapterScalarWhereWithAggregatesInput | ChapterScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Chapter"> | number
    number?: IntWithAggregatesFilter<"Chapter"> | number
    bookId?: IntWithAggregatesFilter<"Chapter"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Chapter"> | Date | string
  }

  export type VerseWhereInput = {
    AND?: VerseWhereInput | VerseWhereInput[]
    OR?: VerseWhereInput[]
    NOT?: VerseWhereInput | VerseWhereInput[]
    id?: IntFilter<"Verse"> | number
    number?: IntFilter<"Verse"> | number
    text?: StringFilter<"Verse"> | string
    chapterId?: IntFilter<"Verse"> | number
    createdAt?: DateTimeFilter<"Verse"> | Date | string
    chapter?: XOR<ChapterScalarRelationFilter, ChapterWhereInput>
  }

  export type VerseOrderByWithRelationInput = {
    id?: SortOrder
    number?: SortOrder
    text?: SortOrder
    chapterId?: SortOrder
    createdAt?: SortOrder
    chapter?: ChapterOrderByWithRelationInput
    _relevance?: VerseOrderByRelevanceInput
  }

  export type VerseWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: VerseWhereInput | VerseWhereInput[]
    OR?: VerseWhereInput[]
    NOT?: VerseWhereInput | VerseWhereInput[]
    number?: IntFilter<"Verse"> | number
    text?: StringFilter<"Verse"> | string
    chapterId?: IntFilter<"Verse"> | number
    createdAt?: DateTimeFilter<"Verse"> | Date | string
    chapter?: XOR<ChapterScalarRelationFilter, ChapterWhereInput>
  }, "id">

  export type VerseOrderByWithAggregationInput = {
    id?: SortOrder
    number?: SortOrder
    text?: SortOrder
    chapterId?: SortOrder
    createdAt?: SortOrder
    _count?: VerseCountOrderByAggregateInput
    _avg?: VerseAvgOrderByAggregateInput
    _max?: VerseMaxOrderByAggregateInput
    _min?: VerseMinOrderByAggregateInput
    _sum?: VerseSumOrderByAggregateInput
  }

  export type VerseScalarWhereWithAggregatesInput = {
    AND?: VerseScalarWhereWithAggregatesInput | VerseScalarWhereWithAggregatesInput[]
    OR?: VerseScalarWhereWithAggregatesInput[]
    NOT?: VerseScalarWhereWithAggregatesInput | VerseScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Verse"> | number
    number?: IntWithAggregatesFilter<"Verse"> | number
    text?: StringWithAggregatesFilter<"Verse"> | string
    chapterId?: IntWithAggregatesFilter<"Verse"> | number
    createdAt?: DateTimeWithAggregatesFilter<"Verse"> | Date | string
  }

  export type BibleVersionCreateInput = {
    name: string
    fullName: string
    createdAt?: Date | string
    books?: BookCreateNestedManyWithoutVersionInput
  }

  export type BibleVersionUncheckedCreateInput = {
    id?: number
    name: string
    fullName: string
    createdAt?: Date | string
    books?: BookUncheckedCreateNestedManyWithoutVersionInput
  }

  export type BibleVersionUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    books?: BookUpdateManyWithoutVersionNestedInput
  }

  export type BibleVersionUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    books?: BookUncheckedUpdateManyWithoutVersionNestedInput
  }

  export type BibleVersionCreateManyInput = {
    id?: number
    name: string
    fullName: string
    createdAt?: Date | string
  }

  export type BibleVersionUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BibleVersionUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BookCreateInput = {
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    createdAt?: Date | string
    chapters?: ChapterCreateNestedManyWithoutBookInput
    version: BibleVersionCreateNestedOneWithoutBooksInput
  }

  export type BookUncheckedCreateInput = {
    id?: number
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    versionId: number
    createdAt?: Date | string
    chapters?: ChapterUncheckedCreateNestedManyWithoutBookInput
  }

  export type BookUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chapters?: ChapterUpdateManyWithoutBookNestedInput
    version?: BibleVersionUpdateOneRequiredWithoutBooksNestedInput
  }

  export type BookUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    versionId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chapters?: ChapterUncheckedUpdateManyWithoutBookNestedInput
  }

  export type BookCreateManyInput = {
    id?: number
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    versionId: number
    createdAt?: Date | string
  }

  export type BookUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BookUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    versionId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChapterCreateInput = {
    number: number
    createdAt?: Date | string
    book: BookCreateNestedOneWithoutChaptersInput
    verses?: VerseCreateNestedManyWithoutChapterInput
  }

  export type ChapterUncheckedCreateInput = {
    id?: number
    number: number
    bookId: number
    createdAt?: Date | string
    verses?: VerseUncheckedCreateNestedManyWithoutChapterInput
  }

  export type ChapterUpdateInput = {
    number?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    book?: BookUpdateOneRequiredWithoutChaptersNestedInput
    verses?: VerseUpdateManyWithoutChapterNestedInput
  }

  export type ChapterUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    bookId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verses?: VerseUncheckedUpdateManyWithoutChapterNestedInput
  }

  export type ChapterCreateManyInput = {
    id?: number
    number: number
    bookId: number
    createdAt?: Date | string
  }

  export type ChapterUpdateManyMutationInput = {
    number?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChapterUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    bookId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseCreateInput = {
    number: number
    text: string
    createdAt?: Date | string
    chapter: ChapterCreateNestedOneWithoutVersesInput
  }

  export type VerseUncheckedCreateInput = {
    id?: number
    number: number
    text: string
    chapterId: number
    createdAt?: Date | string
  }

  export type VerseUpdateInput = {
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chapter?: ChapterUpdateOneRequiredWithoutVersesNestedInput
  }

  export type VerseUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    chapterId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseCreateManyInput = {
    id?: number
    number: number
    text: string
    chapterId: number
    createdAt?: Date | string
  }

  export type VerseUpdateManyMutationInput = {
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    chapterId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type BookListRelationFilter = {
    every?: BookWhereInput
    some?: BookWhereInput
    none?: BookWhereInput
  }

  export type BookOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BibleVersionOrderByRelevanceInput = {
    fields: BibleVersionOrderByRelevanceFieldEnum | BibleVersionOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type BibleVersionCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
  }

  export type BibleVersionAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type BibleVersionMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
  }

  export type BibleVersionMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    fullName?: SortOrder
    createdAt?: SortOrder
  }

  export type BibleVersionSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type ChapterListRelationFilter = {
    every?: ChapterWhereInput
    some?: ChapterWhereInput
    none?: ChapterWhereInput
  }

  export type BibleVersionScalarRelationFilter = {
    is?: BibleVersionWhereInput
    isNot?: BibleVersionWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type ChapterOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type BookOrderByRelevanceInput = {
    fields: BookOrderByRelevanceFieldEnum | BookOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type BookNameVersionIdCompoundUniqueInput = {
    name: string
    versionId: number
  }

  export type BookCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    testament?: SortOrder
    abbr?: SortOrder
    bookOrder?: SortOrder
    versionId?: SortOrder
    createdAt?: SortOrder
  }

  export type BookAvgOrderByAggregateInput = {
    id?: SortOrder
    bookOrder?: SortOrder
    versionId?: SortOrder
  }

  export type BookMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    testament?: SortOrder
    abbr?: SortOrder
    bookOrder?: SortOrder
    versionId?: SortOrder
    createdAt?: SortOrder
  }

  export type BookMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    testament?: SortOrder
    abbr?: SortOrder
    bookOrder?: SortOrder
    versionId?: SortOrder
    createdAt?: SortOrder
  }

  export type BookSumOrderByAggregateInput = {
    id?: SortOrder
    bookOrder?: SortOrder
    versionId?: SortOrder
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type BookScalarRelationFilter = {
    is?: BookWhereInput
    isNot?: BookWhereInput
  }

  export type VerseListRelationFilter = {
    every?: VerseWhereInput
    some?: VerseWhereInput
    none?: VerseWhereInput
  }

  export type VerseOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ChapterNumberBookIdCompoundUniqueInput = {
    number: number
    bookId: number
  }

  export type ChapterCountOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
    createdAt?: SortOrder
  }

  export type ChapterAvgOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
  }

  export type ChapterMaxOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
    createdAt?: SortOrder
  }

  export type ChapterMinOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
    createdAt?: SortOrder
  }

  export type ChapterSumOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    bookId?: SortOrder
  }

  export type ChapterScalarRelationFilter = {
    is?: ChapterWhereInput
    isNot?: ChapterWhereInput
  }

  export type VerseOrderByRelevanceInput = {
    fields: VerseOrderByRelevanceFieldEnum | VerseOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type VerseCountOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    text?: SortOrder
    chapterId?: SortOrder
    createdAt?: SortOrder
  }

  export type VerseAvgOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    chapterId?: SortOrder
  }

  export type VerseMaxOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    text?: SortOrder
    chapterId?: SortOrder
    createdAt?: SortOrder
  }

  export type VerseMinOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    text?: SortOrder
    chapterId?: SortOrder
    createdAt?: SortOrder
  }

  export type VerseSumOrderByAggregateInput = {
    id?: SortOrder
    number?: SortOrder
    chapterId?: SortOrder
  }

  export type BookCreateNestedManyWithoutVersionInput = {
    create?: XOR<BookCreateWithoutVersionInput, BookUncheckedCreateWithoutVersionInput> | BookCreateWithoutVersionInput[] | BookUncheckedCreateWithoutVersionInput[]
    connectOrCreate?: BookCreateOrConnectWithoutVersionInput | BookCreateOrConnectWithoutVersionInput[]
    createMany?: BookCreateManyVersionInputEnvelope
    connect?: BookWhereUniqueInput | BookWhereUniqueInput[]
  }

  export type BookUncheckedCreateNestedManyWithoutVersionInput = {
    create?: XOR<BookCreateWithoutVersionInput, BookUncheckedCreateWithoutVersionInput> | BookCreateWithoutVersionInput[] | BookUncheckedCreateWithoutVersionInput[]
    connectOrCreate?: BookCreateOrConnectWithoutVersionInput | BookCreateOrConnectWithoutVersionInput[]
    createMany?: BookCreateManyVersionInputEnvelope
    connect?: BookWhereUniqueInput | BookWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type BookUpdateManyWithoutVersionNestedInput = {
    create?: XOR<BookCreateWithoutVersionInput, BookUncheckedCreateWithoutVersionInput> | BookCreateWithoutVersionInput[] | BookUncheckedCreateWithoutVersionInput[]
    connectOrCreate?: BookCreateOrConnectWithoutVersionInput | BookCreateOrConnectWithoutVersionInput[]
    upsert?: BookUpsertWithWhereUniqueWithoutVersionInput | BookUpsertWithWhereUniqueWithoutVersionInput[]
    createMany?: BookCreateManyVersionInputEnvelope
    set?: BookWhereUniqueInput | BookWhereUniqueInput[]
    disconnect?: BookWhereUniqueInput | BookWhereUniqueInput[]
    delete?: BookWhereUniqueInput | BookWhereUniqueInput[]
    connect?: BookWhereUniqueInput | BookWhereUniqueInput[]
    update?: BookUpdateWithWhereUniqueWithoutVersionInput | BookUpdateWithWhereUniqueWithoutVersionInput[]
    updateMany?: BookUpdateManyWithWhereWithoutVersionInput | BookUpdateManyWithWhereWithoutVersionInput[]
    deleteMany?: BookScalarWhereInput | BookScalarWhereInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type BookUncheckedUpdateManyWithoutVersionNestedInput = {
    create?: XOR<BookCreateWithoutVersionInput, BookUncheckedCreateWithoutVersionInput> | BookCreateWithoutVersionInput[] | BookUncheckedCreateWithoutVersionInput[]
    connectOrCreate?: BookCreateOrConnectWithoutVersionInput | BookCreateOrConnectWithoutVersionInput[]
    upsert?: BookUpsertWithWhereUniqueWithoutVersionInput | BookUpsertWithWhereUniqueWithoutVersionInput[]
    createMany?: BookCreateManyVersionInputEnvelope
    set?: BookWhereUniqueInput | BookWhereUniqueInput[]
    disconnect?: BookWhereUniqueInput | BookWhereUniqueInput[]
    delete?: BookWhereUniqueInput | BookWhereUniqueInput[]
    connect?: BookWhereUniqueInput | BookWhereUniqueInput[]
    update?: BookUpdateWithWhereUniqueWithoutVersionInput | BookUpdateWithWhereUniqueWithoutVersionInput[]
    updateMany?: BookUpdateManyWithWhereWithoutVersionInput | BookUpdateManyWithWhereWithoutVersionInput[]
    deleteMany?: BookScalarWhereInput | BookScalarWhereInput[]
  }

  export type ChapterCreateNestedManyWithoutBookInput = {
    create?: XOR<ChapterCreateWithoutBookInput, ChapterUncheckedCreateWithoutBookInput> | ChapterCreateWithoutBookInput[] | ChapterUncheckedCreateWithoutBookInput[]
    connectOrCreate?: ChapterCreateOrConnectWithoutBookInput | ChapterCreateOrConnectWithoutBookInput[]
    createMany?: ChapterCreateManyBookInputEnvelope
    connect?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
  }

  export type BibleVersionCreateNestedOneWithoutBooksInput = {
    create?: XOR<BibleVersionCreateWithoutBooksInput, BibleVersionUncheckedCreateWithoutBooksInput>
    connectOrCreate?: BibleVersionCreateOrConnectWithoutBooksInput
    connect?: BibleVersionWhereUniqueInput
  }

  export type ChapterUncheckedCreateNestedManyWithoutBookInput = {
    create?: XOR<ChapterCreateWithoutBookInput, ChapterUncheckedCreateWithoutBookInput> | ChapterCreateWithoutBookInput[] | ChapterUncheckedCreateWithoutBookInput[]
    connectOrCreate?: ChapterCreateOrConnectWithoutBookInput | ChapterCreateOrConnectWithoutBookInput[]
    createMany?: ChapterCreateManyBookInputEnvelope
    connect?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type ChapterUpdateManyWithoutBookNestedInput = {
    create?: XOR<ChapterCreateWithoutBookInput, ChapterUncheckedCreateWithoutBookInput> | ChapterCreateWithoutBookInput[] | ChapterUncheckedCreateWithoutBookInput[]
    connectOrCreate?: ChapterCreateOrConnectWithoutBookInput | ChapterCreateOrConnectWithoutBookInput[]
    upsert?: ChapterUpsertWithWhereUniqueWithoutBookInput | ChapterUpsertWithWhereUniqueWithoutBookInput[]
    createMany?: ChapterCreateManyBookInputEnvelope
    set?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    disconnect?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    delete?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    connect?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    update?: ChapterUpdateWithWhereUniqueWithoutBookInput | ChapterUpdateWithWhereUniqueWithoutBookInput[]
    updateMany?: ChapterUpdateManyWithWhereWithoutBookInput | ChapterUpdateManyWithWhereWithoutBookInput[]
    deleteMany?: ChapterScalarWhereInput | ChapterScalarWhereInput[]
  }

  export type BibleVersionUpdateOneRequiredWithoutBooksNestedInput = {
    create?: XOR<BibleVersionCreateWithoutBooksInput, BibleVersionUncheckedCreateWithoutBooksInput>
    connectOrCreate?: BibleVersionCreateOrConnectWithoutBooksInput
    upsert?: BibleVersionUpsertWithoutBooksInput
    connect?: BibleVersionWhereUniqueInput
    update?: XOR<XOR<BibleVersionUpdateToOneWithWhereWithoutBooksInput, BibleVersionUpdateWithoutBooksInput>, BibleVersionUncheckedUpdateWithoutBooksInput>
  }

  export type ChapterUncheckedUpdateManyWithoutBookNestedInput = {
    create?: XOR<ChapterCreateWithoutBookInput, ChapterUncheckedCreateWithoutBookInput> | ChapterCreateWithoutBookInput[] | ChapterUncheckedCreateWithoutBookInput[]
    connectOrCreate?: ChapterCreateOrConnectWithoutBookInput | ChapterCreateOrConnectWithoutBookInput[]
    upsert?: ChapterUpsertWithWhereUniqueWithoutBookInput | ChapterUpsertWithWhereUniqueWithoutBookInput[]
    createMany?: ChapterCreateManyBookInputEnvelope
    set?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    disconnect?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    delete?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    connect?: ChapterWhereUniqueInput | ChapterWhereUniqueInput[]
    update?: ChapterUpdateWithWhereUniqueWithoutBookInput | ChapterUpdateWithWhereUniqueWithoutBookInput[]
    updateMany?: ChapterUpdateManyWithWhereWithoutBookInput | ChapterUpdateManyWithWhereWithoutBookInput[]
    deleteMany?: ChapterScalarWhereInput | ChapterScalarWhereInput[]
  }

  export type BookCreateNestedOneWithoutChaptersInput = {
    create?: XOR<BookCreateWithoutChaptersInput, BookUncheckedCreateWithoutChaptersInput>
    connectOrCreate?: BookCreateOrConnectWithoutChaptersInput
    connect?: BookWhereUniqueInput
  }

  export type VerseCreateNestedManyWithoutChapterInput = {
    create?: XOR<VerseCreateWithoutChapterInput, VerseUncheckedCreateWithoutChapterInput> | VerseCreateWithoutChapterInput[] | VerseUncheckedCreateWithoutChapterInput[]
    connectOrCreate?: VerseCreateOrConnectWithoutChapterInput | VerseCreateOrConnectWithoutChapterInput[]
    createMany?: VerseCreateManyChapterInputEnvelope
    connect?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
  }

  export type VerseUncheckedCreateNestedManyWithoutChapterInput = {
    create?: XOR<VerseCreateWithoutChapterInput, VerseUncheckedCreateWithoutChapterInput> | VerseCreateWithoutChapterInput[] | VerseUncheckedCreateWithoutChapterInput[]
    connectOrCreate?: VerseCreateOrConnectWithoutChapterInput | VerseCreateOrConnectWithoutChapterInput[]
    createMany?: VerseCreateManyChapterInputEnvelope
    connect?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
  }

  export type BookUpdateOneRequiredWithoutChaptersNestedInput = {
    create?: XOR<BookCreateWithoutChaptersInput, BookUncheckedCreateWithoutChaptersInput>
    connectOrCreate?: BookCreateOrConnectWithoutChaptersInput
    upsert?: BookUpsertWithoutChaptersInput
    connect?: BookWhereUniqueInput
    update?: XOR<XOR<BookUpdateToOneWithWhereWithoutChaptersInput, BookUpdateWithoutChaptersInput>, BookUncheckedUpdateWithoutChaptersInput>
  }

  export type VerseUpdateManyWithoutChapterNestedInput = {
    create?: XOR<VerseCreateWithoutChapterInput, VerseUncheckedCreateWithoutChapterInput> | VerseCreateWithoutChapterInput[] | VerseUncheckedCreateWithoutChapterInput[]
    connectOrCreate?: VerseCreateOrConnectWithoutChapterInput | VerseCreateOrConnectWithoutChapterInput[]
    upsert?: VerseUpsertWithWhereUniqueWithoutChapterInput | VerseUpsertWithWhereUniqueWithoutChapterInput[]
    createMany?: VerseCreateManyChapterInputEnvelope
    set?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    disconnect?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    delete?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    connect?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    update?: VerseUpdateWithWhereUniqueWithoutChapterInput | VerseUpdateWithWhereUniqueWithoutChapterInput[]
    updateMany?: VerseUpdateManyWithWhereWithoutChapterInput | VerseUpdateManyWithWhereWithoutChapterInput[]
    deleteMany?: VerseScalarWhereInput | VerseScalarWhereInput[]
  }

  export type VerseUncheckedUpdateManyWithoutChapterNestedInput = {
    create?: XOR<VerseCreateWithoutChapterInput, VerseUncheckedCreateWithoutChapterInput> | VerseCreateWithoutChapterInput[] | VerseUncheckedCreateWithoutChapterInput[]
    connectOrCreate?: VerseCreateOrConnectWithoutChapterInput | VerseCreateOrConnectWithoutChapterInput[]
    upsert?: VerseUpsertWithWhereUniqueWithoutChapterInput | VerseUpsertWithWhereUniqueWithoutChapterInput[]
    createMany?: VerseCreateManyChapterInputEnvelope
    set?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    disconnect?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    delete?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    connect?: VerseWhereUniqueInput | VerseWhereUniqueInput[]
    update?: VerseUpdateWithWhereUniqueWithoutChapterInput | VerseUpdateWithWhereUniqueWithoutChapterInput[]
    updateMany?: VerseUpdateManyWithWhereWithoutChapterInput | VerseUpdateManyWithWhereWithoutChapterInput[]
    deleteMany?: VerseScalarWhereInput | VerseScalarWhereInput[]
  }

  export type ChapterCreateNestedOneWithoutVersesInput = {
    create?: XOR<ChapterCreateWithoutVersesInput, ChapterUncheckedCreateWithoutVersesInput>
    connectOrCreate?: ChapterCreateOrConnectWithoutVersesInput
    connect?: ChapterWhereUniqueInput
  }

  export type ChapterUpdateOneRequiredWithoutVersesNestedInput = {
    create?: XOR<ChapterCreateWithoutVersesInput, ChapterUncheckedCreateWithoutVersesInput>
    connectOrCreate?: ChapterCreateOrConnectWithoutVersesInput
    upsert?: ChapterUpsertWithoutVersesInput
    connect?: ChapterWhereUniqueInput
    update?: XOR<XOR<ChapterUpdateToOneWithWhereWithoutVersesInput, ChapterUpdateWithoutVersesInput>, ChapterUncheckedUpdateWithoutVersesInput>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type BookCreateWithoutVersionInput = {
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    createdAt?: Date | string
    chapters?: ChapterCreateNestedManyWithoutBookInput
  }

  export type BookUncheckedCreateWithoutVersionInput = {
    id?: number
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    createdAt?: Date | string
    chapters?: ChapterUncheckedCreateNestedManyWithoutBookInput
  }

  export type BookCreateOrConnectWithoutVersionInput = {
    where: BookWhereUniqueInput
    create: XOR<BookCreateWithoutVersionInput, BookUncheckedCreateWithoutVersionInput>
  }

  export type BookCreateManyVersionInputEnvelope = {
    data: BookCreateManyVersionInput | BookCreateManyVersionInput[]
    skipDuplicates?: boolean
  }

  export type BookUpsertWithWhereUniqueWithoutVersionInput = {
    where: BookWhereUniqueInput
    update: XOR<BookUpdateWithoutVersionInput, BookUncheckedUpdateWithoutVersionInput>
    create: XOR<BookCreateWithoutVersionInput, BookUncheckedCreateWithoutVersionInput>
  }

  export type BookUpdateWithWhereUniqueWithoutVersionInput = {
    where: BookWhereUniqueInput
    data: XOR<BookUpdateWithoutVersionInput, BookUncheckedUpdateWithoutVersionInput>
  }

  export type BookUpdateManyWithWhereWithoutVersionInput = {
    where: BookScalarWhereInput
    data: XOR<BookUpdateManyMutationInput, BookUncheckedUpdateManyWithoutVersionInput>
  }

  export type BookScalarWhereInput = {
    AND?: BookScalarWhereInput | BookScalarWhereInput[]
    OR?: BookScalarWhereInput[]
    NOT?: BookScalarWhereInput | BookScalarWhereInput[]
    id?: IntFilter<"Book"> | number
    name?: StringFilter<"Book"> | string
    testament?: StringFilter<"Book"> | string
    abbr?: StringNullableFilter<"Book"> | string | null
    bookOrder?: IntNullableFilter<"Book"> | number | null
    versionId?: IntFilter<"Book"> | number
    createdAt?: DateTimeFilter<"Book"> | Date | string
  }

  export type ChapterCreateWithoutBookInput = {
    number: number
    createdAt?: Date | string
    verses?: VerseCreateNestedManyWithoutChapterInput
  }

  export type ChapterUncheckedCreateWithoutBookInput = {
    id?: number
    number: number
    createdAt?: Date | string
    verses?: VerseUncheckedCreateNestedManyWithoutChapterInput
  }

  export type ChapterCreateOrConnectWithoutBookInput = {
    where: ChapterWhereUniqueInput
    create: XOR<ChapterCreateWithoutBookInput, ChapterUncheckedCreateWithoutBookInput>
  }

  export type ChapterCreateManyBookInputEnvelope = {
    data: ChapterCreateManyBookInput | ChapterCreateManyBookInput[]
    skipDuplicates?: boolean
  }

  export type BibleVersionCreateWithoutBooksInput = {
    name: string
    fullName: string
    createdAt?: Date | string
  }

  export type BibleVersionUncheckedCreateWithoutBooksInput = {
    id?: number
    name: string
    fullName: string
    createdAt?: Date | string
  }

  export type BibleVersionCreateOrConnectWithoutBooksInput = {
    where: BibleVersionWhereUniqueInput
    create: XOR<BibleVersionCreateWithoutBooksInput, BibleVersionUncheckedCreateWithoutBooksInput>
  }

  export type ChapterUpsertWithWhereUniqueWithoutBookInput = {
    where: ChapterWhereUniqueInput
    update: XOR<ChapterUpdateWithoutBookInput, ChapterUncheckedUpdateWithoutBookInput>
    create: XOR<ChapterCreateWithoutBookInput, ChapterUncheckedCreateWithoutBookInput>
  }

  export type ChapterUpdateWithWhereUniqueWithoutBookInput = {
    where: ChapterWhereUniqueInput
    data: XOR<ChapterUpdateWithoutBookInput, ChapterUncheckedUpdateWithoutBookInput>
  }

  export type ChapterUpdateManyWithWhereWithoutBookInput = {
    where: ChapterScalarWhereInput
    data: XOR<ChapterUpdateManyMutationInput, ChapterUncheckedUpdateManyWithoutBookInput>
  }

  export type ChapterScalarWhereInput = {
    AND?: ChapterScalarWhereInput | ChapterScalarWhereInput[]
    OR?: ChapterScalarWhereInput[]
    NOT?: ChapterScalarWhereInput | ChapterScalarWhereInput[]
    id?: IntFilter<"Chapter"> | number
    number?: IntFilter<"Chapter"> | number
    bookId?: IntFilter<"Chapter"> | number
    createdAt?: DateTimeFilter<"Chapter"> | Date | string
  }

  export type BibleVersionUpsertWithoutBooksInput = {
    update: XOR<BibleVersionUpdateWithoutBooksInput, BibleVersionUncheckedUpdateWithoutBooksInput>
    create: XOR<BibleVersionCreateWithoutBooksInput, BibleVersionUncheckedCreateWithoutBooksInput>
    where?: BibleVersionWhereInput
  }

  export type BibleVersionUpdateToOneWithWhereWithoutBooksInput = {
    where?: BibleVersionWhereInput
    data: XOR<BibleVersionUpdateWithoutBooksInput, BibleVersionUncheckedUpdateWithoutBooksInput>
  }

  export type BibleVersionUpdateWithoutBooksInput = {
    name?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BibleVersionUncheckedUpdateWithoutBooksInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    fullName?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BookCreateWithoutChaptersInput = {
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    createdAt?: Date | string
    version: BibleVersionCreateNestedOneWithoutBooksInput
  }

  export type BookUncheckedCreateWithoutChaptersInput = {
    id?: number
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    versionId: number
    createdAt?: Date | string
  }

  export type BookCreateOrConnectWithoutChaptersInput = {
    where: BookWhereUniqueInput
    create: XOR<BookCreateWithoutChaptersInput, BookUncheckedCreateWithoutChaptersInput>
  }

  export type VerseCreateWithoutChapterInput = {
    number: number
    text: string
    createdAt?: Date | string
  }

  export type VerseUncheckedCreateWithoutChapterInput = {
    id?: number
    number: number
    text: string
    createdAt?: Date | string
  }

  export type VerseCreateOrConnectWithoutChapterInput = {
    where: VerseWhereUniqueInput
    create: XOR<VerseCreateWithoutChapterInput, VerseUncheckedCreateWithoutChapterInput>
  }

  export type VerseCreateManyChapterInputEnvelope = {
    data: VerseCreateManyChapterInput | VerseCreateManyChapterInput[]
    skipDuplicates?: boolean
  }

  export type BookUpsertWithoutChaptersInput = {
    update: XOR<BookUpdateWithoutChaptersInput, BookUncheckedUpdateWithoutChaptersInput>
    create: XOR<BookCreateWithoutChaptersInput, BookUncheckedCreateWithoutChaptersInput>
    where?: BookWhereInput
  }

  export type BookUpdateToOneWithWhereWithoutChaptersInput = {
    where?: BookWhereInput
    data: XOR<BookUpdateWithoutChaptersInput, BookUncheckedUpdateWithoutChaptersInput>
  }

  export type BookUpdateWithoutChaptersInput = {
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    version?: BibleVersionUpdateOneRequiredWithoutBooksNestedInput
  }

  export type BookUncheckedUpdateWithoutChaptersInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    versionId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseUpsertWithWhereUniqueWithoutChapterInput = {
    where: VerseWhereUniqueInput
    update: XOR<VerseUpdateWithoutChapterInput, VerseUncheckedUpdateWithoutChapterInput>
    create: XOR<VerseCreateWithoutChapterInput, VerseUncheckedCreateWithoutChapterInput>
  }

  export type VerseUpdateWithWhereUniqueWithoutChapterInput = {
    where: VerseWhereUniqueInput
    data: XOR<VerseUpdateWithoutChapterInput, VerseUncheckedUpdateWithoutChapterInput>
  }

  export type VerseUpdateManyWithWhereWithoutChapterInput = {
    where: VerseScalarWhereInput
    data: XOR<VerseUpdateManyMutationInput, VerseUncheckedUpdateManyWithoutChapterInput>
  }

  export type VerseScalarWhereInput = {
    AND?: VerseScalarWhereInput | VerseScalarWhereInput[]
    OR?: VerseScalarWhereInput[]
    NOT?: VerseScalarWhereInput | VerseScalarWhereInput[]
    id?: IntFilter<"Verse"> | number
    number?: IntFilter<"Verse"> | number
    text?: StringFilter<"Verse"> | string
    chapterId?: IntFilter<"Verse"> | number
    createdAt?: DateTimeFilter<"Verse"> | Date | string
  }

  export type ChapterCreateWithoutVersesInput = {
    number: number
    createdAt?: Date | string
    book: BookCreateNestedOneWithoutChaptersInput
  }

  export type ChapterUncheckedCreateWithoutVersesInput = {
    id?: number
    number: number
    bookId: number
    createdAt?: Date | string
  }

  export type ChapterCreateOrConnectWithoutVersesInput = {
    where: ChapterWhereUniqueInput
    create: XOR<ChapterCreateWithoutVersesInput, ChapterUncheckedCreateWithoutVersesInput>
  }

  export type ChapterUpsertWithoutVersesInput = {
    update: XOR<ChapterUpdateWithoutVersesInput, ChapterUncheckedUpdateWithoutVersesInput>
    create: XOR<ChapterCreateWithoutVersesInput, ChapterUncheckedCreateWithoutVersesInput>
    where?: ChapterWhereInput
  }

  export type ChapterUpdateToOneWithWhereWithoutVersesInput = {
    where?: ChapterWhereInput
    data: XOR<ChapterUpdateWithoutVersesInput, ChapterUncheckedUpdateWithoutVersesInput>
  }

  export type ChapterUpdateWithoutVersesInput = {
    number?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    book?: BookUpdateOneRequiredWithoutChaptersNestedInput
  }

  export type ChapterUncheckedUpdateWithoutVersesInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    bookId?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type BookCreateManyVersionInput = {
    id?: number
    name: string
    testament: string
    abbr?: string | null
    bookOrder?: number | null
    createdAt?: Date | string
  }

  export type BookUpdateWithoutVersionInput = {
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chapters?: ChapterUpdateManyWithoutBookNestedInput
  }

  export type BookUncheckedUpdateWithoutVersionInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    chapters?: ChapterUncheckedUpdateManyWithoutBookNestedInput
  }

  export type BookUncheckedUpdateManyWithoutVersionInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    testament?: StringFieldUpdateOperationsInput | string
    abbr?: NullableStringFieldUpdateOperationsInput | string | null
    bookOrder?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ChapterCreateManyBookInput = {
    id?: number
    number: number
    createdAt?: Date | string
  }

  export type ChapterUpdateWithoutBookInput = {
    number?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verses?: VerseUpdateManyWithoutChapterNestedInput
  }

  export type ChapterUncheckedUpdateWithoutBookInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    verses?: VerseUncheckedUpdateManyWithoutChapterNestedInput
  }

  export type ChapterUncheckedUpdateManyWithoutBookInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseCreateManyChapterInput = {
    id?: number
    number: number
    text: string
    createdAt?: Date | string
  }

  export type VerseUpdateWithoutChapterInput = {
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseUncheckedUpdateWithoutChapterInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type VerseUncheckedUpdateManyWithoutChapterInput = {
    id?: IntFieldUpdateOperationsInput | number
    number?: IntFieldUpdateOperationsInput | number
    text?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}