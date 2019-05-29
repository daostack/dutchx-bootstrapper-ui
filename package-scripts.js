const {
  series,
  concurrent,
  rimraf
} = require("nps-utils");

const lintCommand = "tslint {args} -c tslint.json 'src/**/*.ts' && tslint -c tslint.json 'test/**/*.ts' && tslint -c tslint.json 'custom_typings/**/*.ts'";

module.exports = {
  scripts: {
    default: series(
      "nps build.production.andServe"
    ),
    lint: {
      default: lintCommand.replace('{args}',''),
      andFix: lintCommand.replace('{args}','--fix')
    },
    build: {
      production: {
        default: "nps webpack.build.production",
        andServe: "nps webpack.build.production.andServe"
      },
      development: {
        default: "nps webpack.build.development",
        andServe: "nps webpack.build.development.andServe"
      }
    },
    browse: {
      production: {
        default: "http-server dist_prod --cors -p 8091 -g"
      },
      development: {
        default: "http-server dist --cors -o -p 8090"
      }
    },
    webpack: {
      build: {
        beforeDev: rimraf("dist"),
        beforeProd: rimraf("dist_prod"),
        default: "nps webpack.build.production",
        development: {
          default: series(
            "nps webpack.build.beforeDev",
            "webpack --progress -d"),
          // doesn't use the dist folder
          andServe: `webpack-dev-server -d --inline --hot --env.server --port 8090`
        },
        production: {
          default: series(
            "nps webpack.build.beforeProd",
            "webpack --progress --env.production"
          ),
          inlineCss: series(
            "nps webpack.build.beforeProd",
            "webpack --progress --env.production"
          ),
          andServe: series(
            "nps webpack.build.production",
            "nps browse.production")
        }
      }
    },
    hmr: "nps build.development.andServe",
  }
};
