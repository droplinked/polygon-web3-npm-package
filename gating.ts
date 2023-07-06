import * as Moralisd from 'moralis'
let Moralis = Moralisd.default;
let isMoralisInitialized = false;
export async function getAccountBalance(NFTContractAddress: string, address: any, network : "polygon-testnet" | "polygon-mainnet" | "binance-testnet" | "binance-mainnet"): Promise<number>{
    let chain : any = null;
    switch (network){
        case "polygon-testnet":
            chain = Moralis.EvmUtils.EvmChain.MUMBAI;
            break;
        case "polygon-mainnet":
            chain = Moralis.EvmUtils.EvmChain.POLYGON;
            break;
        case "binance-testnet":
            chain = Moralis.EvmUtils.EvmChain.BSC_TESTNET;
            break;
        case "binance-mainnet":
            chain = Moralis.EvmUtils.EvmChain.BSC;
        default:
            throw new Error("Invalid network");
    }

    const response = await Moralis.EvmApi.nft.getWalletNFTs({
        "address" : address,
        "chain" : chain,
    });
    return (response as any).toJSON().result.filter((value: { token_address: string; }) => value.token_address.toLowerCase() == NFTContractAddress.toLowerCase()).length;
}

/**
 * Gets the amount of tokens owned by the address in the contract_address
 * @param {string} contract_address 
 * @param {string} ownerAddress 
 * @returns 
 */
async function get_address_amount(contract_address: string, ownerAddress: any, network : "polygon-testnet" | "polygon-mainnet" | "binance-testnet" | "binance-mainnet"): Promise<number>{
    return Number(await getAccountBalance(contract_address, ownerAddress, network));
}

/**
 * @param {string} address 
 * @param {{addresses : [string], discountPercentage: number, nftsCount : number , description:string, _id : string}} rule 
 * @param {*} reedemedNFTs 
 * @returns 
 */
async function nonGatedPassesRules(
    address: any,
    rule: { addresses: string | any[]; nftsCount: number; },
    reedemedNFTs: string | any[],
    network : "polygon-testnet" | "polygon-mainnet" | "binance-testnet" | "binance-mainnet"
): Promise<{ passes: boolean; NFTsPassed: string[]; }>{
    let total_amount = 0;
    let NFTsPassed : string[] = [];
    for (let i = 0 ; i < rule.addresses.length; i++){
        let contract_address = rule.addresses[i];
        let nftAmount = await get_address_amount(contract_address, address, network);
        total_amount += nftAmount;
        if (!reedemedNFTs.includes(contract_address) && nftAmount!=0){
            NFTsPassed.push(contract_address);
        }
    }
    return {
        passes : total_amount >= rule.nftsCount,
        NFTsPassed : NFTsPassed
    }
}
/**
 * Checks if the address passes any of the rules in the ruleset sorted by discount percentage
 * @param {string} address 
 * @param {{redeemedNFTs: [*], gated : boolean , rules: [{addresses : [string], discountPercentage: number, nftsCount : number , description:string, _id : string}]}} ruleset 
 * @returns { Promise<{discountPercentage : number, NFTsPassed : [string]}> } the discount percentage and the NFTs that passed the rules
 */
async function getMaxDiscount(address: any, ruleset: { rules: any[]; redeemedNFTs: any; }, apiKey : string, network : "polygon-testnet" | "polygon-mainnet" | "binance-testnet" | "binance-mainnet"): Promise<{ discountPercentage: number; NFTsPassed: string[]; }>{
    if (!isMoralisInitialized){
        await Moralis.start({
            apiKey: apiKey,
        });
        isMoralisInitialized = true;
    }
    const max_discount = {
        discountPercentage :0,
        NFTsPassed : []
    };
    ruleset.rules.sort((a: { discountPercentage: number; },b: { discountPercentage: number; }) => {
        return b.discountPercentage - a.discountPercentage;
    });
    for (let i = 0 ; i < ruleset.rules.length; i++){
        let rule = ruleset.rules[i];
        const result = await nonGatedPassesRules(address, rule, ruleset.redeemedNFTs, network);
        if (result.passes){
            return {
                discountPercentage: rule.discountPercentage,
                NFTsPassed : result.NFTsPassed
            };
        }
    }
    return max_discount;
}
/**
 * 
 * @param {string} address 
 * @param {{redeemedNFTs: [*], gated : boolean , rules: [{addresses : [string], discountPercentage: number, nftsCount : number , description:string, _id : string}]}} ruleset 
 * @returns {Promise<boolean>} true if the address passes any of the rules in the ruleset 
*/
async function gatedPassesRules(address: any,
    ruleset: { rules: string | any[]; }, apiKey : string, network : "polygon-testnet" | "polygon-mainnet" | "binance-testnet" | "binance-mainnet"): Promise<boolean> {
    if (!isMoralisInitialized){
        await Moralis.start({
            apiKey: apiKey,
        });
        isMoralisInitialized = true;
    }

    let passes = false;
    for (let i = 0; i < ruleset.rules.length; i++) {
        let rule = ruleset.rules[i];
        let total_amount = 0;
        for (let j = 0; j < rule.addresses.length; j++) {
            let contract_address = rule.addresses[j];
            let amount = await get_address_amount(contract_address, address, network);
            total_amount += amount;
        }
        passes = total_amount >= rule.nftsCount;
        if (passes)
            break;
    }
    return passes;
}

export { getMaxDiscount, gatedPassesRules }