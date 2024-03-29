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

var React = require('react');

var _require = require('relay-runtime'),
    createRelayContext = _require.__internal.createRelayContext;

module.exports = createRelayContext(React);