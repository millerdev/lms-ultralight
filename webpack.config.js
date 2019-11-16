'use strict';

const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const DEVELOPMENT = 'development';
const PRODUCTION = 'production';

const DEBUG = process.env.NODE_ENV !== PRODUCTION;
const ENV = process.env.NODE_ENV;

// change 'eval' to 'source-map' for nicer debugging (and slower rebuilds)
const devtool = DEBUG ? 'eval' : 'cheap-module-source-map'


/*############## PLUGINS ##############*/

let plugins = [
  new webpack.EnvironmentPlugin(["LMS_URL"]), // bash: export LMS_URL=http://lms_host_ip:9000
  new CopyWebpackPlugin([{from: "src/static"}]),
  // this plugin injects your resources to the index file
  new HTMLWebpackPlugin({
    filename: 'index.html',
    showErrors: !DEBUG,
    template: 'src/static/index.html',
    inject: 'body'
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

const stylusConfig = ["css-loader", "stylus-loader"];
const stylusLoader = DEBUG ?
  ["style-loader"].concat(stylusConfig) :
  MiniCssExtractPlugin.extract({fallback: "style-loader", use: stylusConfig})

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
    use: stylusLoader,
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
        loader: "babel-loader",
        options: {  // Babel config (.babelrc)
          presets: ["@babel/preset-env", "@babel/preset-react"],
          plugins: [
            "@babel/plugin-proposal-class-properties",
            "@babel/plugin-proposal-object-rest-spread",
            "@babel/plugin-transform-runtime",
          ],
        }
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
    publicPath: !DEBUG ? '/ultralight/' : '/',
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
