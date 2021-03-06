import { ContractWrapperInfo, DaoSchemeInfo } from '../services/ArcService';
/**
 * can be any scheme, in the DAO, not in the DAO, not even in Arc
 * In the DAO: has name/friendlyName, isRegistered is true
 * In Arc but not in the DAO:  has name, isRegistered is true
 * Not in Arc:  has no name, nor a friendlyName
 */
export class SchemeInfo extends ContractWrapperInfo {

  public static fromOrganizationSchemeInfo(orgSchemeInfo: DaoSchemeInfo) {
    const schemeInfo = new SchemeInfo();
    schemeInfo.address = orgSchemeInfo.address;
    schemeInfo.blockNumber = orgSchemeInfo.blockNumber;
    if (orgSchemeInfo.wrapper) {
      schemeInfo.name = orgSchemeInfo.wrapper.name;
      schemeInfo.friendlyName = orgSchemeInfo.wrapper.friendlyName;
    }
    schemeInfo.isRegistered = true;
    return schemeInfo;
  }

  public static fromContractWrapper(
    wrapper: ContractWrapperInfo,
    isRegistered: boolean,
    blockNumber: number): SchemeInfo {
    const schemeInfo = new SchemeInfo();
    schemeInfo.address = wrapper.address;
    schemeInfo.name = wrapper.name;
    schemeInfo.friendlyName = wrapper.friendlyName;
    schemeInfo.isRegistered = isRegistered;
    schemeInfo.blockNumber = blockNumber;
    return schemeInfo;
  }

  /**
   * block # when the scheme was registered with the DAO controller
   */
  public blockNumber: number;
  public isRegistered: boolean;
  public get inDao() { return this.isRegistered; }
  public get inArc() { return !!this.name; }
}
