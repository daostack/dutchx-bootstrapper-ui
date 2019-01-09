const {
  series,
  concurrent,
  rimraf
} = require("nps-utils");

const { config: { port: E2E_PORT } } = require("./test/protractor.conf");
const lintCommand = "tslint {args} -c tslint.json 'src/**/*.ts' && tslint -c tslint.json 'test/**/*.ts' && tslint -c tslint.json 'custom_typings/**/*.ts'";

module.exports = {
  scripts: {
    default: series(
      "nps build.production.andServe"
    ),
    "arc-js": {
      ganache: "npm explore @daostack/arc.js -- npm start ganache",
      ganacheDb: {
        default: "npm explore @daostack/arc.js -- npm start ganacheDb",
        clean: "npm explore @daostack/arc.js -- npm start ganacheDb.clean",
        zip: "npm explore @daostack/arc.js -- npm start ganacheDb.zip",
        unzip: "npm explore @daostack/arc.js -- npm start ganacheDb.unzip",
        restoreFromZip: "npm explore @daostack/arc.js -- npm start ganacheDb.restoreFromZip"
      },
      migrateContracts: "npm explore @daostack/arc.js -- npm start migrateContracts"
    },
    lint: {
      default: lintCommand.replace('{args}',''),
      andFix: lintCommand.replace('{args}','--fix')
    },
    test: {
      default: "nps test.jest",
      jest: {
        default: "jest",
        coverage: rimraf("test/coverage-jest"),
        accept: "jest -u",
        watch: "jest --watch",
        updateSnapshots: "jest --updateSnapshot"
      },
      karma: {
        default: series(
          rimraf("test/coverage-karma"),
          "karma start test/karma.conf.js"
        ),
        watch: "karma start test/karma.conf.js --auto-watch --no-single-run",
        debug: "karma start test/karma.conf.js --auto-watch --no-single-run --debug"
      },
      all: concurrent({
        browser: series.nps("test.karma", "e2e"),
        jest: "nps test.jest"
      })
    },
    e2e: {
      default:
        concurrent({
          webpack: `webpack-dev-server --inline --port=${E2E_PORT}`,
          protractor: "nps e2e.whenReady"
        }) + " --kill-others --success first",
      protractor: {
        install: "webdriver-manager update",
        default: series(
          "nps e2e.protractor.install",
          "protractor test/protractor.conf.js"
        ),
        debug: series(
          "nps e2e.protractor.install",
          "protractor test/protractor.conf.js --elementExplorer"
        )
      },
      whenReady: series(
        `wait-on --timeout 120000 http-get://localhost:${E2E_PORT}/index.html`,
        "nps e2e.protractor"
      )
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
        default: "http-server dist_prod --cors -o -p 8091"
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
