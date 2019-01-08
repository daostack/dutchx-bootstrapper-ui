import { includeEventsIn, Subscription } from 'aurelia-event-aggregator';
import { LogManager } from 'aurelia-framework';
import { SchemeInfo } from '../entities/SchemeInfo';
import {
  ArcService,
  DAO,
  DaoSchemeInfo,
} from '../services/ArcService';
import { BigNumber, Web3Service } from '../services/Web3Service';

export class DaoEx extends DAO {
  public static async fromArcJsDao(
      org: DAO
    , arcService: ArcService
  ): Promise<DaoEx> {

    const newDAO = Object.assign(new DaoEx(), org);
    newDAO.arcService = arcService;
    newDAO.address = org.avatar.address;
    newDAO.name = org.name;
    newDAO.omega = await newDAO.reputation.getTotalSupply();
    return newDAO;
  }

  /**
   * a Scheme has been added or removed from a DAO.
   */
  private static daoSchemeSetChangedEvent: string = 'daoSchemeSetChanged';

  public address: string;
  public name: string;
  public arcService: ArcService;
  public omega: BigNumber; // in wei

  private schemesCache: Map<string, SchemeInfo>;
  private registerSchemeEvent;
  private unRegisterSchemeEvent;
  private logger = LogManager.getLogger('DxBootStrapper');

  /* this is not meant to be instantiated here, only in Arc */
  constructor() {
    super();
    includeEventsIn(this);
  }

  /**
   * returns all the schemes in the Dao.
   * Keeps them cached and always up-to-date.  Do not confuse with super.schemes().
   */
  public async allSchemes(): Promise<Array<SchemeInfo>> {
    if (!this.schemesCache) {
      this.schemesCache = new Map<string, SchemeInfo>();
      const schemes = await this.getCurrentSchemes();
      for (const scheme of schemes) {
        this.schemesCache.set(scheme.address, scheme);
      }
      this.watchSchemes();
      this.logger.debug(`Finished loading schemes for ${this.name}: ${this.address}`);
    }

    return Array.from(this.schemesCache.values());
  }

   /**
    * Publishes a message.
    * @param event The event or channel to publish to.
    * @param data The data to publish on the channel.
    */
  public publish(_event: string | any, _data?: any): void { return null; }

   /**
    * Subscribes to a message channel or message type.
    * @param event The event channel or event data type.
    * @param callback The callback to be invoked when when the specified message is published.
    */
  // tslint:disable-next-line: ban-types
  public subscribe(_event: string | Function, _callback: Function): Subscription { return null; }

   /**
    * Subscribes to a message channel or message type,
    * then disposes the subscription automatically after the first message is received.
    * @param event The event channel or event data type.
    * @param callback The callback to be invoked when when the specified message is published.
    */
  // tslint:disable-next-line: ban-types
  public subscribeOnce(_event: string | Function, _callback: Function): Subscription { return null; }

  public dispose() {
    this.registerSchemeEvent.stopWatching();
    this.unRegisterSchemeEvent.stopWatching();
  }

  private async getCurrentSchemes(): Promise<Array<SchemeInfo>> {
    return (await super.getSchemes()).map((s: DaoSchemeInfo) => SchemeInfo.fromOrganizationSchemeInfo(s));
  }

  private watchSchemes(): void {
    this.registerSchemeEvent = this.controller.RegisterScheme({ _avatar: this.address }, { fromBlock: 'latest' });
    this.registerSchemeEvent.watch((err, eventsArray) => this.handleSchemeEvent(err, eventsArray, true));

    this.unRegisterSchemeEvent = this.controller.UnregisterScheme({ _avatar: this.address }, { fromBlock: 'latest' });
    this.unRegisterSchemeEvent.watch((err, eventsArray) => this.handleSchemeEvent(err, eventsArray, false));
  }

  private async handleSchemeEvent(_err, eventsArray, adding: boolean): Promise<void> {
    const newSchemesArray = [];
    if (!(eventsArray instanceof Array)) {
      eventsArray = [eventsArray];
    }
    const count = eventsArray.length;
    for (let i = 0; i < count; i++) {
      const schemeAddress = eventsArray[i].args._scheme;
      let contractWrapper = this.arcService.contractWrapperFromAddress(schemeAddress) as any;

      if (!contractWrapper) {
        // then it is a non-arc scheme or TODO:
        // is an Arc scheme that is older or newer than the one Arc is telling us about
        contractWrapper = { address: schemeAddress } as any;
      }

      const schemeInfo = SchemeInfo.fromContractWrapper(contractWrapper, adding);
      let changed = false;
      // TODO: get unknown name from Arc
      if (adding && !this.schemesCache.has(schemeAddress)) {
        changed = true;
        this.logger.debug(`caching scheme: ${contractWrapper.name ? contractWrapper.name : '[unknown]'}:
         ${contractWrapper.address}`);
        this.schemesCache.set(schemeAddress, schemeInfo);
      } else if (!adding && this.schemesCache.has(schemeAddress)) {
        changed = true;
        this.logger.debug(`uncaching scheme: ${contractWrapper.name ? contractWrapper.name : '[unknown]'}:
         ${contractWrapper.address}`);
        this.schemesCache.delete(schemeAddress);
      }

      if (changed) {
        this.publish(DaoEx.daoSchemeSetChangedEvent,
          {
            dao: this,
            scheme: schemeInfo,
          });
      }
    }
  }
}
