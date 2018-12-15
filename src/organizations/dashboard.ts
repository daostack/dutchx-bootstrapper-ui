import { autoinject, computedFrom, singleton } from "aurelia-framework";
import { DaoService, DaoEx } from "../services/DaoService";
import {
  ArcService,
  Address,
  WrapperService,
  AccountService,
  InitializeArcJs,
  ConfigService,
  Web3,
  Utils,
  Locking4ReputationWrapper,
  LogLevel,
  LockInfo
} from "../services/ArcService";
import { SchemeService, SchemeInfo } from "../services/SchemeService";
import { Web3Service, BigNumber } from '../services/Web3Service';
import { EventAggregator } from 'aurelia-event-aggregator';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { AureliaConfiguration } from "aurelia-configuration";
import { DisposableCollection } from 'services/DisposableCollection';
import { NetworkConnectionWizards } from 'services/networkConnectionWizards';
import { EventConfigFailure, EventConfigException } from 'entities/GeneralEvents';
import { App } from 'app';
import { Utils as UtilsInternal } from 'services/utils';
import axios from "axios";
import { LockService } from "services/lockServices";

@singleton(false)
@autoinject
export class Dashboard {

  address: string;
  orgName: string;
  tokenSymbol: string;
  dutchXSchemes: Array<SchemeInfoX>;
  subscriptions = new DisposableCollection();
  avatarLoading: boolean = true;
  avatarLoaded: boolean = false;
  schemesLoaded: boolean = false;
  schemesLoading: boolean = false;
  dashboardElement: any;
  lockingPeriodEndDate: Date;
  fakeRedeem: boolean = false;
  canRedeem: boolean = this.fakeRedeem;
  networkName: string;
  options: { address?: Address };
  redeemables: Array<Redeemable> = new Array<Redeemable>();
  totalReputationAvailable: BigNumber;
  _loading: boolean = false;
  initialized: boolean = false;

  /**
   * true if loading the avatar or its schemes
   */
  @computedFrom("_loading")
  private get loading() {
    return this._loading;
  }

  private set loading(newValue: boolean) {
    if (newValue !== this._loading) {
      this.eventAggregator.publish("DAO.Loading", newValue);
      this._loading = newValue;
    }
  }

  private dutchXSchemeConfigs = new Map<string,
    { description: string, icon?: string, icon_hover?: string, position: number, hasActiveLocks: boolean }>([
      ["Auction4Reputation", {
        description: "BID GEN",
        icon: './gen_icon_color.svg',
        icon_hover: './gen_icon_white.svg',
        position: 4,
        hasActiveLocks: false
      }],
      ["ExternalLocking4Reputation", {
        description: "LOCK MGN",
        icon: './mgn_icon_color.svg',
        icon_hover: './mgn_icon_white.svg',
        position: 3,
        hasActiveLocks: false
      }],
      ["LockingEth4Reputation", {
        description: "LOCK ETH",
        icon: './eth_icon_color.svg',
        icon_hover: './eth_icon_white.svg',
        position: 1,
        hasActiveLocks: true
      }],
      ["LockingToken4Reputation", {
        description: "LOCK TOKENS",
        icon: './generic_icon_color.svg',
        icon_hover: './generic_icon_white.svg',
        position: 2,
        hasActiveLocks: true
      }],
    ]);

  public org: DaoEx;

  constructor(
    private daoService: DaoService
    , private web3: Web3Service
    , private schemeService: SchemeService
    , private web3Service: Web3Service
    , private eventAggregator: EventAggregator
    , private appConfig: AureliaConfiguration
    , private arcService: ArcService
    , private networkConnectionWizards: NetworkConnectionWizards
  ) {

    $(window).resize(this.fixScrollbar);
  }

