const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');

module.exports = async (req, res) => {
    try {
        if (req.method !== 'POST') {
            res.status(405).send({ error: 'Method Not Allowed' });
            return;
        }

        const network = bitcoin.networks.bitcoin; // Change to bitcoin.networks.testnet for testnet

        // Extract or generate mnemonics from the request
        let { mnemonic1, mnemonic2 } = req.body;
        mnemonic1 = mnemonic1 || bip39.generateMnemonic();
        mnemonic2 = mnemonic2 || bip39.generateMnemonic();

        // Generate seeds from mnemonics
        const seed1 = bip39.mnemonicToSeedSync(mnemonic1);
        const seed2 = bip39.mnemonicToSeedSync(mnemonic2);

        // Create HD wallets
        const hdWallet1 = bitcoin.bip32.fromSeed(seed1, network);
        const hdWallet2 = bitcoin.bip32.fromSeed(seed2, network);

        // Derive keys using the specified path
        const path = "m/48'/0'/0'/2'"; // Specific derivation path for multisig
        const keyPair1 = hdWallet1.derivePath(path);
        const keyPair2 = hdWallet2.derivePath(path);

        // Get the public keys
        const pubkey1 = keyPair1.publicKey;
        const pubkey2 = keyPair2.publicKey;

        // Create a 2-of-2 multisig P2WSH redeem script
        const redeemScript = bitcoin.payments.p2wsh({
            redeem: bitcoin.payments.p2ms({ m: 2, pubkeys: [pubkey1, pubkey2], network }),
            network,
        });

        // Create the P2WSH address
        const address = redeemScript.address;

        // Construct the JSON response
        const response = {
            key1: {
                mnemonic: mnemonic1,
                publicKey: pubkey1.toString('hex'),
                privateKey: keyPair1.toWIF(),
            },
            key2: {
                mnemonic: mnemonic2,
                publicKey: pubkey2.toString('hex'),
                privateKey: keyPair2.toWIF(),
            },
            multisigAddress: address,
        };

        res.status(200).send(response);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send({ error: 'Internal Server Error', details: error.message });
    }
};
