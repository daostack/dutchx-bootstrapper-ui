import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom, singleton } from 'aurelia-framework';
import axios from 'axios';
import { DaoEx } from 'entities/DAO';
import { EventConfig, EventConfigException, EventMessageType } from 'entities/GeneralEvents';
import { SchemeInfo } from 'entities/SchemeInfo';
import { ArcService } from 'services/ArcService';
import { DaoService } from 'services/DaoService';
import { DisposableCollection } from 'services/DisposableCollection';
import { NetworkConnectionWizards } from 'services/networkConnectionWizards';
import { SchemeService } from 'services/SchemeService';
import { Web3Service } from 'services/Web3Service';
import { Web3 } from 'web3';
import {
  AccountService,
  Address,
  ConfigService,
  InitializeArcJs,
  Locking4ReputationWrapper,
  LogLevel,
  Utils,
  WrapperService
} from './services/ArcService';

@singleton(false)
@autoinject
export abstract class BaseNetworkPage {

  protected initialized: boolean = false;
  protected dutchXSchemes: Array<ISchemeInfoX>;
  protected org: DaoEx;
  protected options: { address?: Address };
  protected avatarLoading: boolean = true;
  protected avatarLoaded: boolean = false;
  protected schemesLoaded: boolean = false;
  protected schemesLoading: boolean = false;
  protected _loading: boolean = false;
  protected address: string;
  protected orgName: string;
  protected subscriptions = new DisposableCollection();
  protected disclaimed = false;
  protected networkName: string;

  /**
   * this doesn't really belong in the base class, but for now, no harm done.
   */
  private dutchXSchemeConfigs = new Map<string, ISchemeConfig>([
    ['Auction4Reputation', {
      description: 'BID GEN',
      hasActiveLocks: false,
      hasContract: true,
      icon: './gen_icon_color.svg',
      icon_hover: './gen_icon_white.svg',
      position: 4,
    }],
    ['ExternalLocking4Reputation', {
      description: 'REGISTER MGN',
      hasActiveLocks: false,
      hasContract: true,
      icon: './mgn_icon_color.svg',
      icon_hover: './mgn_icon_white.svg',
      position: 3,
    }],
    ['LockingEth4Reputation', {
      description: 'LOCK ETH',
      hasActiveLocks: true,
      hasContract: true,
      icon: './eth_icon_color.svg',
      icon_hover: './eth_icon_white.svg',
      position: 1,
    }],
    ['LockingToken4Reputation', {
      description: 'LOCK TOKENS',
      hasActiveLocks: true,
      hasContract: true,
      icon: './generic_icon_color.svg',
      icon_hover: './generic_icon_white.svg',
      position: 2,
    }],
    ['DaoStorytelling', {
      description: 'DAO STORYTELLING',
      hasActiveLocks: false,
      hasContract: false,
      icon: './t_blue.svg',
      icon_hover: './t_white.svg',
      position: 5,
    }],
  ]);

  constructor(
    protected web3: Web3Service,
    protected schemeService: SchemeService,
    protected daoService: DaoService,
    protected eventAggregator: EventAggregator,
    protected appConfig: AureliaConfiguration,
    protected networkConnectionWizards: NetworkConnectionWizards,
    protected arcService: ArcService,
    protected web3Service: Web3Service
  ) {
  }

  /**
   * true if loading the avatar or its schemes
   */
  @computedFrom('_loading')
  protected get loading() {
    return this._loading;
  }

  protected set loading(newValue: boolean) {
    if (newValue !== this._loading) {
      this.eventAggregator.publish('DAO.Loading', newValue);
      this._loading = newValue;
    }
  }

