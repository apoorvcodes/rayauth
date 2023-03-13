import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { AnchorProvider, BN, Program } from "@project-serum/anchor";
import { useEffect, useMemo, useState } from "react";
import { Buffer } from "buffer";

import { IDL, RayauthSession } from "../types/rayauth_session";
import useAuth from "./useAuth";
import useTxModal from "./useTxModal";
import axios from "axios";
import { BACKEND_URL } from "@/lib/constants";
import base58 from "bs58";
import { toast } from "sonner";

export const SESSION_PROGRAM_ID = "QMj41mN3j168KTuUWNrCgbSAYQ7o9QTaaSnT9gLvW9s";
export const GASLESS_PUBKEY = new PublicKey(
  "5xALDevGgZVpwEs8d2Miyu9cAhvjkg2sumKiBjm7ZaJY"
);

export const useSessionProgram = () => {
  const connection = useMemo(() => new Connection(clusterApiUrl("devnet")), []);
  const { user } = useAuth();
  const { signTransaction, signAllTransactions } = useTxModal();

  const [sessionKeypair, setSessionKeypair] = useState<Keypair | undefined>();

  useEffect(() => {
    window.Buffer = Buffer;
  }, []);

  const anchorWallet = useMemo(() => {
    if (!user?.address) return;

    return {
      publicKey: new PublicKey(user.address),
      signTransaction: signTransaction,
      signAllTransactions: signAllTransactions,
    };
  }, [user]);

  const anchorProvider = useMemo(() => {
    if (!anchorWallet) return;

    return new AnchorProvider(connection, anchorWallet as any, {
      commitment: "confirmed",
    });
  }, [connection, anchorWallet]);

  console.log("anchorWallet", anchorWallet);
  console.log("anchorProvider", anchorProvider);

  const sessionProgram: Program<RayauthSession> | undefined = useMemo(() => {
    if (!anchorProvider) return;

    return new Program(IDL, SESSION_PROGRAM_ID, anchorProvider);
  }, [anchorProvider]);

  console.log("sessionProgram", sessionProgram);

  useEffect(() => {
    if (!sessionProgram) return;

    const sessionKeypair = getSessionKeypair();

    if (!sessionKeypair) return;

    setSessionKeypair(sessionKeypair);
  }, [sessionProgram]);

  const addSessionToken = async (
    timestamp: number = Math.floor(Date.now() / 1000) + 3600
  ) => {
    if (!sessionProgram) {
      console.log("ched");
      return;
    }

    const sessionKeypair = new Keypair();
    console.log(sessionKeypair);
    const [sessionKeyPda] = await PublicKey.findProgramAddress(
      [Buffer.from("session_key"), sessionKeypair.publicKey.toBuffer()],
      sessionProgram.programId
    );

    console.log("doing tx");

    const addSessionKeyIx = await sessionProgram.methods
      .addSessionKey(new BN(timestamp))
      .accounts({
        sessionKeyPda,
        sessionKey: sessionKeypair.publicKey,
        payer: GASLESS_PUBKEY,
        user: anchorWallet?.publicKey,
      })
      .instruction();

    const tx = new Transaction({
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      feePayer: GASLESS_PUBKEY,
    }).add(addSessionKeyIx);

    tx.partialSign(sessionKeypair);

    const signedTx = await anchorWallet?.signTransaction(tx);

    if (!signedTx) return;

    const {
      data: { txid },
    } = await axios.post(`${BACKEND_URL}/gasless`, {
      transaction: base58.encode(
        (signedTx as Transaction).serialize({ requireAllSignatures: false })
      ),
    });

    toast.success("Session token added successfully", {
      action: {
        label: "View Transaction",
        onClick: () =>
          window.open(`https://explorer.solana.com/tx/${txid}?cluster=devnet`),
      },
    });

    localStorage.setItem("sessionToken", JSON.stringify(sessionKeypair));

    return;
  };

  const getSessionKeypair = () => {
    const sessionKeypair = localStorage.getItem("sessionToken");

    if (!sessionKeypair) return;

    return Keypair.fromSecretKey(
      Buffer.from(JSON.parse(sessionKeypair).secretKey)
    );
  };

  const revokeSessionToken = async () => {
    if (!sessionProgram) return;

    const sessionKeypair = getSessionKeypair();

    if (!sessionKeypair) return;

    const [sessionKeyPda] = await PublicKey.findProgramAddress(
      [Buffer.from("session_key"), sessionKeypair.publicKey.toBuffer()],
      sessionProgram.programId
    );

    const revokeSessionKeyIx = await sessionProgram.methods
      .revokeSessionKey()
      .accounts({
        sessionKeyPda,
        user: anchorWallet?.publicKey,
      })
      .instruction();

    const tx = new Transaction({
      recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
      feePayer: GASLESS_PUBKEY,
    }).add(revokeSessionKeyIx);

    tx.partialSign(sessionKeypair);

    const signedTx = await anchorWallet?.signTransaction(tx);

    if (!signedTx) return;

    const {
      data: { txid },
    } = await axios.post(`${BACKEND_URL}/gasless`, {
      transaction: base58.encode(
        (signedTx as Transaction).serialize({ requireAllSignatures: false })
      ),
    });

    toast.success("Session token revoked successfully", {
      action: {
        label: "View Transaction",
        onClick: () =>
          window.open(`https://explorer.solana.com/tx/${txid}?cluster=devnet`),
      },
    });
  };

  return {
    sessionProgram,
    addSessionToken,
    getSessionKeypair,
    revokeSessionToken,
    sessionKeypair,
  };
};
