const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const { AureliaPlugin } = require('aurelia-webpack-plugin');
const { ProvidePlugin, DefinePlugin, IgnorePlugin, ContextReplacementPlugin, SourceMapDevToolPlugin }
  = require('webpack');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// config helpers:
const ensureArray = (config) => config && (Array.isArray(config) ? config : [config]) || []
const when = (condition, config, negativeConfig) =>
  condition ? ensureArray(config) : ensureArray(negativeConfig)

// primary config:
const title = 'dxDAO';
let outDir;
const srcDir = path.resolve(__dirname, 'src');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');
const baseUrl = '/';

/**
 * @return {webpack.Configuration}
 */
module.exports = ({ production, server, coverage } = {}) => {

  let env = production ? 'production' : 'development';

  outDir = path.resolve(__dirname, production ? 'dist_prod' : 'dist');

  console.log(`env: ${env}`);

  return {
      mode: env,
      resolve: {
      extensions: ['.ts', '.js'],
      modules: [srcDir, 'node_modules'],
      alias: {
        // prepend '~' to import path in order to use this alias
        // "bootstrap-sass": path.resolve(nodeModulesDir,"bootstrap/scss/"),
        // "mdbootstrap-sass": path.resolve(nodeModulesDir,"mdbootstrap/sass/mdb/free/"),
        "bootstrap": path.resolve(nodeModulesDir, "bootstrap/"),
        "BMD": path.resolve(nodeModulesDir, "bootstrap-material-design/scss/"),
        "static": path.resolve(__dirname, "static"),
      }
    },
    devtool: production ? 'source-map' : 'eval-source-map',
    entry: {
      app: ['aurelia-bootstrapper'],
      vendor: [
        'bluebird',
        '@daostack/arc.js'
      ],
    },
    output: {
      path: outDir,
      publicPath: baseUrl,
      filename: production ? '[name].[chunkhash].bundle.js' : '[name].[hash].bundle.js',
      sourceMapFilename: production ? '[name].[chunkhash].bundle.map' : '[name].[hash].bundle.map',
      chunkFilename: production ? '[name].[chunkhash].chunk.js' : '[name].[hash].chunk.js'
    },
    devServer: {
      contentBase: outDir,
      // serve index.html for all 404 (required for push-state)
      historyApiFallback: true,
    },
    optimization: {
      runtimeChunk: "single", // enable "runtime" chunk
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            chunks: "all"
          }
        }
      },
    minimizer: [
      new TerserPlugin({
        test: /\.js($|\?)/i,
        sourceMap: false,
        extractComments: true,
        parallel: true,
        terserOptions: {
          ecma: 6,
          mangle: {
            reserved: ['BigNumber'],
          }
        }
      })
    ]
    },
    module: {
      rules: [
        {
          test: /\.(sa|sc|c)ss$/,
          // CSS required in templates cannot be extracted safely
          // because Aurelia would try to require it again in runtime
          issuer: [{ not: [{ test: /\.html$/i }] }],
          use: [
            production ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            {
              loader: 'postcss-loader',
              // avoid error: "No PostCSS Config found in"
              options: {
                plugins: (loader) => [
                require('postcss-smart-import'),
                require('autoprefixer'),
                ]
              }
            },
            'sass-loader',
          ]
        },
        { test: /\.html$/i, loader: 'html-loader' },
        { test: /\.ts$/i, loader: 'awesome-typescript-loader', exclude: nodeModulesDir },
        // { test: /\.json$/i, loader: 'json-loader' },
        // use Bluebird as the global Promise implementation:
        { test: /[\/\\]node_modules[\/\\]bluebird[\/\\].+\.js$/, loader: 'expose-loader?Promise' },
        // exposes jQuery globally as $ and as jQuery:
        { test: require.resolve('jquery'), loader: 'expose-loader?$!expose-loader?jQuery' },
        // embed small images and fonts as Data Urls and larger ones as files:
        { test: /\.(png|gif|jpg|cur)$/i, loader: 'url-loader', options: { limit: 8192 } },
        { test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff2' } },
        { test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'url-loader', options: { limit: 10000, mimetype: 'application/font-woff' } },
        // load these fonts normally, as files:
        { test: /\.(ttf|eot|svg|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i, loader: 'file-loader' },
        ...when(coverage, {
          test: /\.[jt]s$/i, loader: 'istanbul-instrumenter-loader',
          include: srcDir, exclude: [/\.{spec,test}\.[jt]s$/i],
          enforce: 'post', options: { esModules: true },
        })
      ]
    },
    plugins: [
      new DefinePlugin({
        'process.env': {
          env: JSON.stringify(env)
        },
      }),
      new AureliaPlugin(),
      new ProvidePlugin({
        Promise: 'bluebird',
        $: 'jquery',
        jQuery: 'jquery',
        'window.jQuery': 'jquery',
        Popper: ['popper.js', 'default'],
        Waves: 'node-waves'
      }),
      new HtmlWebpackPlugin({
        template: 'index.ejs',
        minify: production ? {
          removeComments: true,
          collapseWhitespace: true
        } : undefined,
        metadata: {
          // available in index.ejs //
          title, server, baseUrl
        },
      }),
      new CopyWebpackPlugin([
        { from: 'static/favicon.ico' },
        { from: 'static/daostack-icon-white.svg' },
        { from: 'static/daostack-icon-black.svg' },
        { from: 'static/dutchx-white.svg' },
        { from: 'static/dutchx-blue.svg' },
        { from: 'static/generic_icon_white.svg' },
        { from: 'static/generic_icon_color.svg' },
        { from: 'static/eth_icon_white.svg' },
        { from: 'static/eth_icon_color.svg' },
        { from: 'static/mgn_icon_white.svg' },
        { from: 'static/mgn_icon_color.svg' },
        { from: 'static/gen_icon_white.svg' },
        { from: 'static/gen_icon_color.svg' },
        { from: 'static/t_blue.svg' },
        { from: 'static/t_white.svg' },
        { from: 'static/base.css' },
        { from: 'node_modules/font-awesome/fonts', to: 'fonts' },
        { from: 'node_modules/material-icons/iconfont/material-icons.css', to: 'fonts'},
        { from: 'node_modules/material-icons/iconfont/MaterialIcons-Regular.eot', to: 'fonts'},
        { from: 'node_modules/material-icons/iconfont/MaterialIcons-Regular.woff2', to: 'fonts'},
        { from: 'node_modules/material-icons/iconfont/MaterialIcons-Regular.woff', to: 'fonts'},
        { from: 'node_modules/material-icons/iconfont/MaterialIcons-Regular.ttf', to: 'fonts'},
        { from: 'static/fonts/dinpro', to: 'fonts' },
        { from: 'node_modules/font-awesome/css/font-awesome.min.css', to: 'font-awesome.min.css' },
        { from: 'node_modules/snackbarjs/dist/snackbar.min.css' },
        { from: 'node_modules/bootstrap-material-design/dist/css/bootstrap-material-design.min.css' },
      ]),
      // remove all moment.js locale files
      new IgnorePlugin(/^\.\/locale$/, /moment$/),
      // filter ABI contract files
      new ContextReplacementPlugin(
        /@daostack[/\\]arc.js[/\\]migrated_contracts$/,
        /Controller.json|Avatar.json|DAOToken.json|Reputation.json|ERC20.json|Auction4Reputation.json|ExternalLocking4Reputation.json|Locking4Reputation.json|LockingEth4Reputation.json|LockingToken4Reputation.json|PriceOracleInterface.json/),
      new MiniCssExtractPlugin({
        filename: production ? '[name].[hash].css' : '[name].css',
        chunkFilename: production ? '[id].[hash].css' : '[id].css',
      }),
      ...when(!production, [
        new SourceMapDevToolPlugin({
          filename: '[file].map', // Remove this line if you prefer inline source maps
          moduleFilenameTemplate: path.relative(outDir, '[resourcePath]')  // Point sourcemap entries to the original file locations on disk
        }),
      ]),
      ...when(production, [
        new CompressionPlugin({
          test: /\.css$|\.js($|\?)/i
        })
      ])
      // , new BundleAnalyzerPlugin({ analyzerMode: 'static' })
    ],
  }
}
