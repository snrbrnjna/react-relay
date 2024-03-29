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

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var invariant = require("fbjs/lib/invariant");

var _require = require('relay-runtime'),
    isRelayModernEnvironment = _require.isRelayModernEnvironment,
    fetchQuery = _require.__internal.fetchQuery;

var ReactRelayQueryFetcher =
/*#__PURE__*/
function () {
  function ReactRelayQueryFetcher(args) {
    (0, _defineProperty2["default"])(this, "_selectionReferences", []);
    (0, _defineProperty2["default"])(this, "_callOnDataChangeWhenSet", false);

    if (args != null) {
      this._cacheSelectionReference = args.cacheSelectionReference;
      this._selectionReferences = args.selectionReferences;
    }
  }

  var _proto = ReactRelayQueryFetcher.prototype;

  _proto.getSelectionReferences = function getSelectionReferences() {
    return {
      cacheSelectionReference: this._cacheSelectionReference,
      selectionReferences: this._selectionReferences
    };
  };

  _proto.lookupInStore = function lookupInStore(environment, operation, fetchPolicy) {
    if (fetchPolicy === 'store-and-network' || fetchPolicy === 'store-or-network') {
      if (environment.check(operation.root)) {
        this._retainCachedOperation(environment, operation);

        return environment.lookup(operation.fragment);
      }
    }

    return null;
  };

  _proto.execute = function execute(_ref) {
    var _this = this;

    var environment = _ref.environment,
        operation = _ref.operation,
        cacheConfig = _ref.cacheConfig,
        _ref$preservePrevious = _ref.preservePreviousReferences,
        preservePreviousReferences = _ref$preservePrevious === void 0 ? false : _ref$preservePrevious;
    var reference = environment.retain(operation.root);
    var fetchQueryOptions = cacheConfig != null ? {
      networkCacheConfig: cacheConfig
    } : {};

    var error = function error() {
      // We may have partially fulfilled the request, so let the next request
      // or the unmount dispose of the references.
      _this._selectionReferences = _this._selectionReferences.concat(reference);
    };

    var complete = function complete() {
      if (!preservePreviousReferences) {
        _this.disposeSelectionReferences();
      }

      _this._selectionReferences = _this._selectionReferences.concat(reference);
    };

    var unsubscribe = function unsubscribe() {
      // Let the next request or the unmount code dispose of the references.
      // We may have partially fulfilled the request.
      _this._selectionReferences = _this._selectionReferences.concat(reference);
    };

    if (!isRelayModernEnvironment(environment)) {
      return environment.execute({
        operation: operation,
        cacheConfig: cacheConfig
      })["do"]({
        error: error,
        complete: complete,
        unsubscribe: unsubscribe
      });
    }

    return fetchQuery(environment, operation, fetchQueryOptions)["do"]({
      error: error,
      complete: complete,
      unsubscribe: unsubscribe
    });
  };

  _proto.setOnDataChange = function setOnDataChange(onDataChange) {
    !this._fetchOptions ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayQueryFetcher: `setOnDataChange` should have been called after having called `fetch`') : invariant(false) : void 0;

    if (typeof onDataChange === 'function') {
      // Mutate the most recent fetchOptions in place,
      // So that in-progress requests can access the updated callback.
      this._fetchOptions.onDataChangeCallbacks = this._fetchOptions.onDataChangeCallbacks || [];

      this._fetchOptions.onDataChangeCallbacks.push(onDataChange);

      if (this._callOnDataChangeWhenSet) {
        // We don't reset '_callOnDataChangeWhenSet' because another callback may be set
        if (this._error != null) {
          onDataChange({
            error: this._error
          });
        } else if (this._snapshot != null) {
          onDataChange({
            snapshot: this._snapshot
          });
        }
      }
    }
  }
  /**
   * `fetch` fetches the data for the given operation.
   * If a result is immediately available synchronously, it will be synchronously
   * returned by this function.
   *
   * Otherwise, the fetched result will be communicated via the `onDataChange` callback.
   * `onDataChange` will be called with the first result (**if it wasn't returned synchronously**),
   * and then subsequently whenever the data changes.
   */
  ;

  _proto.fetch = function fetch(fetchOptions, cacheConfigOverride) {
    var _this2 = this;

    var _cacheConfigOverride;

    var cacheConfig = fetchOptions.cacheConfig,
        environment = fetchOptions.environment,
        operation = fetchOptions.operation,
        onDataChange = fetchOptions.onDataChange;
    var fetchHasReturned = false;

    var _error;

    this.disposeRequest();
    var oldOnDataChangeCallbacks = this._fetchOptions && this._fetchOptions.onDataChangeCallbacks;
    this._fetchOptions = {
      cacheConfig: cacheConfig,
      environment: environment,
      onDataChangeCallbacks: oldOnDataChangeCallbacks || [],
      operation: operation
    };

    if (onDataChange && this._fetchOptions.onDataChangeCallbacks.indexOf(onDataChange) === -1) {
      this._fetchOptions.onDataChangeCallbacks.push(onDataChange);
    }

    var request = this.execute({
      environment: environment,
      operation: operation,
      cacheConfig: (_cacheConfigOverride = cacheConfigOverride) !== null && _cacheConfigOverride !== void 0 ? _cacheConfigOverride : cacheConfig
    })["finally"](function () {
      _this2._pendingRequest = null;
    }).subscribe({
      next: function next() {
        // If we received a response,
        // Make a note that to notify the callback when it's later added.
        _this2._callOnDataChangeWhenSet = true;
        _this2._error = null; // Only notify of the first result if `next` is being called **asynchronously**
        // (i.e. after `fetch` has returned).

        _this2._onQueryDataAvailable({
          notifyFirstResult: fetchHasReturned
        });
      },
      error: function error(err) {
        // If we received a response when we didn't have a change callback,
        // Make a note that to notify the callback when it's later added.
        _this2._callOnDataChangeWhenSet = true;
        _this2._error = err;
        _this2._snapshot = null;
        var onDataChangeCallbacks = _this2._fetchOptions && _this2._fetchOptions.onDataChangeCallbacks; // Only notify of error if `error` is being called **asynchronously**
        // (i.e. after `fetch` has returned).

        if (fetchHasReturned) {
          if (onDataChangeCallbacks) {
            onDataChangeCallbacks.forEach(function (onDataChange) {
              onDataChange({
                error: err
              });
            });
          }
        } else {
          _error = err;
        }
      }
    });
    this._pendingRequest = {
      dispose: function dispose() {
        request.unsubscribe();
      }
    };
    fetchHasReturned = true;

    if (_error) {
      throw _error;
    }

    return this._snapshot;
  };

  _proto.retry = function retry(cacheConfigOverride) {
    !this._fetchOptions ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayQueryFetcher: `retry` should be called after having called `fetch`') : invariant(false) : void 0;
    return this.fetch({
      cacheConfig: this._fetchOptions.cacheConfig,
      environment: this._fetchOptions.environment,
      operation: this._fetchOptions.operation,
      onDataChange: null // If there are onDataChangeCallbacks they will be reused

    }, cacheConfigOverride);
  };

  _proto.dispose = function dispose() {
    this.disposeRequest();
    this.disposeSelectionReferences();
  };

  _proto.disposeRequest = function disposeRequest() {
    this._error = null;
    this._snapshot = null; // order is important, dispose of pendingFetch before selectionReferences

    if (this._pendingRequest) {
      this._pendingRequest.dispose();
    }

    if (this._rootSubscription) {
      this._rootSubscription.dispose();

      this._rootSubscription = null;
    }
  };

  _proto._retainCachedOperation = function _retainCachedOperation(environment, operation) {
    this._disposeCacheSelectionReference();

    this._cacheSelectionReference = environment.retain(operation.root);
  };

  _proto._disposeCacheSelectionReference = function _disposeCacheSelectionReference() {
    this._cacheSelectionReference && this._cacheSelectionReference.dispose();
    this._cacheSelectionReference = null;
  };

  _proto.disposeSelectionReferences = function disposeSelectionReferences() {
    this._disposeCacheSelectionReference();

    this._selectionReferences.forEach(function (r) {
      return r.dispose();
    });

    this._selectionReferences = [];
  };

  _proto._onQueryDataAvailable = function _onQueryDataAvailable(_ref2) {
    var _this3 = this;

    var notifyFirstResult = _ref2.notifyFirstResult;
    !this._fetchOptions ? process.env.NODE_ENV !== "production" ? invariant(false, 'ReactRelayQueryFetcher: `_onQueryDataAvailable` should have been called after having called `fetch`') : invariant(false) : void 0;
    var _this$_fetchOptions = this._fetchOptions,
        environment = _this$_fetchOptions.environment,
        onDataChangeCallbacks = _this$_fetchOptions.onDataChangeCallbacks,
        operation = _this$_fetchOptions.operation; // `_onQueryDataAvailable` can be called synchronously the first time and can be called
    // multiple times by network layers that support data subscriptions.
    // Wait until the first payload to call `onDataChange` and subscribe for data updates.

    if (this._snapshot) {
      return;
    }

    this._snapshot = environment.lookup(operation.fragment); // Subscribe to changes in the data of the root fragment

    this._rootSubscription = environment.subscribe(this._snapshot, function (snapshot) {
      // Read from this._fetchOptions in case onDataChange() was lazily added.
      if (_this3._fetchOptions != null) {
        var maybeNewOnDataChangeCallbacks = _this3._fetchOptions.onDataChangeCallbacks;

        if (Array.isArray(maybeNewOnDataChangeCallbacks)) {
          maybeNewOnDataChangeCallbacks.forEach(function (onDataChange) {
            return onDataChange({
              snapshot: snapshot
            });
          });
        }
      }
    });

    if (this._snapshot && notifyFirstResult && Array.isArray(onDataChangeCallbacks)) {
      var snapshot = this._snapshot;
      onDataChangeCallbacks.forEach(function (onDataChange) {
        return onDataChange({
          snapshot: snapshot
        });
      });
    }
  };

  return ReactRelayQueryFetcher;
}();

module.exports = ReactRelayQueryFetcher;