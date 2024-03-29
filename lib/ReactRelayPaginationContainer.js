/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * 
 * @format
 */
'use strict';

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _extends2 = _interopRequireDefault(require("@babel/runtime/helpers/extends"));

var _objectWithoutPropertiesLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/objectWithoutPropertiesLoose"));

var _assertThisInitialized2 = _interopRequireDefault(require("@babel/runtime/helpers/assertThisInitialized"));

var _inheritsLoose2 = _interopRequireDefault(require("@babel/runtime/helpers/inheritsLoose"));

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var React = require('react');

var ReactRelayContext = require('./ReactRelayContext');

var ReactRelayQueryFetcher = require('./ReactRelayQueryFetcher');

var areEqual = require("fbjs/lib/areEqual");

var buildReactRelayContainer = require('./buildReactRelayContainer');

var getRootVariablesForFragments = require('./getRootVariablesForFragments');

var invariant = require("fbjs/lib/invariant");

var warning = require("fbjs/lib/warning");

var _require = require('./ReactRelayContainerUtils'),
    getComponentName = _require.getComponentName,
    getContainerName = _require.getContainerName;

var _require2 = require('./RelayContext'),
    assertRelayContext = _require2.assertRelayContext;

var _require3 = require('relay-runtime'),
    ConnectionInterface = _require3.ConnectionInterface,
    Observable = _require3.Observable,
    createFragmentSpecResolver = _require3.createFragmentSpecResolver,
    createOperationDescriptor = _require3.createOperationDescriptor,
    getDataIDsFromObject = _require3.getDataIDsFromObject,
    getRequest = _require3.getRequest,
    getSelector = _require3.getSelector,
    getVariablesFromObject = _require3.getVariablesFromObject,
    isScalarAndEqual = _require3.isScalarAndEqual;

var FORWARD = 'forward';

/**
 * Extends the functionality of RelayFragmentContainer by providing a mechanism
 * to load more data from a connection.
 *
 * # Configuring a PaginationContainer
 *
 * PaginationContainer accepts the standard FragmentContainer arguments and an
 * additional `connectionConfig` argument:
 *
 * - `Component`: the component to be wrapped/rendered.
 * - `fragments`: an object whose values are `graphql` fragments. The object
 *   keys determine the prop names by which fragment data is available.
 * - `connectionConfig`: an object that determines how to load more connection
 *   data. Details below.
 *
 * # Loading More Data
 *
 * Use `props.relay.hasMore()` to determine if there are more items to load.
 *
 * ```
 * hasMore(): boolean
 * ```
 *
 * Use `props.relay.isLoading()` to determine if a previous call to `loadMore()`
 * is still pending. This is convenient for avoiding duplicate load calls.
 *
 * ```
 * isLoading(): boolean
 * ```
 *
 * Use `props.relay.loadMore()` to load more items. This will return null if
 * there are no more items to fetch, otherwise it will fetch more items and
 * return a Disposable that can be used to cancel the fetch.
 *
 * `pageSize` should be the number of *additional* items to fetch (not the
 * total).
 *
 * ```
 * loadMore(pageSize: number, callback: ?(error: ?Error) => void): ?Disposable
 * ```
 *
 * A complete example:
 *
 * ```
 * class Foo extends React.Component {
 *   ...
 *   _onEndReached() {
 *     if (!this.props.relay.hasMore() || this.props.relay.isLoading()) {
 *       return;
 *     }
 *     this.props.relay.loadMore(10);
 *   }
 *   ...
 * }
 * ```
 *
 * # Connection Config
 *
 * Here's an example, followed by details of each config property:
 *
 * ```
 * ReactRelayPaginationContainer.createContainer(
 *   Component,
 *   {
 *     user: graphql`fragment FriendsFragment on User {
 *       friends(after: $afterCursor first: $count) @connection {
 *         edges { ... }
 *         pageInfo {
 *           startCursor
 *           endCursor
 *           hasNextPage
 *           hasPreviousPage
 *         }
 *       }
 *     }`,
 *   },
 *   {
 *     direction: 'forward',
 *     getConnectionFromProps(props) {
 *       return props.user && props.user.friends;
 *     },
 *     getFragmentVariables(vars, totalCount) {
 *       // The component presumably wants *all* edges, not just those after
 *       // the cursor, so notice that we don't set $afterCursor here.
 *       return {
 *         ...vars,
 *         count: totalCount,
 *       };
 *     },
 *     getVariables(props, {count, cursor}, fragmentVariables) {
 *       return {
 *         id: props.user.id,
 *         afterCursor: cursor,
 *         count,
 *       },
 *     },
 *     query: graphql`
 *       query FriendsQuery($id: ID!, $afterCursor: ID, $count: Int!) {
 *         node(id: $id) {
 *           ...FriendsFragment
 *         }
 *       }
 *     `,
 *   }
 * );
 * ```
 *
 * ## Config Properties
 *
 * - `direction`: Either "forward" to indicate forward pagination using
 *   after/first, or "backward" to indicate backward pagination using
 *   before/last.
 * - `getConnectionFromProps(props)`: PaginationContainer doesn't magically know
 *   which connection data you mean to fetch more of (a container might fetch
 *   multiple connections, but can only paginate one of them). This function is
 *   given the fragment props only (not full props), and should return the
 *   connection data. See the above example that returns the friends data via
 *   `props.user.friends`.
 * - `getFragmentVariables(previousVars, totalCount)`: Given the previous variables
 *   and the new total number of items, get the variables to use when reading
 *   your fragments. Typically this means setting whatever your local "count"
 *   variable is to the value of `totalCount`. See the example.
 * - `getVariables(props, {count, cursor})`: Get the variables to use when
 *   fetching the pagination `query`. You may determine the root object id from
 *   props (see the example that uses `props.user.id`) and may also set whatever
 *   variables you use for the after/first/before/last calls based on the count
 *   and cursor.
 * - `query`: A query to use when fetching more connection data. This should
 *   typically reference one of the container's fragment (as in the example)
 *   to ensure that all the necessary fields for sub-components are fetched.
 */
