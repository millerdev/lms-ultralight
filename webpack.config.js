'use strict';

const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const autoprefixer = require('autoprefixer');

const DEVELOPMENT = 'development';
const PRODUCTION = 'production';

const DEBUG = process.env.NODE_ENV !== PRODUCTION;
const ENV = DEBUG ? DEVELOPMENT : PRODUCTION;

// change 'eval' to 'source-map' for nicer debugging (and slower rebuilds)
const devtool = DEBUG ? 'eval' : 'cheap-module-source-map'


/*############## GLOBALS ##############*/

const GLOBALS = {
  'process.env.NODE_ENV': JSON.stringify(ENV),
  __DEV__: DEBUG,
  // in bash: export LMS_URL=http://lms_host_ip:9000
  LMS_URL: JSON.stringify(process.env.LMS_URL || ""),
};


/*############## PLUGINS ##############*/

let plugins = [
  new webpack.DefinePlugin(GLOBALS),
  new CopyWebpackPlugin([{from: "src/static"}]),
  // this plugin injects your resources to the index file
  new HTMLWebpackPlugin({
    filename: 'index.html',
    showErrors: DEBUG,
    template: 'src/static/index.html',
    inject: 'body'
  }),
  new webpack.LoaderOptionsPlugin({
    options: {
      eslint: { failOnWarning: DEBUG },
      postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
    },
  }),
  new webpack.optimize.CommonsChunkPlugin({
    name: 'vendor',
    filename: 'vendor.[hash].js',
    minChunks: module =>
      module.context && module.context.indexOf('node_modules') >= 0,
  }),
  new webpack.optimize.ModuleConcatenationPlugin(),
];

if (!DEBUG) {
  plugins = plugins.concat([
    new ExtractTextPlugin({
      filename: 'css/[name]-[contenthash].css',
      allChunks: true,
    }),
    new webpack.optimize.UglifyJsPlugin({
      sourceMap: devtool.indexOf("source-map") > -1,
      compress: {
        warnings: false,
        screw_ie8: true,
        conditionals: true,
        unused: true,
        comparisons: true,
        sequences: true,
        dead_code: true,
        evaluate: true,
        if_return: true,
        join_vars: true
      },
      output: {
        comments: false
      },
    }),
    new webpack.HashedModuleIdsPlugin(),
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.optimize.MinChunkSizePlugin({minChunkSize: 5000}),
  ]);
}


/*############## LOADERS ##############*/

const stylusConfig = ["css-loader", "stylus-loader"];
const stylusLoader = DEBUG ?
  ["style-loader"].concat(stylusConfig) :
  ExtractTextPlugin.extract({fallback: "style-loader", use: stylusConfig})

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
      "babel-loader",
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
  devtool: devtool,
  entry: {
    app: './src/index.js'
  },
  target: 'web',
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