  async initializeNetwork(): Promise<Web3 | undefined> {

    let web3: Web3;
    this.initialized = false;

    try {

      const networkName = await Utils.getNetworkName();
      this.appConfig.setEnvironment(networkName);

      ConfigService.set("logLevel",
        (networkName === "Live") ? LogLevel.info | LogLevel.warn | LogLevel.error : LogLevel.all);

      try {
        web3 = await InitializeArcJs({
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
      } catch (ex) {
        this.eventAggregator.publish("handleFailure", new EventConfigFailure(ex.message));
        try {
          // so we will at least be able to find out if we're connected and have a default account
          web3 = await Utils.getWeb3();
        } catch { }
      }

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

      await this.web3Service.initialize(web3);

      await this.arcService.initialize();

      this.initialized = true;

    } catch (ex) {
      console.log(`Error initializing network: ${ex}`);
      //const dialogService = aurelia.container.get(DialogService) as DialogService;
      // dialogService.alert(`Sorry, an error occurred initializing the application`)
    }

    return web3;
  }

  async activate(options: { address?: Address } = {}) {

    this.options = options;

    $("body").css("overflow", "hidden");

    /*******************
     * Handle account change.  Load a DAO if we don't already have one.
     * This should only happen when there was already a network and an account.
     */
    const subscription1 = AccountService.subscribeToAccountChanges(async (account: Address) => {
      await this.initializeNetwork();
      this.eventAggregator.publish("Network.Changed.Account", account);
      if (!this.org) {
        this.loadAvatar();
      } else {
        this.networkConnectionWizards.run(true, false);
        this.loadSchemes();
      }
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
      this.eventAggregator.publish("Network.Changed.Id", networkId);
      this.networkName = this.web3.networkName;
      if (this.fakeRedeem && this.web3Service.isConnected && (this.networkName === "Ganache")) {
        await UtilsInternal.increaseTime(100000000000, this.web3.web3);
      }
      await this.loadAvatar();
    });

    this.subscriptions.push({ dispose: () => subscription2.unsubscribe() });

    /*******************
     * Handle avatar loaded.  Load schemes.
     */
    this.subscriptions.push(this.eventAggregator.subscribe("Avatar.loaded", () => {
      this.loadSchemes().then((schemesLoaded: boolean) => {
        if (schemesLoaded) {
          this.eventAggregator.publish("DAO.loaded", this.org);
        }
      });
    }));

    this.subscriptions.push(this.eventAggregator.subscribe("Lock.Released", () => {
      this.computeNumLocks();
    }));

    this.subscriptions.push(this.eventAggregator.subscribe("Lock.Submitted", () => {
      this.computeNumLocks();
    }));

    if (!this.initialized) {
      await this.initializeNetwork();
    }

    if (this.initialized) {
      this.networkName = this.web3.networkName;

      /*******************
       * Start wizard if there is no DAO, otherwise we're good
       */
      if (!this.org) {
        /**
         * we'll handle events from here to load a DAO
         */
        this.networkConnectionWizards.run(false, false);
        this.loadAvatar();
      }
    } else { // an error occurred initializing
      /**
       * let the subscriptions above deal with everything
       */
      this.networkConnectionWizards.run(!!this.org, false);
    }
  }

  deactivate() {
    this.subscriptions.dispose();
    this.networkConnectionWizards.close(true);
  }

  async attached() {

    /** 
     * prevents some jitter
     */
    this.fixScrollbar();

    this.lockingPeriodEndDate = App.lockingPeriodEndDate;

    if (this.fakeRedeem && this.web3Service.isConnected && (this.networkName === "Ganache")) {
      await UtilsInternal.increaseTime(100000000000, this.web3.web3);
    }

    UtilsInternal.runTimerAtDate(this.fakeRedeem ? new Date() : this.lockingPeriodEndDate, () => {
      this.canRedeem = true;
      if (this.org) {
        this.computeRedeemables();
      }
      // $('#globalRedeemBtn').addClass('enabled');
    });

    const dashboard = $(this.dashboardElement);

    /**
     * css will reference the 'selected' class
     */
    dashboard.on('show.bs.collapse', '.scheme-dashboard', function (e: Event) {
      // ignore bubbles from nested collapsables
      if (!$(this).is(<any>e.target)) return;

      const button = $(e.target);
      const li = button.closest('li');
      li.addClass("selected");
    });

    dashboard.on('hide.bs.collapse', '.scheme-dashboard', function (e: Event) {
      // ignore bubbles from nested collapsables
      if (!$(this).is(<any>e.target)) return;

      const button = $(e.target);
      const li = button.closest('li');
      li.removeClass("selected");
    });

    this.polishDom();
  }

  async loadAvatar(): Promise<DaoEx | undefined> {
    const address = this.options.address || this.appConfig.get("daoAddress");

    if (!this.org || (address !== this.org.address)) {

      this.avatarLoaded = this.schemesLoaded = this.schemesLoading = false;
      this.avatarLoading = this.loading = true;
      this.org = undefined;

      if (address) {
        // DutchX hardcoded avatar
        this.org = await this.daoService.daoAt(address);
      }

      if (this.org) {
        this.address = this.org.address;
        this.orgName = this.org.name;
        this.avatarLoaded = true;
      }

      this.avatarLoading = false;
      this.polishDom();

      if (this.org) {
        this.eventAggregator.publish("Avatar.loaded", this.org);
      } else {
        this.loading = false;
        this.networkConnectionWizards.run(false, true); // noop if already running
      }
    }

    return this.org;
  }

  async loadSchemes(): Promise<boolean> {
    this.schemesLoading = this.loading = true;
    /**
     * Get all schemes associated with the DAO.  These can include non-Arc schemes.
     */
    let schemes = (await this.schemeService.getSchemesForDao(this.address));

    // add a fake non-Arc scheme
    // schemes.push(<SchemeInfo>{ address: "0x9ac0d209653719c86420bfca5d31d3e695f0b530" });

    const nonArcSchemes = schemes.filter((s: SchemeInfo) => !s.inArc);

    for (let i = 0; i < nonArcSchemes.length; ++i) {
      const scheme = nonArcSchemes[i];
      const foundScheme = await this.findNonDeployedArcScheme(scheme);
      if (foundScheme) {
        schemes[schemes.indexOf(scheme)] = foundScheme;
      }
    }

    this.dutchXSchemes = schemes.filter((s: SchemeInfo) => s.inArc && s.inDao)
      // DutchX: hack to remove all but the DutchX contracts
      .filter((s: SchemeInfo) => this.dutchXSchemeConfigs.has(s.name))
      .sort((a: SchemeInfo, b: SchemeInfo) =>
        this.dutchXSchemeConfigs.get(a.name).position - this.dutchXSchemeConfigs.get(b.name).position
      );

    this.dutchXSchemes.map((s) => { s.friendlyName = this.dutchXSchemeConfigs.get(s.name).description; });

    this.schemesLoaded = this.dutchXSchemes.length !== this.dutchXSchemeConfigs.keys.length;
    if (!this.schemesLoaded) {
      this.org = undefined;
      this.eventAggregator.publish("handleFailure", new EventConfigFailure(`not all of the required contracts were found`));
      this.networkConnectionWizards.run(false, true); // no-op if already running
    } else {

      await this.computeNumLocks();

      if (this.canRedeem) {
        await this.computeRedeemables();
      }
    }
    this.schemesLoading = this.loading = false;

    this.polishDom();

    return Promise.resolve(this.schemesLoaded);
  }

  private async findNonDeployedArcScheme(scheme: SchemeInfo): Promise<SchemeInfo | null> {
    // see: https://solidity.readthedocs.io/en/latest/metadata.html
    const end = "a165627a7a72305820";
    let code = await (<any>Promise).promisify((callback: any): any =>
      this.web3Service.web3.eth.getCode(scheme.address, callback))() as string;
    code = code.substr(0, code.indexOf(end));
    for (const wrapperName in WrapperService.nonUniversalSchemeFactories) {
      const factory = WrapperService.nonUniversalSchemeFactories[wrapperName];
      if (factory && this.dutchXSchemeConfigs.has(wrapperName)) {
        let found: boolean;
        // let bytecode = this.appConfig.get(`Contracts.${wrapperName}.bytecode`);

        // if (bytecode) {
        //   found = code === bytecode;
        //   if (!found) {
        /**
         * look in Arc contracts
         */
        let contract = null;
        try { contract = await factory.ensureSolidityContract(); } catch { }
        if (contract) {
          const deployedBinary = contract.deployedBinary.substr(0, contract.deployedBinary.indexOf(end));
          found = code === deployedBinary;
        }
        //}

        if (found) {
          const wrapper = await factory.at(scheme.address);
          return SchemeInfo.fromContractWrapper(wrapper, true);
        }
      }
    }
    return null;
  }

  private fixScrollbar() {

    const bodyHeight = $(window).height() || 0;
    const headerHeight = $('.header.navbar').height() || 0;
    const footerHeight = $('.footer.navbar').height() || 0;

    $('.dashboard-main-content').css(
      {
        "max-height": `${bodyHeight - headerHeight - footerHeight}px`
      });
  }

  private polishDom() {
    setTimeout(() => { this.fixScrollbar(); }, 0);
  }

  getDashboardView(scheme: SchemeInfo): string {
    let name: string;
    let isArcScheme = false;
    if (!scheme.inArc) {
      name = "NonArc";
    } else if (!scheme.inDao) {
      name = "NotRegistered";
    } else {
      name = scheme.name;
      isArcScheme = true;
    }

    if (isArcScheme && !App.hasDashboard(name)) {
      name = "UnknownArc";
    }
    return `../schemeDashboards/${name}`;
  }

  schemeDashboardViewModel(scheme: SchemeInfo): SchemeDashboardModel {
    return Object.assign({}, {
      org: this.org,
      orgName: this.orgName,
      orgAddress: this.address,
      tokenSymbol: this.tokenSymbol,
    },
      scheme)
  }

  // getSchemeIndexFromAddress(address: string, collection: Array<SchemeInfo>): number {
  //   let result = collection.filter((s) => s.address === address);
  //   if (result.length > 1) {
  //     throw new Error("getSchemeInfoWithAddress: More than one schemes found");
  //   }
  //   return result.length ? collection.indexOf(result[0]) : -1;
  // }

  getSchemeInfoFromName(name: string): SchemeInfoX {
    return this.dutchXSchemes.filter((s: SchemeInfoX) => {
      return s.name === name;
    })[0];
  }

  getSchemeWrapperFromName(name: string): Promise<Locking4ReputationWrapper> {
    const schemeAddress = this.getSchemeInfoFromName(name).address;
    return WrapperService.factories[name].at(schemeAddress)
  }

  @computedFrom("redeemables")
  get totalUserReputationEarned(): BigNumber {
    return this.redeemables.map((r: Redeemable): BigNumber => r.amount)
      .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
        return prev.add(curr);
      }, new BigNumber(0));
  }