function createGetConnectionFromProps(metadata) {
  var path = metadata.path;
  !path ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Unable to synthesize a ' + 'getConnectionFromProps function.') : invariant(false) : void 0;
  return function (props) {
    var data = props[metadata.fragmentName];

    for (var i = 0; i < path.length; i++) {
      if (!data || typeof data !== 'object') {
        return null;
      }

      data = data[path[i]];
    }

    return data;
  };
}

function createGetFragmentVariables(metadata) {
  var countVariable = metadata.count;
  !countVariable ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Unable to synthesize a ' + 'getFragmentVariables function.') : invariant(false) : void 0;
  return function (prevVars, totalCount) {
    return _objectSpread({}, prevVars, (0, _defineProperty2["default"])({}, countVariable, totalCount));
  };
}

function findConnectionMetadata(fragments) {
  var foundConnectionMetadata = null;
  var isRelayModern = false;

  for (var fragmentName in fragments) {
    var fragment = fragments[fragmentName];
    var connectionMetadata = fragment.metadata && fragment.metadata.connection; // HACK: metadata is always set to `undefined` in classic. In modern, even
    // if empty, it is set to null (never undefined). We use that knowlege to
    // check if we're dealing with classic or modern

    if (fragment.metadata !== undefined) {
      isRelayModern = true;
    }

    if (connectionMetadata) {
      !(connectionMetadata.length === 1) ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Only a single @connection is ' + 'supported, `%s` has %s.', fragmentName, connectionMetadata.length) : invariant(false) : void 0;
      !!foundConnectionMetadata ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Only a single fragment with ' + '@connection is supported.') : invariant(false) : void 0;
      foundConnectionMetadata = _objectSpread({}, connectionMetadata[0], {
        fragmentName: fragmentName
      });
    }
  }

  !(!isRelayModern || foundConnectionMetadata !== null) ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: A @connection directive must be present.') : invariant(false) : void 0;
  return foundConnectionMetadata || {};
}