  protected async activate(options: { address?: Address } = {}): Promise<void> {

    // tslint:disable-next-line: no-console
    // console.time('activate');

    this.options = options;

    /*******************
     * Handle avatar loaded.  Load schemes.
     */
    this.subscriptions.push(this.eventAggregator.subscribe('Avatar.loaded', () => {
      this.loadSchemes().then((schemesLoaded: boolean) => {
        this.loading = false;
        if (schemesLoaded) {
          // tslint:disable-next-line: no-console
          // console.timeStamp('Schemes Processed');
          setTimeout(() => { this.eventAggregator.publish('DAO.loaded', this.org); }, 0);
        }
      });
    }));

    /*******************
     * Handle account change.  Load a DAO if we don't already have one.
     * This should only happen when there was already a network and an account.
     */
    const subscription1 = AccountService.subscribeToAccountChanges(async (account: Address) => {
      await this.initializeNetwork();
      this.eventAggregator.publish('Network.Changed.Account', account);
      /**
       * this will notify if the new user is discaimed, and we will then load the avatar
       * or schemes accordingly.
       */
      this.networkConnectionWizards.run(!!this.org, false);
    });

    this.subscriptions.push({ dispose: () => subscription1.unsubscribe() });

    /*******************
     * Handle network change.  Must load a new DAO.
     * MM has always refreshed the entire page on network change, but it is anticipated that this will (rightly)
     * change.  Thus the following code is maintained for that eventuality, but isn't well tested.
     * See: https://github.com/MetaMask/metamask-extension/issues/3599
     */
    const subscription2 = AccountService.subscribeToNetworkChanges(async (networkId: number) => {
      await this.initializeNetwork();
      this.eventAggregator.publish('Network.Changed.Id', networkId);
      if (this.disclaimed) {
        this.networkName = this.web3.networkName;
        await this.loadAvatar();
      } else {
        this.networkConnectionWizards.run(false, false);
      }
    });

    this.subscriptions.push({ dispose: () => subscription2.unsubscribe() });

    this.subscriptions.push(this.eventAggregator.subscribe('connect.disclaimed', (disclaimed: boolean) => {
      this.disclaimed = disclaimed;
      if (this.disclaimed) {
        if (!this.org) {
          /**
           * this will inform the connection dialog as to what to do next
           */
          this.loadAvatar();
        } else {
          this.loadSchemes();
        }
      }
    }));

    if (!this.initialized) {
      await this.initializeNetwork();
    }
    /**
     * intentionally no 'else' here.
     */
    if (this.initialized) {
      this.networkName = this.web3.networkName;
      this.networkConnectionWizards.run(!!this.org, false);
    }
  }

  protected deactivate() {
    this.subscriptions.dispose();
    this.networkConnectionWizards.close(true);
  }

  protected async initializeNetwork(): Promise<Web3 | undefined> {

    let web3: Web3;
    this.initialized = false;

    try {

      try {
        // so we will at least be able to find out if we're connected and have a default account
        await Utils.getWeb3();
        // tslint:disable-next-line:no-empty
      } catch (ex) {
        this.eventAggregator.publish('handleException', new EventConfigException(`web3 is not found `, ex));
        this.networkConnectionWizards.run(false, false);
        return Promise.resolve(null);
      }

      const networkName = await Utils.getNetworkName();
      this.appConfig.setEnvironment(networkName);
      ConfigService.set('logLevel',
        // tslint:disable-next-line: no-bitwise
        (networkName === 'Live') ? LogLevel.info | LogLevel.warn | LogLevel.error : LogLevel.all);

      if (!this.appConfig.get('lockableTokens')) {
        this.eventAggregator.publish('handleMessage',
          new EventConfig(`the network ${networkName} has not been configured`, EventMessageType.Exception));
        this.networkConnectionWizards.run(false, false);
        return Promise.resolve(null);
      }

      try {
        web3 = await InitializeArcJs({
          filter: {},
          useMetamaskEthereumWeb3Provider: true,
          watchForAccountChanges: true,
          watchForNetworkChanges: true,
        });
      } catch (ex) {
        this.eventAggregator.publish('handleMessage', new EventConfig(ex.message, EventMessageType.Exception));
        try {
          // so we will at least be able to find out if we're connected and have a default account
          web3 = await Utils.getWeb3();
          // tslint:disable-next-line:no-empty
        } catch (ex) { }
      }

      if (networkName === 'Live') {
        ConfigService.set('gasPriceAdjustment', async () => {
          try {
            const response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
            // the api gives results as 10*Gwei
            const gasPrice = response.data.fast / 10;
            return web3.toWei(gasPrice, 'gwei');
            // tslint:disable-next-line:no-empty
          } catch  {
          }
        });
      }

      ConfigService.set('estimateGas', true);

      await this.web3Service.initialize(web3);

      await this.arcService.initialize();

      this.initialized = true;

    } catch (ex) {
      this.eventAggregator.publish('handleMessage',
        new EventConfig(`An error occurred starting the application: ${ex.message}`, EventMessageType.Exception));
    }

    return web3;
  }

  protected async loadAvatar(): Promise<DaoEx | undefined> {
    // tslint:disable-next-line: no-console
    // console.time('loadAvatar');

    const address = this.options.address || this.appConfig.get('daoAddress');

    if (!this.org || (address !== this.org.address)) {

      this.avatarLoaded = this.schemesLoaded = this.schemesLoading = false;
      this.avatarLoading = this.loading = true;
      this.org = undefined;

      if (address) {
        this.org = await this.daoService.daoAt(address);
      }

      if (this.org) {
        this.address = this.org.address;
        this.orgName = this.org.name;
        this.avatarLoaded = true;
      }

      this.avatarLoading = false;

      if (this.org) {
        // tslint:disable-next-line: no-console
        // console.timeStamp('Avatar Loaded');
        // so setSchemes won't start before we return
        setTimeout(() => this.eventAggregator.publish('Avatar.loaded', this.org), 0);
      } else {
        this.loading = false;
        this.networkConnectionWizards.run(false, true); // noop if already running
      }
    }

    // tslint:disable-next-line: no-console
    // console.timeEnd('loadAvatar');
    return this.org;
  }

