import { autoinject } from 'aurelia-framework';
import {
  Address,
  DaoTokenWrapper,
  Erc20Wrapper,
  LockingToken4ReputationWrapper,
  Utils,
  WrapperService
} from './ArcService';
import { BigNumber, Web3Service } from './Web3Service';

@autoinject
export class TokenService {

  constructor(
    private web3: Web3Service
  ) { }

  public async getTokenIsLiquid(token: Address, tokenLocker: LockingToken4ReputationWrapper): Promise<boolean> {
    return (await this.getTokenPriceFactor(token, tokenLocker)) !== null;
  }

  public async getTokenPriceFactor(
    token: Address,
    tokenLocker: LockingToken4ReputationWrapper): Promise<BigNumber | null> {

    const oracleAddress = await tokenLocker.getPriceOracleAddress();

    const oracle = (await Utils.requireContract('PriceOracleInterface')).at(oracleAddress);

    const price = (await oracle.getPrice(token)) as Array<BigNumber>;

    if (price && (price.length === 2) && price[0].gt(0) && price[1].gt(0)) {
      return price[0].div(price[1]);
    } else {
      return null;
    }
  }

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
  public async getUserErc20TokenBalance(
    token: Erc20Wrapper,
    inEth: boolean = false): Promise<BigNumber> {

    const userAddress = this.web3.defaultAccount;
    return this.getErc20TokenBalance(token, userAddress, inEth);
  }

  public async getUserTokenBalance(
    tokenAddress: Address,
    inEth: boolean = false): Promise<BigNumber> {

    const userAddress = this.web3.defaultAccount;

    return this.getTokenBalance(tokenAddress, userAddress, inEth);
  }

  public async getErc20TokenBalance(
    token: Erc20Wrapper,
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

    const token = await this.getErc20Token(tokenAddress);

    if (!token) {
      return null;
    }

    return this.getErc20TokenBalance(token, accountAddress, inEth);
  }

  public getGenTokenBalance(): Promise<BigNumber | undefined> {
    try {
      const userAddress = this.web3.defaultAccount;
      return DaoTokenWrapper.getGenTokenBalance(userAddress);
    } catch {
      // then we don't know the address of the GEN token
      return Promise.resolve(undefined);
    }
  }

  public async getGlobalGenToken(): Promise<Erc20Wrapper | undefined> {
    const address = await Utils.getGenTokenAddress();
    return this.getErc20Token(address);
  }

  public getErc20Token(address: Address): Promise<Erc20Wrapper> {
    return WrapperService.factories.Erc20.at(address);
  }
}
