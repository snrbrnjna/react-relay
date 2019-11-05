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

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { (0, _defineProperty2["default"])(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

var _require = require('relay-runtime'),
    getSelector = _require.getSelector;

function getRootVariablesForFragments(fragments, props) {
  var rootVariables = {}; // NOTE: For extra safety, we make sure the rootVariables include the
  // variables from all owners in this fragmentSpec, even though they
  // should all point to the same owner

  Object.keys(fragments).forEach(function (key) {
    var _ref, _selector$selectors$, _ref2;

    var fragmentNode = fragments[key];
    var fragmentRef = props[key];
    var selector = getSelector(fragmentNode, fragmentRef);
    var fragmentOwnerVariables = selector != null && selector.kind === 'PluralReaderSelector' ? (_ref = (_selector$selectors$ = selector.selectors[0]) === null || _selector$selectors$ === void 0 ? void 0 : _selector$selectors$.owner.variables) !== null && _ref !== void 0 ? _ref : {} : (_ref2 = selector === null || selector === void 0 ? void 0 : selector.owner.variables) !== null && _ref2 !== void 0 ? _ref2 : {};
    rootVariables = _objectSpread({}, rootVariables, {}, fragmentOwnerVariables);
  });
  return rootVariables;
}

module.exports = getRootVariablesForFragments;