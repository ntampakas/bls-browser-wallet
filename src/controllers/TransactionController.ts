import { ethers } from 'ethers';
import { Aggregator, BlsWalletWrapper } from 'bls-wallet-clients';
import { NETWORK_CONFIG, AGGREGATOR_URL } from '../constants';

export type SendTransactionParams = {
  to: string,
  from?: string,
  gas?: string,
  gasPrice?: string,
  value?: string,
  data?: string,
};

export default class TransactionController {
  constructor(
    public ethersProvider: ethers.providers.JsonRpcProvider,
    public privateKey: string,
  ) {}

  sendTransaction = async (
    params: SendTransactionParams[],
  ) => {
    // TODO: Implement user transaction approval

    const actions = params.map((tx) => ({
      ethValue: tx.value ?? '0',
      contractAddress: tx.to,
      encodedFunction: tx.data ?? '0x',
    }));

    const wallet = await BlsWalletWrapper.connect(
      this.privateKey,
      NETWORK_CONFIG.addresses.verificationGateway,
      this.ethersProvider,
    );

    const nonce = (
      await BlsWalletWrapper.Nonce(
        wallet.PublicKey(),
        NETWORK_CONFIG.addresses.verificationGateway,
        this.ethersProvider,
      )
    ).toString();
    const bundle = await wallet.sign({ nonce, actions });

    const agg = new Aggregator(AGGREGATOR_URL);
    const result = await agg.add(bundle);

    if ('failures' in result) {
      throw new Error(JSON.stringify(result));
    }

    // Todo: maybe persist known transactions?

    return result.hash;
  };

  static getTransactionReceipt = async (hash: string) => {
    const aggregator = new Aggregator(AGGREGATOR_URL);
    const bundleReceipt: any = await aggregator.lookupReceipt(hash);

    return (
      bundleReceipt && {
        transactionHash: hash,
        transactionIndex: bundleReceipt.transactionIndex,
        blockHash: bundleReceipt.blockHash,
        blockNumber: bundleReceipt.blockNumber,
        logs: [],
        cumulativeGasUsed: '0x0',
        gasUsed: '0x0',
        status: '0x1',
        effectiveGasPrice: '0x0',
      }
    );
  };

  getAddress = async () => BlsWalletWrapper.Address(
    this.privateKey,
    NETWORK_CONFIG.addresses.verificationGateway,
    this.ethersProvider,
  );
}
