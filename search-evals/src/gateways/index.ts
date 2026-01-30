/**
 * Gateway Registry - Resolves gateway names to implementations
 */

import type { SearchGateway } from "../types.js";
import { TavilyGateway } from "./tavily.js";
import { ParallelGateway } from "./parallel.js";
import { YouGateway } from "./you.js";

const gateways: Record<string, SearchGateway> = {
  tavily: new TavilyGateway(),
  parallel: new ParallelGateway(),
  you: new YouGateway(),
};

/**
 * Get a gateway implementation by name
 * @param name - The gateway name (e.g., "tavily", "parallel")
 * @returns The gateway implementation
 * @throws Error if the gateway is not found
 */
export function getGateway(name: string): SearchGateway {
  const gateway = gateways[name];
  if (!gateway) {
    const available = Object.keys(gateways).join(", ");
    throw new Error(`Unknown gateway: ${name}. Available gateways: ${available}`);
  }
  return gateway;
}

/**
 * Get all available gateway names
 */
export function getAvailableGateways(): string[] {
  return Object.keys(gateways);
}