  @computedFrom("totalUserReputationEarned", "totalReputationAvailable")
  get percentUserReputationEarned(): string {
    return this.totalUserReputationEarned.div(this.totalReputationAvailable).mul(100).toFixed(2).toString();
  }

  async computeRedeemables(): Promise<void> {

    let totalReputationAvailable = new BigNumber(0);
    const redeemables = new Array<Redeemable>();

    try {
      let schemeAddress = this.getSchemeInfoFromName("LockingEth4Reputation").address;
      let wrapper: Locking4ReputationWrapper = await WrapperService.factories.LockingEth4Reputation.at(schemeAddress);
      let earnedRep = await wrapper.getUserEarnedReputation({ lockerAddress: this.web3.defaultAccount });
      totalReputationAvailable = totalReputationAvailable.add(await wrapper.getReputationReward());

      if (earnedRep.gt(0)) {
        redeemables.push({
          what: "locked ETH",
          amount: earnedRep
        });
      }

      schemeAddress = this.getSchemeInfoFromName("ExternalLocking4Reputation").address;
      wrapper = await WrapperService.factories.ExternalLocking4Reputation.at(schemeAddress);
      earnedRep = await wrapper.getUserEarnedReputation({ lockerAddress: this.web3.defaultAccount });
      totalReputationAvailable = totalReputationAvailable.add(await wrapper.getReputationReward());

      if (earnedRep.gt(0)) {
        redeemables.push({
          what: "locked MGN tokens",
          amount: earnedRep
        });
      }

      schemeAddress = this.getSchemeInfoFromName("LockingToken4Reputation").address;
      wrapper = await WrapperService.factories.LockingToken4Reputation.at(schemeAddress);
      earnedRep = await wrapper.getUserEarnedReputation({ lockerAddress: this.web3.defaultAccount });
      totalReputationAvailable = totalReputationAvailable.add(await wrapper.getReputationReward());

      if (earnedRep.gt(0)) {
        redeemables.push({
          what: "other locked tokens",
          amount: earnedRep
        });
      }

      schemeAddress = this.getSchemeInfoFromName("Auction4Reputation").address;
      const auctionWrapper = await WrapperService.factories.Auction4Reputation.at(schemeAddress);
      const bids = await auctionWrapper.getBids(this.web3.defaultAccount);
      earnedRep = new BigNumber(0);
      for (const bid of bids) {
        earnedRep = earnedRep.add(await auctionWrapper.getUserEarnedReputation(
          { beneficiaryAddress: this.web3.defaultAccount, auctionId: bid.auctionId }));
      }
      totalReputationAvailable = totalReputationAvailable.add(await wrapper.getReputationReward());

      if (earnedRep.gt(0)) {
        redeemables.push({
          what: "GEN auctions",
          amount: earnedRep
        });
      }

      this.totalReputationAvailable = totalReputationAvailable;
      this.redeemables = redeemables;
    } catch (ex) {
      this.eventAggregator.publish("handleException",
        new EventConfigException(`Unable to compute earned reputation `, ex));
    }
  }

  async computeNumLocks(): Promise<void> {
    let wrapper = await this.getSchemeWrapperFromName("LockingEth4Reputation");
    let lockService = new LockService(this.appConfig, wrapper, this.web3Service.defaultAccount);
    let schemeInfo = this.getSchemeInfoFromName("LockingEth4Reputation");
    schemeInfo.numLocks = (await lockService.getUserLocks()).filter((li: LockInfo) => !li.released).length;

    wrapper = await this.getSchemeWrapperFromName("LockingToken4Reputation");
    lockService = new LockService(this.appConfig, wrapper, this.web3Service.defaultAccount);
    schemeInfo = this.getSchemeInfoFromName("LockingToken4Reputation");
    schemeInfo.numLocks = (await lockService.getUserLocks()).filter((li: LockInfo) => !li.released).length;
  }
}

interface Redeemable {
  what: string;
  amount: BigNumber;
}

interface SchemeInfoX extends SchemeInfo {
  numLocks?: number;
}
