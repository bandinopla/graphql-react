'use strict';

const { deepStrictEqual, strictEqual, throws } = require('assert');
const { GraphQLInt } = require('graphql');
const { default: fetch } = require('node-fetch');
const React = require('react');
const ReactDOMServer = require('react-dom/server.node');
const ReactTestRenderer = require('react-test-renderer');
const revertableGlobals = require('revertable-globals');
const GraphQL = require('../../universal/GraphQL');
const GraphQLContext = require('../../universal/GraphQLContext');
const GraphQLProvider = require('../../universal/GraphQLProvider');
const useGraphQL = require('../../universal/useGraphQL');
const createGraphQLKoaApp = require('../createGraphQLKoaApp');
const listen = require('../listen');
const promisifyEvent = require('../promisifyEvent');
const sleep = require('../sleep');

const RenderUseGraphQL = (operationOptions) =>
  JSON.stringify(useGraphQL(operationOptions));

module.exports = (tests) => {
  tests.add(
    '`useGraphQL` option `loadOnMount` false (default) without initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operation1Options = {
            operation: { query: '{ a: echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey: operation1CacheKey } = graphql.operate(
            operation1Options
          );

          const operation2Options = {
            operation: { query: '{ b: echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey: operation2CacheKey } = graphql.operate(
            operation2Options
          );

          await Promise.all(Object.values(graphql.operations));

          graphql.reset();

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, operation1CacheKey);
          strictEqual(renderResult1.cacheValue, undefined);
          strictEqual(renderResult1.loadedCacheValue, undefined);

          // Second render with different props.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, operation2CacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` false (default) with initial cache for first operation',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operation1Options = {
            operation: { query: '{ a: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation1CacheKey,
            cacheValuePromise: operation1CacheValuePromise,
          } = graphql.operate(operation1Options);

          const operation2Options = {
            operation: { query: '{ b: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation2CacheKey,
            cacheValuePromise: operation2CacheValuePromise,
          } = graphql.operate(operation2Options);

          const [operation1CacheValue] = await Promise.all([
            operation1CacheValuePromise,
            operation2CacheValuePromise,
          ]);

          // Ensure only the first operation is cached.
          delete graphql.cache[operation2CacheKey];

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, operation1CacheKey);
          deepStrictEqual(renderResult1.cacheValue, operation1CacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, operation1CacheValue);

          // Second render with different props.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, operation2CacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          deepStrictEqual(renderResult1.loadedCacheValue, operation1CacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` false (default) with initial cache for both operations',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operation1Options = {
            operation: { query: '{ a: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation1CacheKey,
            cacheValuePromise: operation1CacheValuePromise,
          } = graphql.operate(operation1Options);

          const operation2Options = {
            operation: { query: '{ b: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation2CacheKey,
            cacheValuePromise: operation2CacheValuePromise,
          } = graphql.operate(operation2Options);

          const [
            operation1CacheValue,
            operation2CacheValue,
          ] = await Promise.all([
            operation1CacheValuePromise,
            operation2CacheValuePromise,
          ]);

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, operation1CacheKey);
          deepStrictEqual(renderResult1.cacheValue, operation1CacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, operation1CacheValue);

          // Second render with different props.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, operation2CacheKey);
          deepStrictEqual(renderResult2.cacheValue, operation2CacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, operation2CacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` true without initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operation1Options = {
            operation: { query: '{ a: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation1CacheKey,
            cacheValuePromise: operation1CacheValuePromise,
          } = graphql.operate(operation1Options);

          const operation2Options = {
            operation: { query: '{ b: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation2CacheKey,
            cacheValuePromise: operation2CacheValuePromise,
          } = graphql.operate(operation2Options);

          const [
            operation1CacheValue,
            operation2CacheValue,
          ] = await Promise.all([
            operation1CacheValuePromise,
            operation2CacheValuePromise,
          ]);

          graphql.reset();

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, operation1CacheKey);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, true);
          strictEqual(renderResult1.cacheKey, operation1CacheKey);
          strictEqual(renderResult1.cacheValue, undefined);
          strictEqual(renderResult1.loadedCacheValue, undefined);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Second render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, operation1CacheKey);
          deepStrictEqual(renderResult2.cacheValue, operation1CacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, operation1CacheValue);

          // Third render with different props.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, operation2CacheKey);

          const renderResult3 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult3.loading, true);
          strictEqual(renderResult3.cacheKey, operation2CacheKey);
          strictEqual(renderResult3.cacheValue, undefined);
          deepStrictEqual(renderResult3.loadedCacheValue, operation1CacheValue);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Fourth render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          const renderResult4 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult4.loading, false);
          strictEqual(renderResult4.cacheKey, operation2CacheKey);
          deepStrictEqual(renderResult4.cacheValue, operation2CacheValue);
          deepStrictEqual(renderResult4.loadedCacheValue, operation2CacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` true with initial cache for first operation',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operation1Options = {
            operation: { query: '{ a: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation1CacheKey,
            cacheValuePromise: operation1CacheValuePromise,
          } = graphql.operate(operation1Options);

          const operation2Options = {
            operation: { query: '{ b: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation2CacheKey,
            cacheValuePromise: operation2CacheValuePromise,
          } = graphql.operate(operation2Options);

          const [
            operation1CacheValue,
            operation2CacheValue,
          ] = await Promise.all([
            operation1CacheValuePromise,
            operation2CacheValuePromise,
          ]);

          // Ensure only the first operation is cached.
          delete graphql.cache[operation2CacheKey];

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, undefined);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, operation1CacheKey);
          deepStrictEqual(renderResult1.cacheValue, operation1CacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, operation1CacheValue);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Second render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, operation1CacheKey);
          deepStrictEqual(renderResult2.cacheValue, operation1CacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, operation1CacheValue);

          // Third render with different props.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, operation2CacheKey);

          const renderResult3 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult3.loading, true);
          strictEqual(renderResult3.cacheKey, operation2CacheKey);
          strictEqual(renderResult3.cacheValue, undefined);
          deepStrictEqual(renderResult3.loadedCacheValue, operation1CacheValue);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Fourth render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          const renderResult4 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult4.loading, false);
          strictEqual(renderResult4.cacheKey, operation2CacheKey);
          deepStrictEqual(renderResult4.cacheValue, operation2CacheValue);
          deepStrictEqual(renderResult4.loadedCacheValue, operation2CacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` true with initial cache for both operations',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operation1Options = {
            operation: { query: '{ a: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation1CacheKey,
            cacheValuePromise: operation1CacheValuePromise,
          } = graphql.operate(operation1Options);

          const operation2Options = {
            operation: { query: '{ b: echo }' },
            fetchOptionsOverride,
          };
          const {
            cacheKey: operation2CacheKey,
            cacheValuePromise: operation2CacheValuePromise,
          } = graphql.operate(operation2Options);

          const [
            operation1CacheValue,
            operation2CacheValue,
          ] = await Promise.all([
            operation1CacheValuePromise,
            operation2CacheValuePromise,
          ]);

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation1Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, operation1CacheKey);
          deepStrictEqual(renderResult1.cacheValue, operation1CacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, operation1CacheValue);

          // Second render with different props.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operation2Options} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, operation2CacheKey);
          deepStrictEqual(renderResult2.cacheValue, operation2CacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, operation2CacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` true with initial cache, after first render hydration period',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue = await cacheValuePromise;

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(<GraphQLProvider graphql={graphql} />);
          });

          // Exceed the 1000 ms duration considered the post SSR first render
          // hydration period.
          await sleep(1100);

          // Second render after the post SSR first render hydration period.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnMount />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, cacheKey);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, true);
          strictEqual(renderResult2.cacheKey, cacheKey);
          deepStrictEqual(renderResult2.cacheValue, cacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, cacheValue);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Third render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult3 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult3.loading, false);
          strictEqual(renderResult3.cacheKey, cacheKey);
          deepStrictEqual(renderResult3.cacheValue, cacheValue);
          deepStrictEqual(renderResult3.loadedCacheValue, cacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnMount` true with first render date context missing',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue = await cacheValuePromise;

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLContext.Provider value={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnMount />
              </GraphQLContext.Provider>
            );
          });

          strictEqual(cacheKeyFetched, cacheKey);

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, true);
          strictEqual(renderResult1.cacheKey, cacheKey);
          deepStrictEqual(renderResult1.cacheValue, cacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, cacheValue);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Second render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLContext.Provider value={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnMount />
              </GraphQLContext.Provider>
            );
          });

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, cacheKey);
          deepStrictEqual(renderResult2.cacheValue, cacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, cacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReload` false (default) without initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );

          await cacheValuePromise;

          graphql.reset();

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          strictEqual(renderResult1.cacheValue, undefined);
          strictEqual(renderResult1.loadedCacheValue, undefined);

          // Signal reload.
          graphql.reload();

          // Second render after reload was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, cacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReload` false (default) with initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        let requestCount = 0;

        const { port, close } = await listen(
          createGraphQLKoaApp({
            requestCount: {
              type: GraphQLInt,
              resolve: () => ++requestCount,
            },
          })
        );

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ requestCount }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue = await cacheValuePromise;

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          deepStrictEqual(renderResult1.cacheValue, cacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, cacheValue);

          // Signal reload.
          graphql.reload();

          // Second render after reload was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, cacheKey);
          deepStrictEqual(renderResult2.cacheValue, cacheValue);
          deepStrictEqual(renderResult2.loadedCacheValue, cacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReload` true without initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );

          await cacheValuePromise;

          graphql.reset();

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReload />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          strictEqual(renderResult1.cacheValue, undefined);
          strictEqual(renderResult1.loadedCacheValue, undefined);

          // Signal reload.
          graphql.reload();

          // Second render after reload was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReload />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, cacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReload` true with initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        let requestCount = 0;

        const { port, close } = await listen(
          createGraphQLKoaApp({
            requestCount: {
              type: GraphQLInt,
              resolve: () => ++requestCount,
            },
          })
        );

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ requestCount }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue1 = await cacheValuePromise;

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReload />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          deepStrictEqual(renderResult1.cacheValue, cacheValue1);
          deepStrictEqual(renderResult1.loadedCacheValue, cacheValue1);

          // Signal reload.
          graphql.reload();

          // Second render after reload was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReload />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, cacheKey);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, true);
          strictEqual(renderResult2.cacheKey, cacheKey);
          deepStrictEqual(renderResult2.cacheValue, cacheValue1);
          deepStrictEqual(renderResult2.loadedCacheValue, cacheValue1);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          const cacheValue2 = graphql.cache[cacheKey];

          // Third render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReload />
              </GraphQLProvider>
            );
          });

          const renderResult3 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult3.loading, false);
          strictEqual(renderResult3.cacheKey, cacheKey);
          deepStrictEqual(renderResult3.cacheValue, cacheValue2);
          deepStrictEqual(renderResult3.loadedCacheValue, cacheValue2);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReset` false (default) without initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );

          await cacheValuePromise;

          graphql.reset();

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          strictEqual(renderResult1.cacheValue, undefined);
          strictEqual(renderResult1.loadedCacheValue, undefined);

          // Signal reset.
          graphql.reset();

          // Second render after reset was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, cacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReset` false (default) with initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        let requestCount = 0;

        const { port, close } = await listen(
          createGraphQLKoaApp({
            requestCount: {
              type: GraphQLInt,
              resolve: () => ++requestCount,
            },
          })
        );

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ requestCount }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue = await cacheValuePromise;

          let fetched = false;

          graphql.on('fetch', () => {
            fetched = true;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          deepStrictEqual(renderResult1.cacheValue, cacheValue);
          deepStrictEqual(renderResult1.loadedCacheValue, cacheValue);

          // Signal reset.
          graphql.reset();

          // Second render after reset was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          strictEqual(fetched, false);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, false);
          strictEqual(renderResult2.cacheKey, cacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReset` true without initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        const { port, close } = await listen(createGraphQLKoaApp());

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ echo }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue = await cacheValuePromise;

          graphql.reset();

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReset />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          strictEqual(renderResult1.cacheValue, undefined);
          strictEqual(renderResult1.loadedCacheValue, undefined);

          // Signal reset.
          graphql.reset();

          // Second render after reset was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReset />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, cacheKey);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, true);
          strictEqual(renderResult2.cacheKey, cacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          // Third render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult3 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult3.loading, false);
          strictEqual(renderResult3.cacheKey, cacheKey);
          deepStrictEqual(renderResult3.cacheValue, cacheValue);
          deepStrictEqual(renderResult3.loadedCacheValue, cacheValue);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add(
    '`useGraphQL` option `loadOnReset` true with initial cache',
    async () => {
      const revertGlobals = revertableGlobals({ fetch });

      try {
        let requestCount = 0;

        const { port, close } = await listen(
          createGraphQLKoaApp({
            requestCount: {
              type: GraphQLInt,
              resolve: () => ++requestCount,
            },
          })
        );

        try {
          const graphql = new GraphQL();
          const fetchOptionsOverride = (options) => {
            options.url = `http://localhost:${port}`;
          };

          const operationOptions = {
            operation: { query: '{ requestCount }' },
            fetchOptionsOverride,
          };
          const { cacheKey, cacheValuePromise } = graphql.operate(
            operationOptions
          );
          const cacheValue1 = await cacheValuePromise;

          let cacheKeyFetched;

          graphql.on('fetch', ({ cacheKey }) => {
            cacheKeyFetched = cacheKey;
          });

          const testRenderer = ReactTestRenderer.create(null);

          // First render.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReset />
              </GraphQLProvider>
            );
          });

          const renderResult1 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult1.loading, false);
          strictEqual(renderResult1.cacheKey, cacheKey);
          deepStrictEqual(renderResult1.cacheValue, cacheValue1);
          deepStrictEqual(renderResult1.loadedCacheValue, cacheValue1);

          // Signal reset.
          graphql.reset();

          // Second render after reset was signaled.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} loadOnReset />
              </GraphQLProvider>
            );
          });

          strictEqual(cacheKeyFetched, cacheKey);

          const renderResult2 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult2.loading, true);
          strictEqual(renderResult2.cacheKey, cacheKey);
          strictEqual(renderResult2.cacheValue, undefined);
          strictEqual(renderResult2.loadedCacheValue, undefined);

          // Wait for loading to finish.
          await Promise.all(Object.values(graphql.operations));

          const cacheValue2 = graphql.cache[cacheKey];

          // Third render after loading finished.
          ReactTestRenderer.act(() => {
            testRenderer.update(
              <GraphQLProvider graphql={graphql}>
                <RenderUseGraphQL {...operationOptions} />
              </GraphQLProvider>
            );
          });

          const renderResult3 = JSON.parse(testRenderer.toJSON());

          strictEqual(renderResult3.loading, false);
          strictEqual(renderResult3.cacheKey, cacheKey);
          deepStrictEqual(renderResult3.cacheValue, cacheValue2);
          deepStrictEqual(renderResult3.loadedCacheValue, cacheValue2);
        } finally {
          close();
        }
      } finally {
        revertGlobals();
      }
    }
  );

  tests.add('`useGraphQL` option `reloadOnLoad` true', async () => {
    const revertGlobals = revertableGlobals({ fetch });

    try {
      const { port, close } = await listen(createGraphQLKoaApp());

      try {
        const graphql = new GraphQL();
        const reloadEvent = promisifyEvent(graphql, 'reload');
        const testRenderer = ReactTestRenderer.create(null);

        ReactTestRenderer.act(() => {
          testRenderer.update(
            <GraphQLProvider graphql={graphql}>
              <RenderUseGraphQL
                operation={{ query: '{ echo }' }}
                fetchOptionsOverride={(options) => {
                  options.url = `http://localhost:${port}`;
                }}
                loadOnMount
                reloadOnLoad
              />
            </GraphQLProvider>
          );
        });

        const renderResult = JSON.parse(testRenderer.toJSON());
        const reloadEventData = await reloadEvent;

        strictEqual(reloadEventData.exceptCacheKey, renderResult.cacheKey);
      } finally {
        close();
      }
    } finally {
      revertGlobals();
    }
  });

  tests.add('`useGraphQL` option `resetOnLoad` true', async () => {
    const revertGlobals = revertableGlobals({ fetch });

    try {
      const { port, close } = await listen(createGraphQLKoaApp());

      try {
        const graphql = new GraphQL();
        const resetEvent = promisifyEvent(graphql, 'reset');
        const testRenderer = ReactTestRenderer.create(null);

        ReactTestRenderer.act(() => {
          testRenderer.update(
            <GraphQLProvider graphql={graphql}>
              <RenderUseGraphQL
                operation={{ query: '{ echo }' }}
                fetchOptionsOverride={(options) => {
                  options.url = `http://localhost:${port}`;
                }}
                loadOnMount
                resetOnLoad
              />
            </GraphQLProvider>
          );
        });

        const renderResult = JSON.parse(testRenderer.toJSON());
        const resetEventData = await resetEvent;

        strictEqual(resetEventData.exceptCacheKey, renderResult.cacheKey);
      } finally {
        close();
      }
    } finally {
      revertGlobals();
    }
  });

  tests.add(
    '`useGraphQL` options `reloadOnLoad` and `resetOnLoad` true',
    () => {
      throws(() => {
        ReactDOMServer.renderToString(
          <GraphQLProvider graphql={new GraphQL()}>
            <RenderUseGraphQL
              operation={{ query: '' }}
              reloadOnLoad
              resetOnLoad
            />
          </GraphQLProvider>
        );
      }, new Error('useGraphQL() options “reloadOnLoad” and “resetOnLoad” can’t both be true.'));
    }
  );

  tests.add('`useGraphQL` with GraphQL context missing', () => {
    throws(() => {
      ReactDOMServer.renderToString(
        <RenderUseGraphQL operation={{ query: '' }} />
      );
    }, new Error('GraphQL context missing.'));
  });

  tests.add('`useGraphQL` with GraphQL context not a GraphQL instance', () => {
    throws(() => {
      ReactDOMServer.renderToString(
        <GraphQLContext.Provider value={false}>
          <RenderUseGraphQL operation={{ query: '' }} />
        </GraphQLContext.Provider>
      );
    }, new Error('GraphQL context must be a GraphQL instance.'));
  });
};