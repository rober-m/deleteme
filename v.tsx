import { Inter } from "next/font/google";
import Head from "next/head";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { Data, resolveDataHash, resolvePaymentKeyHash, resolvePlutusScriptAddress, resolveSlotNo, Transaction, UTxO } from '@meshsdk/core';
import { PlutusScript } from '@meshsdk/core';
import { applyCborEncoding } from "@meshsdk/core-csl";
import { useState } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { wallet } = useWallet();
  const [cantidad, setCantidad] = useState<number>(0);
  const [beneficiario, setBeneficiario] = useState<string>('');
  const [fechaLimite, setFechaLimite] = useState<string>('');
  const [evaluate, setEvaluate] = useState<boolean>(false);

  const script: PlutusScript = {
    code: applyCborEncoding('5902b20100003232323232323232323223232322322533300a3232323253323300f3001301137546028602a00a26464a666022a66602264646600200200c44a66603000229404c94ccc054cdc79bae301a00200414a226600600600260340026eb8c008c050dd50068a51153301249012069735f7369676e65645f62795f62656e6566696369617279203f2046616c73650014a02a666022002294454cc04924011969735f61667465725f646561646c696e65203f2046616c73650014a02940c8c8c94ccc04cc014c054dd5000899299980a19299980c980c0008a99980a9803980b8008a51153330153010301700114a02c2c6ea8c010c05cdd51802980b9baa008133710006002266e2400c004dd6980c180b1baa00114a06006602a6ea8c00cc054dd50031bad30013014375401a4602c602e0024602a0026e1d200214a06eb0c048c04c008c044004c044c044c044c044c044c044c044c038dd5180800098069baa001149854cc02d24011856616c696461746f722072657475726e65642066616c73650013656533333300f001153330083003300a37540022a66601860166ea80045261533009006161533009006161533009006161533009006161533009006161533009006165333006300130083754004264a6660160022a6601000c2c26464a66601a0022a660140102c264a66601c60200042930a998058048b1929999998088008a998058048b0a998058048b0a998058048b09bad001153300b00916300e001300e00232533333300f0011533009007161533009007161533009007161533009007161375c002601800260126ea800854cc01c01458dc3a4000a66666601600220022a6600a0062c2a6600a0062c2a6600a0062c2a6600a0062c9201085f723a20566f696400490113646174756d3a2056657374696e67446174756d005734ae7155ceaab9e5573eae855d12ba41'),
    version: 'V2',
  };

  const scriptAddr = resolvePlutusScriptAddress(script, 0);

  async function buscarUTxO(scriptAddr: string, datum: any): Promise<UTxO | undefined> {
    try {
      const resp = await fetch('/api/buscar_utxo', {
        method: 'POST',
        body: JSON.stringify({ scriptAddr: scriptAddr, datumHash: resolveDataHash(datum) }),
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await resp.json();
      console.log(json);
      return json as UTxO;
    }
    catch (error) {
      console.error("error buscando UTxO: ", error);
      return undefined;
    }
  }

  // Preparar datum
  function getDatum(): Data {
    const dateObject = new Date(fechaLimite);
    const posixTime = dateObject.getTime();
    //const posixTime = dateObject.getTime() - 700000;
    const benefPKH = resolvePaymentKeyHash(beneficiario)
    const datum: Data = { alternative: 0, fields: [benefPKH, posixTime] };
    console.log("datum: ", datum);
    return datum;
  }

  async function evaluateTx(txFirmada: string): Promise<void> {
    await fetch('/api/eval_tx', {
      method: 'POST',
      body: JSON.stringify({ tx: txFirmada }),
      headers: { 'Content-Type': 'application/json' }
    }).then(response => console.log("evalTx: ", response));
  }

  async function encerrarAdaEnScript() {
    if (!wallet) return;
    try {
      const tx = new Transaction({ initiator: wallet })
        .sendLovelace(
          {
            address: scriptAddr,
            datum: {
              value: getDatum(),
              inline: true
            }
          }, (cantidad * 1000000).toString()
        )
      const txBalanceada = await tx.build();
      const txFirmada = await wallet.signTx(txBalanceada);
      if (evaluate) {
        await evaluateTx(txFirmada);
      } else {
        const txHash = await wallet.submitTx(txFirmada);
        console.log(`txHash:\n ${txHash}`);
      }
    } catch (error) {
      console.error("Error encerrando ada: ", error);
    }
  }

  async function liberarDeScript() {
    if (!wallet) return;
    try {
      const wAddr = await wallet.getChangeAddress();

      const nuestroUTxO = await buscarUTxO(scriptAddr, getDatum())
      console.log("nuestroUTxO: ", nuestroUTxO);
      if (!nuestroUTxO) {
        console.log("No se encontro el utxo con el datum especificado.");
        return
      };

      const slot = resolveSlotNo('preprod', Date.now() - 15000);

      const tx = new Transaction({ initiator: wallet })
        .redeemValue({ value: nuestroUTxO, script: script })
        .setTimeToStart(slot)
        .setRequiredSigners([wAddr])

      const txBalanceada = await tx.build();
      const txFirmada = await wallet.signTx(txBalanceada, true);
      if (evaluate) {
        await evaluateTx(txFirmada);
      } else {
        const txHash = await wallet.submitTx(txFirmada);
        console.log(`txHash:\n ${txHash}`);
      }
    } catch (error) {
      console.error("Error liberando ada: ", error);
    }
  }



  return (
    <div className="bg-gray-900 w-full text-white text-center">
      <Head>
        <title>Mesh App on Cardano</title>
        <meta name="description" content="A Cardano dApp powered my Mesh" />
      </Head>
      <main
        className={`flex min-h-screen flex-col items-center justify-center p-24 space-y-8 ${inter.className} `}
      >
        <h1 className="text-6xl font-thin mb-20">
          Vesting Dapp
        </h1>
        <CardanoWallet />
        <label>Cuantos ADA quiere encerrar?
          <input
            type="number"
            className="text-black m-2"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))} />
        </label>
        <label>Quien es el beneficiario?
          <input
            type="string"
            className="text-black m-2"
            value={beneficiario}
            onChange={(e) => setBeneficiario(e.target.value)} />
        </label>
        <label>Cuando lo puede liberar?
          <input
            type="datetime-local"
            className="text-black m-2"
            value={fechaLimite}
            onChange={(e) => setFechaLimite(e.target.value)
            } />
        </label>
        <label>Evaluar Tx en lugar de enviarla?
          <input
            type="checkbox"
            className="ml-2 size-4"
            checked={evaluate}
            onChange={(e) => setEvaluate(e.target.checked)} />
        </label>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
          disabled={!wallet || !beneficiario || !fechaLimite}
          onClick={encerrarAdaEnScript}
        >Encerrar ADA</button>
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
          disabled={!wallet || !beneficiario || !fechaLimite}
          onClick={liberarDeScript}
        >Redimir</button>
      </main >
    </div >
  );
}
