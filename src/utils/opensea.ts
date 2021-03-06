import LoginService from "./LoginService";
import { NFTMetadata } from "./common";
import { ethers } from "ethers";

const chainToDomain = new Map<number, string>([
    [1, "api.opensea.io"],
    [4, "rinkeby-api.opensea.io"],
]);

const BATCH_SIZE = 30;

function getDomain(): string {
    const chainId = LoginService.getInstance().chainId;
    const domain = chainId && chainToDomain.get(chainId);
    if (!domain) {
        throw Error(`Invalid chainId ${chainId}`);
    }
    return domain;
}

// https://docs.opensea.io/reference/getting-assets
async function getAssets(additionalParams: URLSearchParams): Promise<Array<NFTMetadata>> {
    const domain = getDomain();
    const url = new URL(`https://${domain}/api/v1/assets`);
    additionalParams.forEach((value, key) => {
        url.searchParams.append(key, value);
    });
    url.searchParams.append("order_direction", "desc");
    url.searchParams.append("offset", "0");
    url.searchParams.append("limit", BATCH_SIZE.toString());

    const options = { method: 'GET', headers: { Accept: 'application/json' } };
    const response = await fetch(url.toString(), options);
    if (!response.ok) {
        return Promise.reject(`Error ${response.status} while calling OpenSea API`);
    }
    return (await response.json()).assets.map((asset: any) => ({
        address: asset.asset_contract.address,
        tokenID: ethers.BigNumber.from(asset.token_id),
        name: asset.name,
        contractName: asset.asset_contract.name,
        imageURI: asset.image_preview_url
    }));
}

export function FetchOwnedNFTs(walletAddress: string): Promise<Array<NFTMetadata>> {
    return getAssets(new URLSearchParams({ "owner": walletAddress }));
}

// Takes partial tokens (only need to set address and tokenID) and returns full NFT metadata.
export async function FetchMetadata(tokens: Array<NFTMetadata>): Promise<Array<NFTMetadata>> {
    let promises : Promise<NFTMetadata[]>[] = [];

    let params = new URLSearchParams();
    let tokenCount = 0;
    for (const token of tokens) {
        if (tokenCount === BATCH_SIZE) {
            promises.push(getAssets(params));
            params = new URLSearchParams();
            tokenCount = 0;
        }
        params.append("asset_contract_addresses", token.address);
        params.append("token_ids", token.tokenID.toString());
        tokenCount++;
    }
    if (tokenCount > 0) {
        promises.push(getAssets(params));
    }

    // In case a promise fails (e.g. 429 throttled), keep responses from other promises.
    return Promise.allSettled(promises).then(results =>
        results.reduce((acc, result) => {
            if (result.status === "fulfilled") {
                return acc.concat(result.value);
            }
            return acc;
        }, [] as NFTMetadata[]));
}
