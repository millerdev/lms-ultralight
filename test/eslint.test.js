const lint = require('mocha-eslint')

const paths = [
  'src/**/*.js',
  'test/**/*.js',
]

const options = {
  slow: 500,
  strict: true,
}

lint(paths, options)
