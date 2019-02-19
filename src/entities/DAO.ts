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
    org: DAO,
    arcService: ArcService,
    web3: Web3Service
  ): Promise<DaoEx> {

    const newDAO = Object.assign(new DaoEx(web3), org);
    newDAO.arcService = arcService;
    newDAO.address = org.avatar.address;
    newDAO.name = org.name;
    newDAO.omega = await newDAO.reputation.getTotalSupply();
    return newDAO;
  }

  public address: string;
  public name: string;
  public arcService: ArcService;
  public omega: BigNumber; // in wei

  private schemesCache: Map<string, SchemeInfo>;
  private logger = LogManager.getLogger('dxDAO Bootstrapper');

  /* this is not meant to be instantiated here, only in Arc */
  constructor(private web3: Web3Service) {
    super();
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
      this.logger.debug(`Finished loading schemes for ${this.name}: ${this.address}`);
    }

    return Array.from(this.schemesCache.values());
  }

  private async getCurrentSchemes(): Promise<Array<SchemeInfo>> {

    const networkName = this.web3.networkName;

    const filter =
      /**
       * temporary hack to make search for DAO schemes work faster and not crash metamask
       */
      (networkName === 'Live') ? { _sender: '0x0A530100Affb0A06eDD2eD74e335aFC50624f345' } : {};

    return (await super.getSchemes('', filter))
      .map((s: DaoSchemeInfo) => SchemeInfo.fromOrganizationSchemeInfo(s));
  }
}