  protected async loadSchemes(): Promise<boolean> {
    // tslint:disable-next-line: no-console
    // console.time('loadSchemes');

    this.schemesLoading = true;
    /**
     * Get all schemes associated with the DAO.  These can include non-Arc schemes.
     */
    const schemes = (await this.schemeService.getSchemesForDao(this.address));

    const nonArcSchemes = schemes.filter((s: SchemeInfo) => !s.inArc);

    // tslint:disable-next-line: no-console
    // console.time('findNonDeployedArcScheme');

    for (const scheme of nonArcSchemes) {
      const foundScheme = await this.findNonDeployedArcScheme(scheme);
      if (foundScheme) {
        schemes[schemes.indexOf(scheme)] = foundScheme;
      }
    }
    // tslint:disable-next-line: no-console
    // console.timeEnd('findNonDeployedArcScheme');

    this.dutchXSchemes = schemes.filter((s: SchemeInfo) => s.inArc && s.inDao)
      // hack to remove all but the dxDAO contracts
      .filter((s: SchemeInfo) => this.dutchXSchemeConfigs.has(s.name))
      .sort((a: SchemeInfo, b: SchemeInfo) =>
        this.dutchXSchemeConfigs.get(a.name).position - this.dutchXSchemeConfigs.get(b.name).position
      );

    this.dutchXSchemes.map((s) => { s.friendlyName = this.dutchXSchemeConfigs.get(s.name).description; });

    this.schemesLoaded = this.dutchXSchemes.length !== this.dutchXSchemeConfigs.keys.length;

    if (!this.schemesLoaded) {
      this.org = undefined;
      setTimeout(() => this.eventAggregator.publish('handleMessage',
        new EventConfig(`not all of the required contracts were found`, EventMessageType.Exception)), 0);
      this.networkConnectionWizards.run(false, true); // no-op if already running
    }

    this.schemesLoading = false;

    // tslint:disable-next-line: no-console
    // console.timeEnd('loadSchemes');

    return Promise.resolve(this.schemesLoaded);
  }

  protected getSchemeInfoFromName(name: string): ISchemeInfoX {
    return this.dutchXSchemes.filter((s: ISchemeInfoX) => {
      return s.name === name;
    })[0];
  }

  protected getSchemeWrapperFromName(name: string): Promise<Locking4ReputationWrapper> {
    const schemeAddress = this.getSchemeInfoFromName(name).address;
    return WrapperService.factories[name].at(schemeAddress);
  }

  private async findNonDeployedArcScheme(scheme: SchemeInfo): Promise<SchemeInfo | null> {
    // tslint:disable-next-line: no-console
    // // console.time('findNonDeployedArcScheme');
    // see: https://solidity.readthedocs.io/en/latest/metadata.html
    const end = 'a165627a7a72305820';
    let code = await (Promise as any).promisify((callback: any): any =>
      this.web3Service.web3.eth.getCode(scheme.address, callback))() as string;

    code = code.substr(0, code.indexOf(end));

    for (const wrapperName in WrapperService.nonUniversalSchemeFactories) {
      if (WrapperService.nonUniversalSchemeFactories.hasOwnProperty(wrapperName)) {
        const factory = WrapperService.nonUniversalSchemeFactories[wrapperName];
        if (factory && this.dutchXSchemeConfigs.has(wrapperName)) {
          /**
           * look in Arc contracts
           */
          let found: boolean;
          let contract = null;
          // tslint:disable-next-line:no-empty
          try { contract = await factory.ensureSolidityContract(); } catch { }
          if (contract) {
            const deployedBinary = contract.deployedBinary.substr(0, contract.deployedBinary.indexOf(end));
            found = code === deployedBinary;
          }

          if (found) {
            const wrapper = await factory.at(scheme.address);
            // tslint:disable-next-line: no-console
            // // console.timeEnd('findNonDeployedArcScheme');
            return SchemeInfo.fromContractWrapper(
              wrapper,
              true,
              scheme.blockNumber);
          }
        }
      }
    }
    // tslint:disable-next-line: no-console
    // // console.timeEnd('findNonDeployedArcScheme');
    return null;
  }
}

interface ISchemeInfoX extends SchemeInfo {
  numLocks?: number;
}

interface ISchemeConfig {
  description: string;
  hasActiveLocks: boolean;
  hasContract: boolean;
  icon?: string;
  icon_hover?: string;
  position: number;
}
