function noop() {
  return null
}

require.extensions['.css'] = noop
require.extensions['.styl'] = noop
require.extensions['.scss'] = noop
require.extensions['.png'] = noop
