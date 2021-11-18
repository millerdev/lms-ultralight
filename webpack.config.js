'use strict'

const path = require('path')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const ESLintPlugin = require('eslint-webpack-plugin')
const HTMLWebpackPlugin = require('html-webpack-plugin')

const DEVELOPMENT = 'development'
const PRODUCTION = 'production'

const DEBUG = process.env.NODE_ENV !== PRODUCTION
const BASE_PATH = DEBUG ? '/' : '/ultralight/'

// change 'eval' to 'source-map' for nicer debugging (and slower rebuilds)
const devtool = DEBUG ? 'source-map' : 'cheap-module-source-map'


/*############## PLUGINS ##############*/

let plugins = [
  new webpack.EnvironmentPlugin(["LMS_URL"]), // bash: export LMS_URL=http://lms_host_ip:9000
  new CopyPlugin({patterns: [{from: "src/static"}]}),
  // this plugin injects your resources to the index file
  new HTMLWebpackPlugin({
    filename: 'index.html',
    showErrors: !DEBUG,
    template: 'src/index.html',
    inject: 'body',
    basePath: BASE_PATH,
  }),
  new MiniCssExtractPlugin(),
]

if (!DEBUG) {
  plugins = plugins.concat([
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.optimize.MinChunkSizePlugin({minChunkSize: 5000}),
    new ESLintPlugin({ failOnWarning: !DEBUG }),
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
    use: [
      {
        loader: "babel-loader",  // see .babelrc for options
      },
    ],
    include: path.join(__dirname, 'src')
  },
  {
    test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/inline',
  },
  {
    test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/inline',
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/inline',
  },
  {
    test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/resource',
  },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    type: 'asset/inline',
  },
  {
    test: /\.gif$/,
    type: 'asset/inline',
  },
  {
    test: /\.(jpg|jpeg)$/,
    type: 'asset/inline',
  },
  {
    test: /\.png$/,
    type: 'asset/inline',
  },
  {
    test: /\.svg$/,
    type: 'asset/inline',
  },
]

/*############## OPTIONS ##############*/

module.exports = {
  mode: process.env.NODE_ENV || DEVELOPMENT,
  devtool: devtool,
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
  }
}
