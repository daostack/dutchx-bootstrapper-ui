import { includeEventsIn } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { LogManager } from 'aurelia-framework';
import { Web3Service } from 'services/Web3Service';
import { DaoEx } from '../entities/DAO';
import {
  ArcService,
  DAO
} from './ArcService';

@autoinject
export class DaoService {

  private daoCache = new Map<string, DaoEx>();
  private logger = LogManager.getLogger('dxDAO Bootstrapper');
  constructor(
    private arcService: ArcService,
    private web3: Web3Service
  ) {
    includeEventsIn(this);
  }

  public async daoAt(
    avatarAddress: string,
    takeFromCache: boolean = true
  ): Promise<DaoEx> {
    let dao: DaoEx;
    const cachedDao = this.daoCache.get(avatarAddress);

    if (!takeFromCache || !cachedDao) {
      try {
        const org = await DAO.at(avatarAddress);

        if (org) {
          dao = await DaoEx.fromArcJsDao(org, this.arcService, this.web3);
          this.logger.debug(`loaded dao ${dao.name}: ${dao.address}`);
        } // else error will already have been logged by arc.js
      } catch (ex) {
        // don't force the user to see this as a snack every time.
        // A corrupt DAO may never be repaired.  A message will go to the console.
        this.logger.error(`Error loading DAO: ${avatarAddress}: ${ex}`);
        return null;
      }
    } else {
      dao = cachedDao;
    }

    if (dao && !cachedDao) {
      this.daoCache.set(dao.address, dao);
    }

    return dao;
  }
}

export { DaoEx } from '../entities/DAO';
