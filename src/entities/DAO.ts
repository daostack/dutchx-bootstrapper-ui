import { AureliaConfiguration } from 'aurelia-configuration';
import { LogManager } from 'aurelia-framework';
import { SchemeInfo } from '../entities/SchemeInfo';
import {
  ArcService,
  ControllerRegisterSchemeEventLogEntry,
  DAO,
  DaoSchemeInfo,
  DecodedLogEntryEvent,
  fnVoid,
  WrapperService,
} from '../services/ArcService';
import { BigNumber } from '../services/Web3Service';

export class DaoEx extends DAO {
  public static async fromArcJsDao(
    org: DAO,
    arcService: ArcService,
    appSettings: AureliaConfiguration
  ): Promise<DaoEx> {

    const newDAO = Object.assign(new DaoEx(), org);
    newDAO.arcService = arcService;
    newDAO.address = org.avatar.address;
    newDAO.name = org.name;
    newDAO.omega = await newDAO.reputation.getTotalSupply();
    newDAO.appSettings = appSettings;
    return newDAO;
  }

  public address: string;
  public name: string;
  public arcService: ArcService;
  public omega: BigNumber; // in wei
  public appSettings: AureliaConfiguration;

  private schemesCache: Map<string, SchemeInfo>;
  private logger = LogManager.getLogger('dxDAO Bootstrapper');

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
      this.logger.debug(`Finished loading schemes for ${this.name}: ${this.address}`);
    }

    return Array.from(this.schemesCache.values());
  }

  private async getCurrentSchemes(): Promise<Array<SchemeInfo>> {

    const filter = { _avatar: this.address };
    /**
     * temporary hack to make search for DAO schemes work faster and not crash metamask
     */
    // (networkName === 'Live') ? { _sender: '0x0A530100Affb0A06eDD2eD74e335aFC50624f345' } : {};

    const web3Options = {
      /**
       * temporary hack to make search for DAO schemes work faster and not crash metamask
       */
      fromBlock: this.appSettings.get('DxControllerBirthBlock') || 0,
      toBlock: 'latest',
    };

    /**
     * For performance: By not using this.getSchemes() we are assuming that none of the DAO's schemes will have been
     * unregistered and reregistered.  Thus we save some time by not calling controller.isSchemeRegistered().
     */
    const foundSchemes = new Array<DaoSchemeInfo>();
    const controller = this.controller;

    /**
     * Another hack to get the block number.  Makes a huge difference in timing.
     * This will work for any DAO created after this one, but not before.  It will
     * diminish in effectiveness as time goes by.
     */
    const registerSchemeEvent = controller.RegisterScheme(
      filter,
      web3Options
    );

    await new Promise((resolve: fnVoid, reject: (error: Error) => void): void => {
      registerSchemeEvent.get((
        err: Error,
        log: DecodedLogEntryEvent<ControllerRegisterSchemeEventLogEntry> |
          Array<DecodedLogEntryEvent<ControllerRegisterSchemeEventLogEntry>>) => {
        if (err) {
          return reject(err);
        }
        this.handleSchemeEvent(log, foundSchemes);
        return resolve();
      });
    });

    return foundSchemes
      .map((s: DaoSchemeInfo) => SchemeInfo.fromOrganizationSchemeInfo(s));
  }

  private handleSchemeEvent(
    log: DecodedLogEntryEvent<ControllerRegisterSchemeEventLogEntry> |
      Array<DecodedLogEntryEvent<ControllerRegisterSchemeEventLogEntry>>,
    schemes: Array<Partial<DaoSchemeInfo>>
  ): void {

    if (!Array.isArray(log)) {
      log = [log];
    }
    const count = log.length;
    for (let i = 0; i < count; i++) {
      const address = log[i].args._scheme;
      const wrapper = WrapperService.wrappersByAddress.get(address);

      if (!wrapper) { // none of the contracts we care about have been deployed by Arc
        const schemeInfo: Partial<DaoSchemeInfo> = {
          address,
          blockNumber: log[i].blockNumber,
          wrapper,
        };
        schemes.push(schemeInfo);
      }
    }
  }
}
