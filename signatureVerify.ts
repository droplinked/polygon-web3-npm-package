import { recoverPersonalSignature } from 'eth-sig-util'
export function verifyEVMSignature(address: string, signature: string): boolean{
    let recoveredAddress = recoverPersonalSignature({
        data : "Please sign this message to let droplinked view your PublicKey & Address and validate your identity",
        sig : signature
    });
    return recoveredAddress.toLowerCase() == address.toLowerCase();
}