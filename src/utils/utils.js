import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import { Buffer } from 'buffer';

export async function createOsmosisWallet(privateKeyHex) {
    try {
        // Strip '0x' prefix and convert hex string to Uint8Array
        const privateKey = Uint8Array.from(Buffer.from(privateKeyHex.replace(/^0x/, ""), "hex"));

        // Create the wallet with Osmosis prefix
        const wallet = await DirectSecp256k1Wallet.fromKey(privateKey, "osmo");

        // Get the first account (address) from the wallet
        const [account] = await wallet.getAccounts();
        console.log("Osmosis Address:", account.address);

        return wallet;
    } catch (error) {
        console.error("Error creating wallet:", error.message);
        throw error;
    }
}