/* eslint-disable */
'use strict';

const browserSync = require('browser-sync');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');

process.env.NODE_ENV = 'development';
const webpackConfig = require('../webpack.config');

// patch entry
webpackConfig.entry.app = ['webpack-hot-middleware/client?reload=true&noInfo=false'].concat(webpackConfig.entry.app);

// add relevant plugins
webpackConfig.plugins.push(
  new webpack.HotModuleReplacementPlugin(),
  new webpack.NoEmitOnErrorsPlugin()
);

const bundler = webpack(webpackConfig);


browserSync({
  port: 3000,
  ui: false,
  open: false,
  files: ['src/static/**'],
  server: {
    baseDir: 'src/static',
    middleware: [
      function (req, res, next) {
        if (!/(\.(?!html)\w+$|__webpack.*)/.test(req.url)) req.url = '/';
        next();
      },
      webpackDevMiddleware(bundler, {
        publicPath: webpackConfig.output.publicPath,
        stats: {colors: true},
        headers: {"Access-Control-Allow-Origin": "*"},
        quiet: false,
        noInfo: true
      }),
      webpackHotMiddleware(bundler)
    ]
  }
});
