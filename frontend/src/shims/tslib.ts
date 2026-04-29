export function __awaiter(
  thisArg: unknown,
  _arguments: unknown,
  PromiseConstructor: PromiseConstructor,
  generator: () => Generator<unknown, unknown, unknown>
) {
  function adopt(value: unknown) {
    return value instanceof PromiseConstructor ? value : new PromiseConstructor((resolve) => resolve(value));
  }

  return new PromiseConstructor((resolve, reject) => {
    const gen = generator.apply(thisArg);

    const fulfilled = (value: unknown) => {
      try {
        step(gen.next(value));
      } catch (error) {
        reject(error);
      }
    };

    const rejected = (value: unknown) => {
      try {
        step(gen.throw?.(value));
      } catch (error) {
        reject(error);
      }
    };

    const step = (result: IteratorResult<unknown, unknown> | undefined) => {
      if (!result) return resolve(undefined);
      if (result.done) return resolve(result.value);
      adopt(result.value).then(fulfilled, rejected);
    };

    step(gen.next());
  });
}

export function __rest(source: Record<PropertyKey, unknown>, excludedKeys: string[]) {
  const target: Record<PropertyKey, unknown> = {};
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key) && excludedKeys.indexOf(key) < 0) {
      target[key] = source[key];
    }
  }
  if (source != null && typeof Object.getOwnPropertySymbols === "function") {
    const symbols = Object.getOwnPropertySymbols(source);
    for (const symbol of symbols) {
      const symbolAsString = symbol as unknown as string;
      if (
        excludedKeys.indexOf(symbolAsString) < 0 &&
        Object.prototype.propertyIsEnumerable.call(source, symbol)
      ) {
        target[symbol] = source[symbol];
      }
    }
  }
  return target;
}
