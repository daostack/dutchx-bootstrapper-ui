import { autoinject } from "aurelia-framework";
import { Web3Service, BigNumber } from "./Web3Service";
import { ArcService, Address, Erc20Wrapper, Utils, DaoTokenWrapper, WrapperService } from './ArcService';

@autoinject
export class TokenService {

  constructor(
    private web3: Web3Service
    , private arcService: ArcService
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
  public async getUserErc20TokenBalance(
    token: Erc20Wrapper,
    inEth: boolean = false): Promise<BigNumber> {

    let userAddress = this.web3.defaultAccount;
    return this.getErc20TokenBalance(token, userAddress, inEth);
  }

  public async getUserTokenBalance(
    tokenAddress: Address,
    inEth: boolean = false): Promise<BigNumber> {

    let userAddress = this.web3.defaultAccount;

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
      return new BigNumber(0);
    }

    return this.getErc20TokenBalance(token, accountAddress, inEth);
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

  public async getGlobalGenToken(): Promise<Erc20Wrapper | undefined> {
    const address = await Utils.getGenTokenAddress();
    return this.getErc20Token(address);
  }


  public getErc20Token(address: Address): Promise<Erc20Wrapper> {
    return WrapperService.factories.Erc20.at(address);
  }
}
