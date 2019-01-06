import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfigException } from '../entities/GeneralEvents';
import { SchemeInfo } from '../entities/SchemeInfo';
import { DaoService } from '../services/DaoService';
import { ArcService, ContractWrapperInfo, SchemePermissions } from './ArcService';

@autoinject
export class SchemeService {

  /**
   * The Arc scheme contracts that we make available to the user
   */
  public availableSchemes: ContractWrapperInfo[];

  constructor(
    private arcService: ArcService
    , private daoService: DaoService
    , private eventAggregator: EventAggregator,
  ) {
    this.availableSchemes = this.arcService.arcSchemes;
  }

  /**
   * Return all Arc schemes, whether or not in the DAO, as SchemeInfos.
   *
   * SchemeInfo.isRegistered will indicate whether the scheme is in the DAO.
   * If not from Arc, then name and friendlyName will be empty.
   *
   * @param daoAddress
   * @param excludeNonArcSchemes Default is false
   */
  public async getSchemesForDao(daoAddress: string, excludeNonArcSchemes: boolean = false): Promise<SchemeInfo[]> {

    let schemes = (await this._getSchemesInDao(daoAddress)).filter((s) => !excludeNonArcSchemes || s.inArc);

    let schemesMap = new Map<string, SchemeInfo>();

    for (let scheme of schemes) {
      schemesMap.set(scheme.address, scheme);
    }

    /**
     * Now merge the list of schemes that the org has with the available Arc schemes that it doesn't have
     * so that the returned list contains all the schemes both contained and not contained by the Dao.
     */
    // let availableSchemes = this.availableSchemes;
    // for (let availableScheme of availableSchemes) {
    //   let isInDao = schemesMap.has(availableScheme.address);
    //   if (!isInDao) {
    //     schemes.push(SchemeInfo.fromContractWrapper(availableScheme, false));
    //   }
    // }

    return schemes;
  }

  /**
   * Schemes in the given DAO, as SchemeInfos.
   * If not from Arc, then name and friendlyName will be empty.
   *
   * @param daoAddress
   */
  private async _getSchemesInDao(daoAddress: string): Promise<SchemeInfo[]> {
    let dao = await this.daoService.daoAt(daoAddress);
    let schemes = await dao.allSchemes();
    return schemes;
  }
}

export { SchemeInfo } from '../entities/SchemeInfo';
