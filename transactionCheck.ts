import {ethers} from 'ethers';
let mint_event_signature = ethers.keccak256(ethers.toUtf8Bytes("Mint_event(uint256,address,uint256)"));
let publish_request_event_signature = ethers.keccak256(ethers.toUtf8Bytes("PulishRequest(uint256,uint256)"));
let approve_request_event_signature = ethers.keccak256(ethers.toUtf8Bytes("AcceptRequest(uint256)"));
let disapprove_request_event_signature = ethers.keccak256(ethers.toUtf8Bytes("DisapproveRequest(uint256,uint256)"));
let cancel_request_event_signature = ethers.keccak256(ethers.toUtf8Bytes("CancelRequest(uint256)"));
// **Note : Do not change the content of the mappings below
let mappings = {
    "0x0986d07dc5959c356b9ccd16af0e6a8bb3667fcf53d6e1162b5de6f8a33b77f7" : "mint_event_signature",
    "0x641cd3b70e0705aced039421747d9454dfca5dd7414c708d2220b204f0ca3d6e" : "publish_request_event_signature",
    "0x2b0ecfaeb40cae4f9eed0e8080364e42a2b0e3c38d7628426c8e2e5aa90cf0ce" : "approve_request_event_signature",
    "0x8ebfb26a29f5fa28c765f3055334874b6a5874387eda79cab6ccaa50ab8a74f8" : "disapprove_request_event_signature",
    "0x964b7303b4bad5535d8a5957f8004a3b1660c69e28bcf4acaf8722a98093ab26" : "cancel_request_event_signature"
}
let requestSignatures = [mint_event_signature,publish_request_event_signature, approve_request_event_signature, disapprove_request_event_signature, cancel_request_event_signature];
let signatureMappings = {
    mint_event_signature : [["uint256","token_id"] , ["address","recipient"] , ["uint256","amount"]], 
    publish_request_event_signature : [["uint256","token_id"] , ["uint256","request_id"]], 
    approve_request_event_signature : [["uint256","request_id"]], 
    disapprove_request_event_signature : [["uint256","request_id"]],
    cancel_request_event_signature : [["uint256","request_id"]] 
}

export async function getTransactionEvents(txHash: string, contractAddress: string, providerRpc: string){
    const provider = new ethers.JsonRpcProvider(providerRpc);
    let receipt = await provider.getTransactionReceipt(txHash);
    if(receipt == null){
        throw "Transaction not Found";
    }
    if(receipt.to != contractAddress){
        throw "Transaction not sent to contract";
    }
    if (receipt.status == 0) {
        throw "Transaction failed";
    }
    if (receipt.logs.length == 0) {
        throw "No events emitted";
    }
    for (let i = 0; i < receipt.logs.length; i++) {
        let log = receipt.logs[i];
        for (let j = 0; j < requestSignatures.length; j++) {
            let signature = requestSignatures[j];
            if(log.topics[0] == signature){
                let event = signatureMappings[mappings[signature]];
                let event_decoded = event.map((x: any[]) => x[0]);
                let decoded = ethers.AbiCoder.defaultAbiCoder().decode(event_decoded, log.data);
                let event_decoded_with_names : any[] = [];
                for (let k = 0; k < event.length; k++) {
                    event_decoded_with_names.push({name: event[k][1], value: decoded[k]});
                }
                return {event: mappings[signature].replace("_signature", ""), data: event_decoded_with_names};
            }
        }
    }
}