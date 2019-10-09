import io from "socket.io-client";
import { SourceOption, ClusterPeer } from "./types";

const apiUrl = window.location.origin;
console.log(`Connecting socket.io-client to: ${apiUrl}`);

const socket = io(apiUrl);

/**
 * Factory for socket.io "routes".
 * Each route must provide and argument and receive one return argument
 * through a mandatory acknowledgment function
 *
 * @param routePath
 */
function socketGet<T, R>(routePath: string) {
  return function(arg: T): Promise<R> {
    return new Promise((resolve, reject) => {
      socket.emit(routePath, arg, (res: { error: string; data: R }) => {
        if (res.error) reject(Error(res.error));
        else resolve(res.data);
      });
    });
  };
}

export const getOptions = socketGet<undefined, SourceOption[]>("options");
export const getPeers = socketGet<undefined, ClusterPeer[]>("peers");
export const addSource = socketGet<string, null>("addSource");
export const delSource = socketGet<string, null>("delSource");
export const refresh = socketGet<undefined, null>("refresh");

export default socket;