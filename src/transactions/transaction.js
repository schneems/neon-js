import { getScriptHashFromPublicKey, getScriptHashFromAddress, isAddress } from '../wallet'
import { TX_VERSION, ASSET_ID } from '../consts'
import { createScript } from '../sc'
import { str2hexstring, num2VarInt } from '../utils'
import * as comp from './components'
import * as core from './core'
import * as exc from './exclusive'

/**
 * @class Transaction
 * @classdesc
 * Transactions are what you use to interact with the blockchain.
 * A transaction is made up of components found in the component file.
 * Besides those components which are found in every transaction, there are also special data that is unique to each transaction type. These 'exclusive' data can be found in the exclusive file.
 * This class is a wrapper around the various transaction building methods found in this folder.
 * @param {object} config - A config object that contains all the properties of a Transaction
 * @param {number} config.type - Transaction type. Default is 128 (ContractTransaction).
 * @param {number} config.version - Transaction version. Default is latest version for ContractTransaction.
 * @param {TransactionAttribute[]} config.attributes - Transaction Attributes.
 * @param {TransactionInput[]} config.inputs - Transaction Inputs.
 * @param {TransactionOutput[]} config.outputs - Transaction Outputs.
 * @param {Witness[]} config.scripts - Witnesses.
 */
class Transaction {
  constructor (config) {
    const tx = Object.assign({
      type: 128,
      version: TX_VERSION.CONTRACT,
      attributes: [],
      inputs: [],
      outputs: [],
      scripts: []
    }, config)
    /** @type {number} */
    this.type = tx.type

    /** @type {number} */
    this.version = tx.version

    /** @type {TransactionAttribute[]} */
    this.attributes = tx.attributes

    /** @type {TransactionInput[]} */
    this.inputs = tx.inputs

    /** @type {TransactionOutput[]} */
    this.outputs = tx.outputs

    /** @type {Witness[]} */
    this.scripts = tx.scripts
    const exclusive = exc.getExclusive[this.type](tx)
    Object.keys(exclusive).map((k) => {
      this[k] = exclusive[k]
    })
  }

  /**
   * Exclusive Data
   * @type {Object}
   */
  get exclusiveData () {
    return exc.getExclusive[this.type](this)
  }

  /**
   * Transaction hash.
   * @type {string}
   */
  get hash () {
    return core.getTransactionHash(this)
  }

  /**
   * Creates a ClaimTransaction with the given parameters.
   * @param {string} publicKeyOrAddress - Public key (Encoded form) or address
   * @param {Object} claimData - Claim Data provided by API
   * @param {Object} [override={}] - Optional overrides (eg. custom version)
   * @return {Transaction} Unsigned Transaction
   */
  static createClaimTx (publicKeyOrAddress, claimData, override = {}) {
    const txConfig = Object.assign({
      type: 2,
      version: TX_VERSION.CLAIM
    }, override)
    let totalClaim = 0
    let maxClaim = 255
    txConfig.claims = claimData.claims.slice(0, maxClaim).map((c) => {
      totalClaim += c.claim
      return { prevHash: c.txid, prevIndex: c.index }
    })
    txConfig.outputs = [{
      assetId: ASSET_ID.GAS,
      value: totalClaim / 100000000,
      scriptHash: isAddress(publicKeyOrAddress) ? getScriptHashFromAddress(publicKeyOrAddress) : getScriptHashFromPublicKey(publicKeyOrAddress)
    }]
    return new Transaction(Object.assign(txConfig, override))
  }

  /**
   * Creates a ContractTransaction with the given parameters.
   * @param {Balance} balances - Current assets available.
   * @param {TransactionOutput[]} intents - All sending intents as TransactionOutputs
   * @param {Object} [override={}] - Optional overrides (eg.custom versions)
   * @return {Transaction} Unsigned Transaction
   */
  static createContractTx (balances, intents, override = {}) {
    if (intents === null) throw new Error(`Useless transaction!`)
    const txConfig = Object.assign({
      type: 128,
      version: TX_VERSION.CONTRACT,
      outputs: intents
    }, override)
    return new Transaction(txConfig).calculate(balances)
  }

