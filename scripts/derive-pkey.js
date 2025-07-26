const { Wallet } = require("ethers");

const loadAddress = (privateKey) => {
    try {
        const wallet = new Wallet(privateKey);
        let address = wallet.address;
        console.log(`${address}`);
    } catch (error) {
        console.error(`Error deriving address from private key for ${privateKey}: ${error.message}`);
    }
}

if (process.argv.length < 3) {
    console.error("Usage: node script.js <private_key>");
    process.exit(1);
}

const privateKey = process.argv[2];
loadAddress(privateKey);