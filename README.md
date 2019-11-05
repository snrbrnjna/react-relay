# react-relay

This is a silly workaround to use a [fix in the relay monorepo](https://github.com/facebook/relay/pull/2883) before it gets published.

NPM can't install packages from a git repository subfolder (see [issue](https://github.com/npm/npm/issues/2974)), so we have to create this module repository to use the patched react-relay package before the fix gets published.