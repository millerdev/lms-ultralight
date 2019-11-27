'use strict';

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const DEVELOPMENT = 'development';
const PRODUCTION = 'production';

const DEBUG = process.env.NODE_ENV !== PRODUCTION;
const BASE_PATH = DEBUG ? '/' : '/ultralight/'

// change 'eval' to 'source-map' for nicer debugging (and slower rebuilds)
const devtool = DEBUG ? 'source-map' : 'cheap-module-source-map'


/*############## PLUGINS ##############*/

let plugins = [
  new webpack.EnvironmentPlugin(["LMS_URL"]), // bash: export LMS_URL=http://lms_host_ip:9000
  new CopyWebpackPlugin([{from: "src/static"}]),
  // this plugin injects your resources to the index file
  new HTMLWebpackPlugin({
    filename: 'index.html',
    showErrors: !DEBUG,
    template: 'src/static/index.html',
    inject: 'body',
    basePath: BASE_PATH,
  }),
  new MiniCssExtractPlugin(),
  new webpack.LoaderOptionsPlugin({
    options: {
      eslint: { failOnWarning: !DEBUG },
    },
  }),
];

if (!DEBUG) {
  plugins = plugins.concat([
    new webpack.HashedModuleIdsPlugin(),
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.optimize.MinChunkSizePlugin({minChunkSize: 5000}),
  ]);
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
      "eslint-loader",
    ],
    include: path.join(__dirname, 'src')
  },
  {
    test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "application/font-woff"}
      },
    ],
  },
  {
    test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "application/font-woff"}
      },
    ],
  },
  {
    test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "application/octet-stream"}
      },
    ],
  },
  {
    test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      "file-loader"
    ],
  },
  {
    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "image/svg+xml"}
      },
    ],
  },
  {
    test: /\.gif$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "image/gif"}
      },
    ],
  },
  {
    test: /\.(jpg|jpeg)$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "image/jpg"}
      },
    ],
  },
  {
    test: /\.png$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "image/png"}
      },
    ],
  },
  {
    test: /\.svg$/,
    use: [
      {
        loader: "url-loader",
        options: {limit: 10000, mimetype: "image/svg+xml"}
      },
    ],
  },
];

/*############## OPTIONS ##############*/

module.exports = {
  mode: process.env.NODE_ENV,
  devtool: devtool,
  entry: {
    app: './src/index.js'
  },
  target: 'web',
  optimization: {
    runtimeChunk: {name: "manifest"},
  },
  output: {
    path: __dirname + '/dist',
    filename: !DEBUG ? 'js/[name]-[hash].js' : 'js/[name].js',
    chunkFilename: "js/[name]-[chunkhash].js",
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
};
