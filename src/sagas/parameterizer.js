import { call, put, takeEvery, apply } from 'redux-saga/effects'
import TCR from '../TCR';
import {
	UPDATE_PARAMETERIZER_INFORMATION,
	REQUEST_PARAMETERIZER_INFORMATION,
	PROPOSE_NEW_PARAMETER_VALUE,
  PARAMETERIZER_SHOW_TX_QUEUE,
  PROCESS_PROPOSAL
} from '../constants/actions'
import api from '../services/BackendApi'
import {
	proposeNewParameterizerValue as getProposeNewParameterizerValue,
	processProposal as getProcessProposal,
} from '../transactions'
import keys from '../i18n';
import { getProposalValue, getReadableStatus } from '../utils/Parameterizer'

const paramsList = [
	{
		displayName: keys.tableParameterNames[0],
		contractName: keys.contractParameterNames[0],
	},
	{
		displayName: keys.tableParameterNames[1],
		contractName: keys.contractParameterNames[1],
	},
	{
		displayName: keys.tableParameterNames[2],
		contractName: keys.contractParameterNames[2],
	},
	{
		displayName: keys.tableParameterNames[3],
		contractName: keys.contractParameterNames[3],
	},
	{
		displayName: keys.tableParameterNames[4],
		contractName: keys.contractParameterNames[4],
	},
	{
		displayName: keys.tableParameterNames[5],
		contractName: keys.contractParameterNames[5],
	},
]

export function * fetchParameters () {
  const parameterizer = yield apply(TCR.registry(), 'getParameterizer');

  const proposalEvents = yield apply(
    api,
    'getParameterizerProposals',
    [parameterizer.address, TCR.defaultAccountAddress()]
  )

  const proposals = proposalEvents.map(p => ({
		name: p.returnValues.name,
		value: p.returnValues.value,
  }))

  const params = yield paramsList.map(function * (p) {
    const proposal = getProposalValue(proposals, p.contractName)
    const value = yield apply(parameterizer, 'get', [p.contractName])
    let status = keys.inRegistry
    let challengeId = null
    let voteResults = {
      votesFor: 0,
      votesAgaints: 0
    }

    if (proposal) {
      // get status & challengeId
      const proposalInstance = yield apply(parameterizer, 'getProposal', [p.contractName, proposal])
      const statusFromContract = yield apply(proposalInstance, 'getStageStatus')
      status = getReadableStatus(statusFromContract)
      challengeId = yield apply(proposalInstance, 'getChallengeId')
      console.log('challengeId', challengeId)

      // get vote results
      const plcr = yield apply(TCR, 'getPLCRVoting')
      const poll = yield apply(plcr, 'getPoll', [challengeId])
      voteResults = {
        votesFor: yield apply(poll, 'getVotesFor'),
        votesAgaints: yield apply(poll, 'getVotesAgainst')
      }
    }

    return { ...p, proposal, status, value, challengeId, voteResults } 
  })

  yield put({ type: UPDATE_PARAMETERIZER_INFORMATION, params });
}

export function* proposeNewParameterizerValue(action) {
  let parameterizer = yield apply(TCR.registry(), "getParameterizer");
  let pMinDeposit = yield apply(parameterizer, "get", ["pMinDeposit"]);
  let queue = yield call(getProposeNewParameterizerValue, action.parameter.contractName, action.value, pMinDeposit);

  yield put({ type: PARAMETERIZER_SHOW_TX_QUEUE, queue });
}

export function* processProposal(action) {
  console.log('processProposal to be implemented', action)
  // const { contractName, proposal } = action.proposal
  // const proposalInstance = yield apply(parameterizer, 'getProposal', [contractName, proposal])
  // // const queue = 
  // yield apply(proposalInstance, 'process');

  // // yield put({ type: PARAMETERIZER_SHOW_TX_QUEUE, queue });
}

export default function * flow () {
  yield takeEvery(REQUEST_PARAMETERIZER_INFORMATION, fetchParameters);
  yield takeEvery(PROPOSE_NEW_PARAMETER_VALUE, proposeNewParameterizerValue);
  yield takeEvery(PROCESS_PROPOSAL, processProposal);
}
