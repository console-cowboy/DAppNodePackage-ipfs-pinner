import mapKeys from "lodash/mapKeys";
import {
  PollSourceFunction,
  PollSourceFunctionArg,
  VerifySourceFunction,
  SourceAdd
} from "../types";
import fetchNewApmRepos from "../fetchers/fetchNewApmRepos";
import { splitMultiname, joinMultiname } from "../utils/multiname";
import fetchBlockNumber from "../fetchers/fetchBlockNumber";
import * as apmRepo from "./apmRepo";
import resolveEnsDomain from "../fetchers/fetchEnsAddress";
import { checkIfContractIsRegistry } from "../web3/checkIfContractIsRegistry";
import logs from "../logs";
import ensureAncientBlocks from "../web3/ensureAncientBlocks";

const repoBlacklist: { [name: string]: true } = {
  "testing.dnp.dappnode.eth": true,
  "telegram-mtpproto.dnp.dappnode.eth.dnp.dappnode.eth": true
};

/**
 * APM Registry
 *
 * type:
 * `apm-registry`
 *
 * multiname structure:
 * `/apm-registry/dnp.dappnode.eth`
 */

export interface ApmRegistry {
  name: string;
}

export const type = "apm-registry";
export const label = "APM registry";
export const fields = [{ id: "name", required: true, label: "Registry ENS" }];

export const parseMultiname = (multiname: string): ApmRegistry => {
  const [_type, name] = splitMultiname(multiname);
  if (_type !== type) throw Error(`multiname must be of type: ${type}`);
  if (!name) throw Error(`No "name" in multiname: ${multiname}`);
  return { name };
};

export const getMultiname = ({ name }: ApmRegistry): string => {
  if (!name) throw Error(`Arg "name" missing`);
  return joinMultiname([type, name]);
};

export const verify: VerifySourceFunction = async function(source: SourceAdd) {
  const { name } = parseMultiname(source.multiname);
  // Resolve name first to separate errors
  const address = await resolveEnsDomain(name);
  try {
    await checkIfContractIsRegistry(address);
  } catch (e) {
    logs.info(`${name} is not an APM registry: `, e);
    throw Error(`${name} is not an APM registry`);
  }

  try {
    await ensureAncientBlocks();
  } catch (e) {
    logs.info(`Can't add registry ${name}, no ancient blocks: `, e);
    throw Error(
      "Ancient blocks are not synced. APM registries rely on them to fetch new repos"
    );
  }
};

export const poll: PollSourceFunction = async function({
  source,
  currentOwnSources,
  internalState: lastBlock
}: PollSourceFunctionArg) {
  const { name } = parseMultiname(source.multiname);
  const fromBlock = parseInt(lastBlock);
  const newRepos = await fetchNewApmRepos(name, fromBlock);
  const currentLastBlock = await fetchBlockNumber();

  // Util to get the repoName full ENS domain
  const getName = (repo: { shortname: string }): string =>
    [repo.shortname, name].join(".");

  if (newRepos.length)
    logs.debug(`Fetched new repos from ${name}: ${newRepos.map(getName)}`);

  const currentRepos = mapKeys(currentOwnSources, ({ multiname }) => multiname);
  return {
    sourcesToAdd: newRepos
      .filter(repo => !repoBlacklist[getName(repo)])
      .map(repo => ({
        multiname: apmRepo.getMultiname({ name: getName(repo) })
      }))
      .filter(({ multiname }) => !currentRepos[multiname]),
    internalState: String(currentLastBlock)
  };
};
