import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { Address, ArcService, ProposalGeneratorBase } from './ArcService';

@autoinject
export class ProposalService {
  constructor(
    private arcService: ArcService
    , private eventAggregator: EventAggregator,
  ) {
  }

  public async getVotableProposals(
    scheme: ProposalGeneratorBase,
    daoAddress: Address) {
    const votingMachine = await scheme.getVotingMachine(daoAddress);
    const watcher = votingMachine.VotableProposals({}, { fromBlock: 'latest' });
    return watcher.get();
  }
}
