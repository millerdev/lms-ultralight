const { ESLint } = require('eslint')

exports.mochaHooks = {
  afterAll: async function() {
    this.timeout(30000)
    this.slow(5000)
    const eslint = new ESLint()
    const results = await eslint.lintFiles(['src/**/*.js', 'test/**/*.js'])
    const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0)
    if (errorCount > 0) {
      const formatter = await eslint.loadFormatter('stylish')
      const output = await formatter.format(results)
      throw new Error('ESLint errors:\n' + output)
    }
  },
}