  /**
   * Creates an InvocationTransaction with the given parameters.
   * @param {Balance} balances - Balance of address
   * @param {TransactionOutput[]} intents - Sending intents as transactionOutputs
   * @param {object|string} invoke - Invoke Script as an object or hexstring
   * @param {number} gasCost - Gas to attach for invoking script
   * @param {object} [override={}] - Optional overrides (eg.custom versions)
   * @return {Transaction} Unsigned Transaction
   */
  static createInvocationTx (balances, intents, invoke, gasCost = 0, override = {}) {
    if (intents === null) intents = []
    const txConfig = Object.assign({
      type: 209,
      version: TX_VERSION.INVOCATION,
      outputs: intents,
      script: typeof (invoke) === 'string' ? invoke : createScript(invoke),
      gas: gasCost
    }, override)
    return new Transaction(txConfig).calculate(balances)
  }

  /**
   * Deserializes a hexstring into a Transaction object.
   * @param {string} hexstring - Hexstring of the transaction.
   * @return {Transaction}
   */
  static deserialize (hexstring) {
    const txObj = core.deserializeTransaction(hexstring)
    const exclusiveData = exc.getExclusive[txObj.type](txObj)
    return new Transaction(Object.assign(txObj, exclusiveData))
  }

  /**
   * Adds a TransactionOutput. TransactionOutput can be given as a TransactionOutput object or as human-friendly values. This is detected by the number of arguments provided.
   * @param {string|Object} assetSymOrTxOut - The symbol of the asset (eg NEO or GAS) or the TransactionOutput object.
   * @param {number} [value] - The value to send. Required if providing human-friendly values.
   * @param {string} [address] - The address to send to. Required if providing human-friendly values.
   * @return {Transaction} this
   */
  addOutput (assetSymOrTxOut, value, address) {
    if (arguments.length === 3) {
      this.outputs.push(comp.createTransactionOutput(assetSymOrTxOut, value, address))
    } else if (typeof (arguments[0]) === 'object') {
      this.outputs.push(arguments[0])
    } else throw new Error(`Invalid input given! Give either 1 or 3 arguments!`)
  }

  /**
   * Add a remark.
   * @param {string} remark - A remark in ASCII.
   * @return {Transaction} this
   */
  addRemark (remark) {
    const hexRemark = str2hexstring(remark)
    const len = num2VarInt(hexRemark.length / 2)
    this.attributes.push({
      usage: parseInt('f0', 16),
      data: len + hexRemark
    })
  }

  /**
   * Calculate the inputs required based on existing outputs provided. Also takes into account the fees required through the gas property.
   * @param {Balance} balance - Balance to retrieve inputs from.
   * @return {Transaction} this
   */
  calculate (balance) {
    const { inputs, change } = core.calculateInputs(balance, this.outputs, this.gas)
    this.inputs = inputs
    this.outputs = this.outputs.concat(change)
    balance.applyTx(this)
    return this
  }

  /**
   * Serialize the transaction and return it as a hexstring.
   * @param {boolean} signed  - Whether to serialize the signatures. Signing requires it to be serialized without the signatures.
   * @return {string} Hexstring.
   */
  serialize (signed = true) {
    return core.serializeTransaction(this, signed)
  }

  /**
   * Serializes the exclusive data in this transaction
   * @return {string} hexstring of the exclusive data
   */
  serializeExclusiveData () {
    return exc.serializeExclusive[this.type](this)
  }

  /**
   * Signs a transaction.
   * @param {string} privateKey
   * @return {Transaction} this
   */
  sign (privateKey) {
    return core.signTransaction(this, privateKey)
  }
}

export default Transaction
