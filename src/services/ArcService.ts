import * as Arc from '@daostack/arc.js';
import { autoinject } from 'aurelia-framework';

import { EventAggregator } from 'aurelia-event-aggregator';
import { LogManager } from 'aurelia-framework';
import TruffleContract from 'truffle-contract';
import { EventConfigException, SnackLifetime } from '../entities/GeneralEvents';

@autoinject
export class ArcService {

  public logger = LogManager.getLogger('DxBootStrapper');

  /**
   * The schemes managed by Arc
   */
  public arcContracts: Arc.ArcWrappers;
  public arcSchemes: Arc.IContractWrapper[];
  public arcVotingMachines: Arc.IContractWrapper[];
  public arcGlobalConstraints: Arc.IContractWrapper[];
  /**
   * maps address to ContractInfo
   */
  private arcContractMap: Map<string, Arc.ContractWrapperBase | TruffleContract>;

  public async initialize() {
    let wrappersByType = await Arc.WrapperService.wrappersByType;
    let wrappers = Arc.WrapperService.wrappers;

    this.arcContracts = wrappers;
    this.arcSchemes = wrappersByType.universalSchemes;
    this.arcVotingMachines = wrappersByType.votingMachines;
    this.arcGlobalConstraints = wrappersByType.globalConstraints;
    this.arcContractMap = Arc.WrapperService.wrappersByAddress;
  }
  /**
   * Returns the wrapper at the given address, undefined if not found.
   * @param address only returns wrappers for contracts deployed by the running version of Arc.js
   */
  public contractWrapperFromAddress(address: string): Arc.ContractWrapperBase {
    return this.arcContractMap.get(address) as Arc.ContractWrapperBase;
  }
}

export class ContractWrapperInfo {
  public address: string;
  public friendlyName: string;
  public name: string;
}

export * from '@daostack/arc.js';
export { TruffleContract } from 'truffle-contract';
