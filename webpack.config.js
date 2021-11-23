'use strict'

const path = require('path')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')

const DEVELOPMENT = 'development'
const PRODUCTION = 'production'
const DEV_MODE = process.env.NODE_ENV !== PRODUCTION
const DEV_HOST = 'localhost'
const DEV_PORT = 3000
const DEV_TOOL = DEV_MODE ? 'source-map' : 'cheap-module-source-map'
const BASE_PATH = DEV_MODE ? '/' : '/ultralight/'
const REMOTE_LMS_URL = process.env.LMS_URL


/*############## PLUGINS ##############*/

let plugins = [
  new webpack.EnvironmentPlugin(["LMS_URL"]), // bash: export LMS_URL=http://lms_host_ip:9000
  new CopyPlugin({patterns: [{from: "src/static"}]}),
  new HTMLWebpackPlugin({
    filename: 'index.html',
    showErrors: !DEV_MODE,
    template: 'src/index.html',
    inject: 'body',
    basePath: BASE_PATH,
  }),
  new MiniCssExtractPlugin(),
  new ESLintPlugin({ failOnWarning: !DEV_MODE }),
]

if (DEV_MODE) {
  process.env.LMS_URL = `http://${DEV_HOST}:${DEV_PORT}/lms`
} else {
  plugins = plugins.concat([
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.optimize.MinChunkSizePlugin({minChunkSize: 5000}),
  ])
}


/*############## LOADERS ##############*/

const rules = [
  {
    test: /\.css$/,
    use: [
      "style-loader",
      "css-loader",
    ],
  },
  {
    test: /\.styl$/,
    use: [
      "style-loader",
      "css-loader",
      "stylus-loader",
    ],
  },
  {
    test: /\.font\.js$/,
    use: [
      "style-loader",
      "css-loader",
      "fontgen-loader",
    ],
  },
  {
    test: /\.js$/,
    use: ["babel-loader"],  // see .babelrc for options
    include: path.join(__dirname, 'src'),
  },
  {
    test: /\.(woff2?|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/inline',
  },
  {
    test: /\.(gif|jpg|jpeg|png)$/,
    type: 'asset/inline',
  },
]

/*############## OPTIONS ##############*/

module.exports = {
  mode: process.env.NODE_ENV || DEVELOPMENT,
  devtool: DEV_TOOL,
  devServer: {
    host: DEV_HOST,
    port: DEV_PORT,
    hot: true,
    proxy: {
      '/lms': {
        target: REMOTE_LMS_URL,
        pathRewrite: {'^/lms' : ''},
      },
      '/favicon.ico': REMOTE_LMS_URL,
    },
    client: {overlay: {errors: true, warnings: false}},
  },
  target: 'web',
  optimization: {
    runtimeChunk: {name: "manifest"},
  },
  output: {
    publicPath: BASE_PATH,
  },
  plugins: plugins,
  module: {rules: rules},
  resolve: {
    modules: [
      path.join(__dirname, "src"),
      "node_modules",
    ],
  },
}
