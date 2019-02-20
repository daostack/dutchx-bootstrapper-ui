import 'arrive'; // do bmd does it's thing whenever views are attached
/// <reference types="aurelia-loader-webpack/src/webpack-hot-interface"/>
import { Aurelia } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import * as Bluebird from 'bluebird';
import 'bootstrap-material-design';
import 'popper.js';
import { ConsoleLogService } from 'services/ConsoleLogService';
import { LockService } from 'services/lockServices';
import { SnackbarService } from 'services/SnackbarService';
import { DateService } from './services/DateService';

// remove out if you don't want a Promise polyfill (remove also from webpack.config.js)
Bluebird.config({ warnings: { wForgottenReturn: false } });

// supplied by Webpack
export async function configure(aurelia: Aurelia) {

  aurelia.use
    .standardConfiguration()
    .plugin(PLATFORM.moduleName('aurelia-animator-css'))
    .plugin(PLATFORM.moduleName('aurelia-configuration'), (config) => {
      config.setDirectory('./');
      config.setConfig('app-config.json');
    })
    .plugin(PLATFORM.moduleName('aurelia-dialog'), (configuration) => {
      // custom configuration
      configuration.settings.keyboard = false;
    });

  if (process.env.env === 'development') {
    aurelia.use.developmentLogging();
  }

  aurelia.use.globalResources([
    PLATFORM.moduleName('resources/customElements/EtherscanLink/EtherscanLink'),
    PLATFORM.moduleName('resources/customElements/EthBalance/EthBalance'),
    PLATFORM.moduleName('resources/customElements/MgnBalance/MgnBalance'),
    PLATFORM.moduleName('resources/customElements/UsersAddress/UsersAddress'),
    PLATFORM.moduleName('resources/customElements/TokenBalance/TokenBalance'),
    PLATFORM.moduleName('resources/customElements/locksForReputation/locksForReputation'),
    PLATFORM.moduleName('resources/customElements/copyToClipboardButton/copyToClipboardButton'),
    PLATFORM.moduleName('resources/customElements/numericInput/numericInput'),
    PLATFORM.moduleName('resources/customElements/floatingPointNumber/floatingPointNumber'),
    PLATFORM.moduleName('resources/customElements/spinButton.html'),
    PLATFORM.moduleName('resources/customElements/instructions.html'),
    PLATFORM.moduleName('resources/customElements/pageLoading.html'),
    PLATFORM.moduleName('resources/customElements/metamaskFeedback.html'),
    PLATFORM.moduleName('resources/customElements/networkFeedback.html'),
    PLATFORM.moduleName('resources/valueConverters/number'),
    PLATFORM.moduleName('resources/valueConverters/ethwei'),
    PLATFORM.moduleName('resources/valueConverters/date'),
    PLATFORM.moduleName('resources/valueConverters/timespan'),
    PLATFORM.moduleName('resources/valueConverters/boolean'),
    PLATFORM.moduleName('resources/valueConverters/secondsDays'),
    PLATFORM.moduleName('resources/dialogs/connectToNet/connectToNet'),
    PLATFORM.moduleName('resources/dialogs/alert/alert'),
    PLATFORM.moduleName('footer'),
    PLATFORM.moduleName('header'),
  ]);

  PLATFORM.moduleName('./schemeDashboards/ExternalLocking4Reputation');
  PLATFORM.moduleName('./schemeDashboards/LockingEth4Reputation');
  PLATFORM.moduleName('./schemeDashboards/LockingToken4Reputation');
  PLATFORM.moduleName('./schemeDashboards/Auction4Reputation');
  PLATFORM.moduleName('./schemeDashboards/DaoStorytelling');

  await aurelia.start();
  // just to initialize them and get them running
  aurelia.container.get(ConsoleLogService);
  // not using aurelia.container.get(AlertService);
  aurelia.container.get(SnackbarService);
  aurelia.container.get(DateService);
  LockService.initialize(aurelia.container);
  await aurelia.setRoot(PLATFORM.moduleName('app'));
}
