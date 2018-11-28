﻿import { ArcService } from './services/ArcService';
/// <reference types="aurelia-loader-webpack/src/webpack-hot-interface"/>
import { Aurelia } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import * as Bluebird from 'bluebird';
import { Web3Service, BigNumber } from "./services/Web3Service";
import { InitializeArcJs, AccountService, Address, Utils, Web3 } from '@daostack/arc.js';
import axios from "axios";
import 'arrive'; // do bmd does it's thing whenever views are attached
import "popper.js";
import 'bootstrap-material-design';
import { SnackbarService } from "./services/SnackbarService";
import { ConsoleLogService } from "./services/ConsoleLogService";
import { ConfigService, LogLevel } from "./services/ArcService";
import { DateService } from "./services/DateService";
import { AureliaConfiguration } from "aurelia-configuration";
import { EventAggregator } from 'aurelia-event-aggregator';
import { App } from 'app';

// remove out if you don't want a Promise polyfill (remove also from webpack.config.js)
Bluebird.config({ warnings: { wForgottenReturn: false } });

// supplied by Webpack
export async function configure(aurelia: Aurelia) {

  let appConfig: AureliaConfiguration;

  aurelia.use
    .standardConfiguration()
    .plugin(PLATFORM.moduleName('aurelia-animator-css'))
    .plugin(PLATFORM.moduleName('aurelia-configuration'), config => {
      config.setDirectory('./');
      config.setConfig('app-config.json');
      appConfig = config;
    })
    .plugin(PLATFORM.moduleName('aurelia-dialog'), (configuration) => {
      // custom configuration
      configuration.settings.keyboard = false;
    });

  // for now, always on for trouble-shooting:  if (process.env.env == "development") {
  aurelia.use.developmentLogging();
  ConfigService.set("logLevel", LogLevel.all);
  // }

  // Uncomment the line below to enable animation.
  // aurelia.use.plugin(PLATFORM.moduleName('aurelia-animator-css'));
  // if the css animator is enabled, add swap-order="after" to all router-view elements

  // Anyone wanting to use HTMLImports to load views, will need to install the following plugin.
  // aurelia.use.plugin(PLATFORM.moduleName('aurelia-html-import-template-loader'));

  aurelia.use.globalResources([
    PLATFORM.moduleName("resources/bindingBehaviors/async"),
    PLATFORM.moduleName("resources/customElements/EtherscanLink/EtherscanLink"),
    PLATFORM.moduleName("resources/customElements/EthBalance/EthBalance"),
    PLATFORM.moduleName("resources/customElements/UsersAddress/UsersAddress"),
    PLATFORM.moduleName("resources/customElements/TokenBalance/TokenBalance"),
    PLATFORM.moduleName("resources/customElements/locksForReputation/locksForReputation"),
    PLATFORM.moduleName("resources/customElements/copyToClipboardButton/copyToClipboardButton"),
    PLATFORM.moduleName("resources/customElements/banner/banner"),
    PLATFORM.moduleName("resources/customElements/spinButton.html"),
    PLATFORM.moduleName("resources/customElements/instructions.html"),
    PLATFORM.moduleName("resources/customElements/pageLoading.html"),
    PLATFORM.moduleName("resources/customAttributes/click-to-route"),
    PLATFORM.moduleName("resources/customAttributes/blur-image"),
    PLATFORM.moduleName("resources/valueConverters/toUpper"),
    PLATFORM.moduleName("resources/valueConverters/number"),
    PLATFORM.moduleName("resources/valueConverters/round"),
    PLATFORM.moduleName("resources/valueConverters/ethwei"),
    PLATFORM.moduleName("resources/valueConverters/keys"),
    PLATFORM.moduleName("resources/valueConverters/date"),
    PLATFORM.moduleName("resources/valueConverters/timespan"),
    PLATFORM.moduleName("resources/valueConverters/boolean"),
    PLATFORM.moduleName("resources/valueConverters/secondsDays"),
    PLATFORM.moduleName("resources/dialogs/connectToNet/connectToNet"),
    PLATFORM.moduleName("resources/dialogs/alert/alert"),
    PLATFORM.moduleName("footer"),
    PLATFORM.moduleName("header")
  ]);

  PLATFORM.moduleName("./schemeDashboards/ExternalLocking4Reputation");
  PLATFORM.moduleName("./schemeDashboards/LockingEth4Reputation");
  PLATFORM.moduleName("./schemeDashboards/LockingToken4Reputation");
  // PLATFORM.moduleName("./schemeDashboards/FixedReputationAllocation");
  PLATFORM.moduleName("./schemeDashboards/Auction4Reputation");

  PLATFORM.moduleName("./schemeDashboards/Auction4Reputation");

  await aurelia.start();

  try {

    const initializeApp = async (): Promise<Web3> => {

      const networkName = await Utils.getNetworkName();
      appConfig.setEnvironment(networkName);

      const web3 = await InitializeArcJs({
        useMetamaskEthereumWeb3Provider: true,
        watchForAccountChanges: true,
        watchForNetworkChanges: true,
        filter: {},
        deployedContractAddresses: {
          rinkeby: {
            base: {
              DAOToken: "0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf"
            }
          }
        }
      });

      if (networkName === 'Live') {
        ConfigService.set("gasPriceAdjustment", async (defaultGasPrice: BigNumber) => {
          try {
            const response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
            // the api gives results if 10*Gwei
            const gasPrice = response.data.fast / 10;
            return web3.toWei(gasPrice, 'gwei');
          } catch (e) {
            return defaultGasPrice;
          }
        });
      }

      ConfigService.set("estimateGas", true);

      // just to initialize them and get them running
      aurelia.container.get(ConsoleLogService);
      // not using aurelia.container.get(AlertService);
      aurelia.container.get(SnackbarService);
      aurelia.container.get(DateService);

      const web3Service = aurelia.container.get(Web3Service) as Web3Service;

      await web3Service.initialize(web3);

      const arcService = aurelia.container.get(ArcService) as ArcService;
      await arcService.initialize();

      return web3;
    };


    const eventAggregator = aurelia.container.get(EventAggregator) as EventAggregator;

    AccountService.subscribeToAccountChanges(async (account: Address) => {
      await initializeApp();
      eventAggregator.publish("Network.Changed.Account", account);
    });

    AccountService.subscribeToNetworkChanges(async (networkId: number) => {
      await initializeApp();
      eventAggregator.publish("Network.Changed.Id", networkId);
    });

    await initializeApp();

  } catch (ex) {
    console.log(`Error initializing application: ${ex}`);
    //const dialogService = aurelia.container.get(DialogService) as DialogService;
    // dialogService.alert(`Sorry, an error occurred initializing the application`)
  }

  await aurelia.setRoot(PLATFORM.moduleName('app'));
}
