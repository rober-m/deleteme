import { Inter } from "next/font/google";
import { useState } from "react";
import { CardanoWallet, useWallet } from "@meshsdk/react";
import { Transaction } from "@meshsdk/core";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const [balance, setBalance] = useState<string>("0");
  const [cantidad, setCantidad] = useState<number>(0);
  const [addr, setAddr] = useState<string>("");
  const { wallet, connected } = useWallet();

  async function showBalance() {
    if (!wallet) return;
    const balance = await wallet.getLovelace();
    setBalance(balance);
  }

  async function enviarAda() {
    if (!wallet) return;
    const tx = new Transaction({ initiator: wallet })
      .sendLovelace(addr, (cantidad * 1000000).toString());
    const txBalanceada = await tx.build();
    const txFirmada = await wallet.signTx(txBalanceada);
    const txHash = await wallet.submitTx(txFirmada);
    console.log("txHash: ", txHash);
  }

  return (
    <div className="bg-gray-900 w-full text-white text-center text-lg">
      <main
        className={`flex min-h-screen flex-col items-center justify-center p-24 ${inter.className} `}
      >
        <div className="my-6">
          <CardanoWallet />
        </div>
        <button disabled={!connected} className="my-6 disabled:text-gray-700" onClick={showBalance}>Show Balance</button>
        <p>Balance: {parseInt(balance) / 1000000}</p>
        <label>Cuantos ADA quiere enviar?:
          <input
            type="number"
            className="text-black m-2"
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value))} />
        </label>
        <label>A quién quiere enviar esos ADA?:
          <input
            type="string"
            className="text-black m-2"
            value={addr}
            onChange={(e) => setAddr(e.target.value)} />
        </label>
        <button disabled={!connected} className="my-6 disabled:text-gray-700" onClick={enviarAda}>Enviar</button>
      </main>
    </div>
  );
}
