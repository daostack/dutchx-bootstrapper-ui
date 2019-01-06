import { autoinject } from 'aurelia-framework';
import { Address, ArcService, DaoTokenWrapper, StandardTokenWrapper, Utils, WrapperService } from './ArcService';
import { BigNumber, Web3Service } from './Web3Service';

@autoinject
export class TokenService {

  constructor(
    private web3: Web3Service
    , private arcService: ArcService,
  ) { }

  public async getDaoTokenSymbol(token: DaoTokenWrapper): Promise<string> {
    return await token.getTokenSymbol();
  }

  public async getDaoTokenName(token: DaoTokenWrapper): Promise<string> {
    return await token.getTokenName();
  }

  /**
   * in Wei by default
   * @param tokenAddress
   */
  public async getUserStandardTokenBalance(
    token: StandardTokenWrapper,
    inEth: boolean = false): Promise<BigNumber> {

    let userAddress = this.web3.defaultAccount;
    return this.getStandardTokenBalance(token, userAddress, inEth);
  }

  public async getUserTokenBalance(
    tokenAddress: Address,
    inEth: boolean = false): Promise<BigNumber> {

    let userAddress = this.web3.defaultAccount;

    return this.getTokenBalance(tokenAddress, userAddress, inEth);
  }

  public async getStandardTokenBalance(
    token: StandardTokenWrapper,
    accountAddress: Address,
    inEth: boolean = false): Promise<BigNumber> {

    let amount = await token.getBalanceOf(accountAddress);
    if (inEth) {
      amount = this.web3.fromWei(amount);
    }
    return amount;
  }

  public async getTokenBalance(
    tokenAddress: Address,
    accountAddress: Address,
    inEth: boolean = false): Promise<BigNumber> {

    const token = await this.getStandardToken(tokenAddress);

    if (!token) {
      return new BigNumber(0);
    }

    return this.getStandardTokenBalance(token, accountAddress, inEth);
  }

  public getGenTokenBalance(): Promise<BigNumber | undefined> {
    try {
      let userAddress = this.web3.defaultAccount;
      return DaoTokenWrapper.getGenTokenBalance(userAddress);
    } catch {
      // then we don't know the address of the GEN token
      return Promise.resolve(undefined);
    }
  }

  public async getGlobalGenToken(): Promise<StandardTokenWrapper | undefined> {
    const address = await Utils.getGenTokenAddress();
    return this.getStandardToken(address);
  }

  public getStandardToken(address: Address): Promise<StandardTokenWrapper> {
    return WrapperService.factories.StandardToken.at(address);
  }
}
