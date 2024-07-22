import { Inter } from "next/font/google";
import { useState } from "react";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { BlockfrostProvider, PlutusScript, Transaction, UTxO, resolveDataHash, resolvePaymentKeyHash, resolvePlutusScriptAddress } from "@meshsdk/core";
import { applyCborEncoding } from "@meshsdk/core-csl";

const inter = Inter({ subsets: ["latin"] });

const provider: BlockfrostProvider = new BlockfrostProvider("<KEY>")

const scriptCbor = applyCborEncoding("5901a301000032323232323232323232232232253330083232533300a3370e900118061baa300f3010002153300b49013149732061205370656e642076616c696461746f722e20436865636b696e67206578747261207369676e61746f726965732e001533300a323300100100222533301000114a0264a66601a66e3cdd718090010048a51133003003001301200114a22a66016921286c6973742e6861732865787472615f7369676e61746f726965732c20766b6829203f2046616c73650014a02940dd618071807980798079807980798079807980798061baa300e001300b37540022930a99804a491856616c696461746f722072657475726e65642066616c73650013656533333300d001153330063370e900018041baa0011533300a300937540022930a998038020b0a998038020b0a998038020b0a998038020b0a998038020b0a998038020b29999998058008a998028018b0a998028018b0a998028018b0a998028018b09bae001491085f723a20566f696400490118766b683a20566572696669636174696f6e4b657948617368005734ae7155ceaab9e5573eae855d12ba41")

const script: PlutusScript = {
  version: "V2",
  code: scriptCbor
}

const scriptAddr = resolvePlutusScriptAddress(script, 0);
console.log("scriptAddr: ", scriptAddr);

export default function Home() {
  const [cantidad, setCantidad] = useState<number>(0);
  const { wallet, connected } = useWallet();


  async function encerrarAdaEnScript() {
    if (!wallet) return;
    const wAddr = await wallet.getChangeAddress();
    const vkh = resolvePaymentKeyHash(wAddr)
    const tx = new Transaction({ initiator: wallet })
      .sendLovelace({
        address: scriptAddr, datum: { value: vkh, inline: true }
      }, (cantidad * 1000000).toString()
      )
    const txBalanceada = await tx.build();
    const txFirmada = await wallet.signTx(txBalanceada);
    const txHash = await wallet.submitTx(txFirmada);
    console.log(`txHash:\n ${txHash}`);
  }

  async function liberarDeScript() {
    if (!wallet) return;
    const wAddr = await wallet.getChangeAddress();
    const vkh = resolvePaymentKeyHash(wAddr)

    // Obtener todos los utxos del script
    const utxos = await provider.fetchAddressUTxOs(scriptAddr);
    console.log("utxos: ", utxos);

    // Filtrar los utxos que contienen nuestro vkh en el datum
    const ourUTxO: UTxO = utxos.find(utxo => utxo.output.dataHash == resolveDataHash(vkh));
    // const ourUTxO: UTxO = utxos[0];
    console.log("ourUTxO: ", ourUTxO);

    const tx = new Transaction({ initiator: wallet })
      .redeemValue({ value: ourUTxO, script: script })
      //.sendValue(wAddr, ourUTxOs)
      .setRequiredSigners([wAddr])

    const txBalanceada = await tx.build();
    const txFirmada = await wallet.signTx(txBalanceada, true);
    const txHash = await wallet.submitTx(txFirmada);
    //console.log("eval: ", await provider.evaluateTx(txFirmada));
    console.log(`txHash:\n ${txHash}`);
  }

  return (
    <div className="bg-gray-900 w-full text-white text-center text-lg">
      <main
        className={`flex min-h-screen flex-col items-center justify-center p-24 ${inter.className} `}
      >
        <div className="my-6">
          <CardanoWallet />
        </div>
        <label>Cuantos ADA quiere encerrar?:
          <input
            type="number"
            className="text-black m-2"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))} />
        </label>
        <button disabled={!connected} className="my-6 disabled:text-gray-700" onClick={encerrarAdaEnScript}>Encerrar ADA</button>
        <button disabled={!connected} className="my-6 disabled:text-gray-700" onClick={liberarDeScript}>Liberar ADA</button>
      </main>
    </div>
  );
}
