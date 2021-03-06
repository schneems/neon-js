*********
Changelog
*********

This details the changes made from the previous recorded version.

2.2.2
=====

- Fix ``nep5/doTransferToken``

2.2.1
=====

-Fix ``fixed82num`` not accepting empty string

2.2.0
=====

- Wallet

  - Implementation of NEP-6 standard as ``wallet.Wallet``
  - Move NEP2 constants to CONST
  - encrypt/decrypt has an extra optional scrypt argument
  - Deprecate wallet.encryptWifAccount, wallet.generateEncryptedWif, wallet.encryptWIF, wallet.decryptWIF

  ::

    import Neon, {wallet} from '@cityofzion/neon-js'
    const w1 = Neon.create.wallet()
    const w2 = new wallet.Wallet()

- Account

  - Add label and extra to Account
  - Add functions encrypt and decrypt to Account

- Transaction

  - Transaction creation will now move coins used from ``unspent`` to ``spent`` and add the new coins in ``unconfirmed``.
  - ``api.sendTx`` now moves coins from ``unconfirmed`` to ``unspent``.
  - This means that we can create 2 transactions in a single block without blocking each other. Previously, the 2 transactions will attempt to use the same coins.

- API

  - Add ``api.getToken`` which is a combination of ``api.getTokenInfo`` and ``api.getTokenBalance``, allowing for simple info retrieval within a single call. This is exposed semantically as ``Neon.get.token``.
  - Bugfix CoinMarketCap truncating prices to integers.
  - Bugfix doTransferToken sending gas to wrong address and appending wrong item to txid when successful (was appending the full tx instead).
  - Catch getTokenBalance error when using an address with no balance.

- RPC

  - Add ``VMZip`` method. This allows for individual parsing of VM results. Do note that this method produces a parsing function. It is not to be used directly.

  ::

    import {rpc, u} from '@cityofzion/neon-js'
    const parsingFunc = rpc.VMZip(u.hexstring2ab, u.fixed82num)
    rpc.Query.invoke(script).parseWith(parsingFunc)

- Utils

  - Add ``hexstring2str`` method.

2.1.0
=====

- Balance as an ES6 class.

  - ``verifyAssets`` to validate unspent coins against a given NEO node. Used to check if balance is fully synced and usable.
  - ``applyTx`` to apply a spending of a Transaction to the Balance. Allows a Balance to be used to build another Transaction without waiting for sync.
  - Data structure reworked. AssetBalances are now tucked under ``assets``. Use ``assetSymbols`` to discover the keys for lookup.

  ::

    // This array contains all the symbols of the assets available in this Balance
    balance.assetSymbols = ['NEO', 'GAS']
    // Lookup assets using their symbols
    balance.assets = {
      NEO: {balance: 1, unspent: [ Object ], spent: [], unconfirmed: []}
      GAS: {balance: 25.1, unspent: [ Object ], spent: [], unconfirmed: []}
    }

- Added ``doTransferToken`` to ``api/nep5``
- Unit tests for ``utils``
- Typescript typings fixed

2.0.0
======

- Package exports semantic style

  - Default export is now a semantic object that follows the convention of Verb-Noun.
  - Verbs available are : ``get``, ``create``, ``serialize``, ``deserialize``, ``is``. Read the ``index.js`` file of each module to know what they export.
  - Modules are individually available as named exports. If you just need account methods, ``import { wallet } from '@cityofzion/neon-js'``

- Constants and util methods are now exported as

  ::

    import Neon from '@cityofzion/neon-js'
    Neon.CONST.DEFAULT_RPC
    Neon.u.reverseHex

    import { CONST, u } from '@cityofzion/neon-js'
    CONST.DEFAULT_RPC
    u.reverseHex

- Wallet

  - Account is now available as a class instead of a JS object. Account is now the recommended way to manage keys.
  - Removed ``getAccountFromWIFKey`` and ``getAccountFromPrivateKey``
  - Key manipulation methods streamlined to the minimum. No more ``getAddressFromPrivateKey``.  Methods now only transform the key one level.
  - Key verification methods fully implemented for every possible key format. Follows convention of ``isKeyFormat``.

- Transaction

  - Transaction is now an ES6 class instead of a JS object. Transaction is now the recommended way to construct and manipulate transactions.
  - Refactor methods to utilise the new Transaction class.
  - Removed ``publicKey`` argument from create Transaction methods as address is sufficient for generating scriptHash.
  - Add human-friendly method for creating TransactionOutput.
  - Ability to add a remark to Transaction through ``addRemark``

- RPC

  - RPCClient class models a NEO Node. Instantiate with ``Neon.create.rpcClient(url)``. Comes with built-in methods for RPC calls.
  - Query class models a RPC call. Instantiate with ``Neon.create.query()``. Comes with built-in methods for RPC calls.

- API

  - neon-wallet-db API is shifted to ``api`` folder.
  - Added coinmarketcap query support for easy price queries.
  - Token query (NEP5) is shifted here.
  - Neoscan support added.
  - Hardware support integrated as external signingFunction provided as argument.
  - New core api methods: sendAsset, claimGas and doInvoke.

- SC

  - ``generateDeployScript`` in ``sc`` is a wrapper for generating a deploy script.
  - ContractParam added to support ``invoke`` and ``invokefunction`` RPC calls.


1.1.x
=====

1.1.1
-----

- Ledger support

  - Add ability to sign using external function for neonDB API.
  - Bugfix for _emitNum

1.1.0
-----

- Transaction Overhaul

  - Transactions are now exposed semantically with the convention of Verb-Noun.
  - Transaction creation is exposed as ``create.claim``, ``create.contract`` and ``create.invocation``
  - Transactions can be serialized or deserialzed using ``serializeTransaction`` and ``deserializeTransaction``
  - Transaction signing is now ``signTransaction`` and it returns the signed transaction instead of having to manually attach the signature.
  - Transaction Hash can be calculated using ``getTransactionHash`` passing in the transaction object.

- ScriptBuilder for Smart Contract invocation

  - ScriptBuilder class is an object used to build VM scripts that mirrors the ScriptBuilder found in the C# repo.
  - ``buildScript`` is a convenient wrapper around ScriptBuilder to call a contract with ``operation`` accepting ``args``.

- getAccount methods renamed to getAccount and returns a single Account object instead of an array

  | getAccountsFromWIFKey -> getAccountFromWIFKey
  | getAccountsFromPrivateKey -> getAccountFromPrivateKey

1.0.x
=====

1.0.4
-----

- Additional NEP2 wrapper methods (Simple encrypted WIF creation)
- Address validation to guard against sending to non-NEO addresses.

1.0.2
-----

- Introduce NEP2 Support (encrypt / decrypt WIF)

1.0.1
-----

- Upgrade API support to v2 for neon-wallet-db