function toObserver(observerOrCallback) {
  return typeof observerOrCallback === 'function' ? {
    error: observerOrCallback,
    complete: observerOrCallback,
    unsubscribe: function unsubscribe(subscription) {
      typeof observerOrCallback === 'function' && observerOrCallback();
    }
  } : observerOrCallback || {};
}

function createContainerWithFragments(Component, fragments, connectionConfig) {
  var _class, _temp;

  var componentName = getComponentName(Component);
  var containerName = getContainerName(Component);
  var metadata = findConnectionMetadata(fragments);
  var getConnectionFromProps = connectionConfig.getConnectionFromProps || createGetConnectionFromProps(metadata);
  var direction = connectionConfig.direction || metadata.direction;
  !direction ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Unable to infer direction of the ' + 'connection, possibly because both first and last are provided.') : invariant(false) : void 0;
  var getFragmentVariables = connectionConfig.getFragmentVariables || createGetFragmentVariables(metadata);
  return _temp = _class =
  /*#__PURE__*/
  function (_React$Component) {
    (0, _inheritsLoose2["default"])(_class, _React$Component);

    function _class(props) {
      var _this;

      _this = _React$Component.call(this, props) || this;
      (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "_handleFragmentDataUpdate", function () {
        _this.setState({
          data: _this._resolver.resolve()
        });
      });
      (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "_hasMore", function () {
        var connectionData = _this._getConnectionData();

        return !!(connectionData && connectionData.hasMore && connectionData.cursor);
      });
      (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "_isLoading", function () {
        return !!_this._refetchSubscription;
      });
      (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "_refetchConnection", function (totalCount, observerOrCallback, refetchVariables) {
        if (!_this._canFetchPage('refetchConnection')) {
          return {
            dispose: function dispose() {}
          };
        }

        _this._refetchVariables = refetchVariables;
        var paginatingVariables = {
          count: totalCount,
          cursor: null,
          totalCount: totalCount
        };

        var fetch = _this._fetchPage(paginatingVariables, toObserver(observerOrCallback), {
          force: true
        });

        return {
          dispose: fetch.unsubscribe
        };
      });
      (0, _defineProperty2["default"])((0, _assertThisInitialized2["default"])(_this), "_loadMore", function (pageSize, observerOrCallback, options) {
        if (!_this._canFetchPage('loadMore')) {
          return {
            dispose: function dispose() {}
          };
        }

        var observer = toObserver(observerOrCallback);

        var connectionData = _this._getConnectionData();

        if (!connectionData) {
          Observable.create(function (sink) {
            return sink.complete();
          }).subscribe(observer);
          return null;
        }

        var totalCount = connectionData.edgeCount + pageSize;

        if (options && options.force) {
          return _this._refetchConnection(totalCount, observerOrCallback);
        }

        var _ConnectionInterface$ = ConnectionInterface.get(),
            END_CURSOR = _ConnectionInterface$.END_CURSOR,
            START_CURSOR = _ConnectionInterface$.START_CURSOR;

        var cursor = connectionData.cursor;
        process.env.NODE_ENV !== "production" ? warning(cursor != null && cursor !== '', 'ReactRelayPaginationContainer: Cannot `loadMore` without valid `%s` (got `%s`)', direction === FORWARD ? END_CURSOR : START_CURSOR, cursor) : void 0;
        var paginatingVariables = {
          count: pageSize,
          cursor: cursor,
          totalCount: totalCount
        };

        var fetch = _this._fetchPage(paginatingVariables, observer, options);

        return {
          dispose: fetch.unsubscribe
        };
      });
      var relayContext = assertRelayContext(props.__relayContext);
      _this._isARequestInFlight = false;
      _this._refetchSubscription = null;
      _this._refetchVariables = null;
      _this._resolver = createFragmentSpecResolver(relayContext, containerName, fragments, props, _this._handleFragmentDataUpdate);
      _this.state = {
        data: _this._resolver.resolve(),
        prevContext: relayContext,
        contextForChildren: relayContext,
        relayProp: _this._buildRelayProp(relayContext)
      };
      _this._isUnmounted = false;
      _this._hasFetched = false;
      return _this;
    }
    /**
     * When new props are received, read data for the new props and subscribe
     * for updates. Props may be the same in which case previous data and
     * subscriptions can be reused.
     */


    var _proto = _class.prototype;

    _proto.UNSAFE_componentWillReceiveProps = function UNSAFE_componentWillReceiveProps(nextProps) {
      var relayContext = assertRelayContext(nextProps.__relayContext);
      var prevIDs = getDataIDsFromObject(fragments, this.props);
      var nextIDs = getDataIDsFromObject(fragments, nextProps);
      var prevRootVariables = getRootVariablesForFragments(fragments, this.props);
      var nextRootVariables = getRootVariablesForFragments(fragments, nextProps); // If the environment has changed or props point to new records then
      // previously fetched data and any pending fetches no longer apply:
      // - Existing references are on the old environment.
      // - Existing references are based on old variables.
      // - Pending fetches are for the previous records.

      if (relayContext.environment !== this.state.prevContext.environment || !areEqual(prevRootVariables, nextRootVariables) || !areEqual(prevIDs, nextIDs)) {
        this._cleanup(); // Child containers rely on context.relay being mutated (for gDSFP).


        this._resolver = createFragmentSpecResolver(relayContext, containerName, fragments, nextProps, this._handleFragmentDataUpdate);
        this.setState({
          prevContext: relayContext,
          contextForChildren: relayContext,
          relayProp: this._buildRelayProp(relayContext)
        });
      } else if (!this._hasFetched) {
        this._resolver.setProps(nextProps);
      }

      var data = this._resolver.resolve();

      if (data !== this.state.data) {
        this.setState({
          data: data
        });
      }
    };

    _proto.componentWillUnmount = function componentWillUnmount() {
      this._isUnmounted = true;

      this._cleanup();
    };

    _proto.shouldComponentUpdate = function shouldComponentUpdate(nextProps, nextState) {
      // Short-circuit if any Relay-related data has changed
      if (nextState.data !== this.state.data || nextState.relayProp !== this.state.relayProp) {
        return true;
      } // Otherwise, for convenience short-circuit if all non-Relay props
      // are scalar and equal


      var keys = Object.keys(nextProps);

      for (var ii = 0; ii < keys.length; ii++) {
        var _key = keys[ii];

        if (_key === '__relayContext') {
          if (nextState.prevContext.environment !== this.state.prevContext.environment) {
            return true;
          }
        } else {
          if (!fragments.hasOwnProperty(_key) && !isScalarAndEqual(nextProps[_key], this.props[_key])) {
            return true;
          }
        }
      }

      return false;
    };

    _proto._buildRelayProp = function _buildRelayProp(relayContext) {
      return {
        hasMore: this._hasMore,
        isLoading: this._isLoading,
        loadMore: this._loadMore,
        refetchConnection: this._refetchConnection,
        environment: relayContext.environment
      };
    }
    /**
     * Render new data for the existing props/context.
     */
    ;

    _proto._getConnectionData = function _getConnectionData() {
      // Extract connection data and verify there are more edges to fetch
      var _this$props = this.props,
          _ = _this$props.componentRef,
          restProps = (0, _objectWithoutPropertiesLoose2["default"])(_this$props, ["componentRef"]);

      var props = _objectSpread({}, restProps, {}, this.state.data);

      var connectionData = getConnectionFromProps(props);

      if (connectionData == null) {
        return null;
      }

      var _ConnectionInterface$2 = ConnectionInterface.get(),
          EDGES = _ConnectionInterface$2.EDGES,
          PAGE_INFO = _ConnectionInterface$2.PAGE_INFO,
          HAS_NEXT_PAGE = _ConnectionInterface$2.HAS_NEXT_PAGE,
          HAS_PREV_PAGE = _ConnectionInterface$2.HAS_PREV_PAGE,
          END_CURSOR = _ConnectionInterface$2.END_CURSOR,
          START_CURSOR = _ConnectionInterface$2.START_CURSOR;

      !(typeof connectionData === 'object') ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Expected `getConnectionFromProps()` in `%s`' + 'to return `null` or a plain object with %s and %s properties, got `%s`.', componentName, EDGES, PAGE_INFO, connectionData) : invariant(false) : void 0;
      var edges = connectionData[EDGES];
      var pageInfo = connectionData[PAGE_INFO];

      if (edges == null || pageInfo == null) {
        return null;
      }

      !Array.isArray(edges) ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Expected `getConnectionFromProps()` in `%s`' + 'to return an object with %s: Array, got `%s`.', componentName, EDGES, edges) : invariant(false) : void 0;
      !(typeof pageInfo === 'object') ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Expected `getConnectionFromProps()` in `%s`' + 'to return an object with %s: Object, got `%s`.', componentName, PAGE_INFO, pageInfo) : invariant(false) : void 0;
      var hasMore = direction === FORWARD ? pageInfo[HAS_NEXT_PAGE] : pageInfo[HAS_PREV_PAGE];
      var cursor = direction === FORWARD ? pageInfo[END_CURSOR] : pageInfo[START_CURSOR];

      if (typeof hasMore !== 'boolean' || edges.length !== 0 && typeof cursor === 'undefined') {
        process.env.NODE_ENV !== "production" ? warning(false, 'ReactRelayPaginationContainer: Cannot paginate without %s fields in `%s`. ' + 'Be sure to fetch %s (got `%s`) and %s (got `%s`).', PAGE_INFO, componentName, direction === FORWARD ? HAS_NEXT_PAGE : HAS_PREV_PAGE, hasMore, direction === FORWARD ? END_CURSOR : START_CURSOR, cursor) : void 0;
        return null;
      }

      return {
        cursor: cursor,
        edgeCount: edges.length,
        hasMore: hasMore
      };
    };

    _proto._getQueryFetcher = function _getQueryFetcher() {
      if (!this._queryFetcher) {
        this._queryFetcher = new ReactRelayQueryFetcher();
      }

      return this._queryFetcher;
    };

    _proto._canFetchPage = function _canFetchPage(method) {
      if (this._isUnmounted) {
        process.env.NODE_ENV !== "production" ? warning(false, 'ReactRelayPaginationContainer: Unexpected call of `%s` ' + 'on unmounted container `%s`. It looks like some instances ' + 'of your container still trying to fetch data but they already ' + 'unmounted. Please make sure you clear all timers, intervals, async ' + 'calls, etc that may trigger `%s` call.', method, containerName, method) : void 0;
        return false;
      }

      return true;
    };

    _proto._fetchPage = function _fetchPage(paginatingVariables, observer, options) {
      var _this2 = this;

      var _assertRelayContext = assertRelayContext(this.props.__relayContext),
          environment = _assertRelayContext.environment;

      var _this$props2 = this.props,
          _ = _this$props2.componentRef,
          __relayContext = _this$props2.__relayContext,
          restProps = (0, _objectWithoutPropertiesLoose2["default"])(_this$props2, ["componentRef", "__relayContext"]);

      var props = _objectSpread({}, restProps, {}, this.state.data);

      var fragmentVariables;
      var rootVariables = getRootVariablesForFragments(fragments, restProps);
      fragmentVariables = getVariablesFromObject(fragments, restProps);
      fragmentVariables = _objectSpread({}, rootVariables, {}, fragmentVariables, {}, this._refetchVariables);
      var fetchVariables = connectionConfig.getVariables(props, {
        count: paginatingVariables.count,
        cursor: paginatingVariables.cursor
      }, fragmentVariables);
      !(typeof fetchVariables === 'object' && fetchVariables !== null) ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayPaginationContainer: Expected `getVariables()` to ' + 'return an object, got `%s` in `%s`.', fetchVariables, componentName) : invariant(false) : void 0;
      fetchVariables = _objectSpread({}, fetchVariables, {}, this._refetchVariables);
      fragmentVariables = _objectSpread({}, fetchVariables, {}, fragmentVariables);
      var cacheConfig = options ? {
        force: !!options.force
      } : undefined;

      if (cacheConfig != null && (options === null || options === void 0 ? void 0 : options.metadata) != null) {
        cacheConfig.metadata = options === null || options === void 0 ? void 0 : options.metadata;
      }

      var request = getRequest(connectionConfig.query);
      var operation = createOperationDescriptor(request, fetchVariables);
      var refetchSubscription = null;

      if (this._refetchSubscription) {
        this._refetchSubscription.unsubscribe();
      }

      this._hasFetched = true;

      var onNext = function onNext(payload, complete) {
        var prevData = _this2._resolver.resolve();

        _this2._resolver.setVariables(getFragmentVariables(fragmentVariables, paginatingVariables.totalCount), operation.request.node);

        var nextData = _this2._resolver.resolve(); // Workaround slightly different handling for connection in different
        // core implementations:
        // - Classic core requires the count to be explicitly incremented
        // - Modern core automatically appends new items, updating the count
        //   isn't required to see new data.
        //
        // `setState` is only required if changing the variables would change the
        // resolved data.
        // TODO #14894725: remove PaginationContainer equal check


        if (!areEqual(prevData, nextData)) {
          _this2.setState({
            data: nextData,
            contextForChildren: {
              environment: _this2.props.__relayContext.environment
            }
          }, complete);
        } else {
          complete();
        }
      };

      var cleanup = function cleanup() {
        if (_this2._refetchSubscription === refetchSubscription) {
          _this2._refetchSubscription = null;
          _this2._isARequestInFlight = false;
        }
      };

      this._isARequestInFlight = true;
      refetchSubscription = this._getQueryFetcher().execute({
        environment: environment,
        operation: operation,
        cacheConfig: cacheConfig,
        preservePreviousReferences: true
      }).mergeMap(function (payload) {
        return Observable.create(function (sink) {
          onNext(payload, function () {
            sink.next(); // pass void to public observer's `next`

            sink.complete();
          });
        });
      }) // use do instead of finally so that observer's `complete` fires after cleanup
      ["do"]({
        error: cleanup,
        complete: cleanup,
        unsubscribe: cleanup
      }).subscribe(observer || {});
      this._refetchSubscription = this._isARequestInFlight ? refetchSubscription : null;
      return refetchSubscription;
    };

    _proto._cleanup = function _cleanup() {
      this._resolver.dispose();

      this._refetchVariables = null;
      this._hasFetched = false;

      if (this._refetchSubscription) {
        this._refetchSubscription.unsubscribe();

        this._refetchSubscription = null;
        this._isARequestInFlight = false;
      }

      if (this._queryFetcher) {
        this._queryFetcher.dispose();
      }
    };

    _proto.render = function render() {
      var _this$props3 = this.props,
          componentRef = _this$props3.componentRef,
          __relayContext = _this$props3.__relayContext,
          props = (0, _objectWithoutPropertiesLoose2["default"])(_this$props3, ["componentRef", "__relayContext"]);
      return React.createElement(ReactRelayContext.Provider, {
        value: this.state.contextForChildren
      }, React.createElement(Component, (0, _extends2["default"])({}, props, this.state.data, {
        ref: componentRef,
        relay: this.state.relayProp
      })));
    };

    return _class;
  }(React.Component), (0, _defineProperty2["default"])(_class, "displayName", containerName), _temp;
}
/**
 * Wrap the basic `createContainer()` function with logic to adapt to the
 * `context.relay.environment` in which it is rendered. Specifically, the
 * extraction of the environment-specific version of fragments in the
 * `fragmentSpec` is memoized once per environment, rather than once per
 * instance of the container constructed/rendered.
 */


function createContainer(Component, fragmentSpec, connectionConfig) {
  return buildReactRelayContainer(Component, fragmentSpec, function (ComponentClass, fragments) {
    return createContainerWithFragments(ComponentClass, fragments, connectionConfig);
  });
}

module.exports = {
  createContainer: createContainer
};