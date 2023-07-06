import {ethers} from 'ethers'
let erc721ABI = [{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"approve","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"mint","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"_data","type":"bytes"}],"name":"safeTransferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"transferFrom","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Transfer","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"approved","type":"address"},{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"operator","type":"address"},{"indexed":false,"internalType":"bool","name":"approved","type":"bool"}],"name":"ApprovalForAll","type":"event"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getApproved","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"ownerOf","outputs":[{"internalType":"address","name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"}];
/**
 * 
 * @param {string} NFTContractAddress 
 * @param {string} address 
 * @returns 
 */
export async function getAccountBalance(NFTContractAddress: string, address: string, network : "mainnet" | "testnet"){
    let jsonRpcProvider = network == "mainnet" ? "https://polygon-mainnet.infura.io" : "https://rpc-mumbai.maticvigil.com";
    let provider = new ethers.JsonRpcProvider(jsonRpcProvider);
    let contract = new ethers.Contract(NFTContractAddress, erc721ABI, provider);
    let balance = await contract.balanceOf(address);
    return Number(balance.toString());
}

/**
 * Gets the amount of tokens owned by the address in the contract_address
 * @param {string} contract_address 
 * @param {string} ownerAddress 
 * @returns 
 */
async function get_address_amount(contract_address: string, ownerAddress: string, network : "mainnet" | "testnet"){
    return Number(await getAccountBalance(contract_address, ownerAddress, network));
}

/**
 * @param {string} address 
 * @param {{addresses : [string], discountPercentage: number, nftsCount : number}} rule 
 * @param {*} reedemedNFTs 
 * @returns 
 */
async function nonGatedPassesRules(
    address: string,
    rule: { addresses: [string]; discountPercentage: number; nftsCount: number;},
    reedemedNFTs: any,
    network : "mainnet" | "testnet",
){
    let total_amount = 0;
    let NFTsPassed : string[] = [];
    for (let i = 0 ; i < rule.addresses.length; i++){
        let contract_address = rule.addresses[i];
        let nftAmount = await get_address_amount(contract_address, address,network);
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
 * @param {{redeemedNFTs: [*], gated : boolean , rules: [{addresses : [string], discountPercentage: number, nftsCount : number}]}} ruleset 
 * @returns { Promise<{discountPercentage : number, NFTsPassed : [string]}> } the discount percentage and the NFTs that passed the rules
 */
async function getMaxDiscount(address: string, ruleset: { redeemedNFTs: [any]; gated: boolean; rules: [{ addresses: [string]; discountPercentage: number; nftsCount: number; }]; }, network : "mainnet" | "testnet" = "testnet"): Promise<{ discountPercentage: number; NFTsPassed: string[]; }>{
    let max_discount : {
        discountPercentage : number,
        NFTsPassed : string[]
    } = {
        discountPercentage :0,
        NFTsPassed : []
    };
    ruleset.rules.sort((a,b) => {
        return b.discountPercentage - a.discountPercentage;
    });
    for (let i = 0 ; i < ruleset.rules.length; i++){
        let rule = ruleset.rules[i];
        const result = await nonGatedPassesRules(address, rule, ruleset.redeemedNFTs, network);
        if (result.passes){
            max_discount = {
                discountPercentage: rule.discountPercentage,
                NFTsPassed : result.NFTsPassed
            };
            break;
        }
    }
    return max_discount;
}
/**
 * 
 * @param {string} address 
 * @param {{redeemedNFTs: [*], gated : boolean , rules: [{addresses : [string], discountPercentage: number, nftsCount : number}]}} ruleset 
 * @returns {Promise<boolean>} true if the address passes any of the rules in the ruleset 
*/
const gatedPassesRules = async(
    address: string,
    ruleset: { redeemedNFTs: [any]; gated: boolean; rules: [{ addresses: [string]; discountPercentage: number; nftsCount: number; }]; },
    network : "mainnet" | "testnet" = "testnet"
): Promise<boolean> => {
    let passes = false;
    for (let i = 0 ; i < ruleset.rules.length; i++){
        let rule = ruleset.rules[i];
        let total_amount = 0;
        for (let j = 0 ; j < rule.addresses.length; j++){
            let contract_address = rule.addresses[j];
            let amount = await get_address_amount(contract_address, address,network);
            total_amount += amount;
        }
        passes = total_amount >= rule.nftsCount;
        if (passes)
            break;
    }
    return passes;
}

export { getMaxDiscount, gatedPassesRules }