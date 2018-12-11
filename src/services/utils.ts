import { fnVoid } from 'services/ArcService';
import { BlockWithoutTransactionData, Web3 } from 'web3';

export class Utils {
  public static sleep(milliseconds: number): Promise<any> {
    return new Promise((resolve: fnVoid): any => setTimeout(resolve, milliseconds));
  }

  public static getObjectKeys(obj: any): Array<string> {
    let temp = [];
    for (let prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        temp.push(prop);
      }
    }
    return temp;
  }

  /**
   * Returns the last mined block in the chain.
   */
  public static async lastBlockDate(web3: Web3): Promise<Date> {
    let block;
    do {
      block = await (<any>Promise).promisify((callback: any): any =>
        web3.eth.getBlock("latest", callback))() as BlockWithoutTransactionData;
    }
    while (!block);

    return new Date(block.timestamp * 1000);
  }

  public static increaseTime(duration: number, web3: Web3): Promise<void> {

    const id = new Date().getTime();

    return new Promise((resolve: (res: any) => any, reject: (err: any) => any): void => {
      web3.currentProvider.sendAsync({
        id,
        jsonrpc: "2.0",
        method: "evm_increaseTime",
        params: [duration],
      }, (err1: any) => {
        if (err1) { return reject(err1); }

        web3.currentProvider.sendAsync({
          id: id + 1,
          jsonrpc: "2.0",
          method: "evm_mine",
        }, (err2: any, res: any): void => {
          return err2 ? reject(err2) : resolve(res);
        });
      });
    });
  }

  /**
   * run a timer after a count of milliseconds greater than the 32-bit max that chrome can handle
   * @param date 
   * @param func 
   */
  public static runTimerAtDate(date, func) {
    var now = (new Date()).getTime();
    var then = date.getTime();
    var diff = Math.max((then - now), 0);
    if (diff > 0x7FFFFFFF) //setTimeout limit is MAX_INT32=(2^31-1)
      setTimeout(() => { Utils.runTimerAtDate(date, func); }, 0x7FFFFFFF);
    else
      setTimeout(func, diff);
  }
}
