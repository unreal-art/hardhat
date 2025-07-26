
import { ethers } from "ethers";

export interface SignatureParams {
  owner: string;
  spender: string;
  value: string;
  deadline: number;
  tokenAddress: string;
  chainId: number;
}

/**
 * Creates an EIP-712 typed data signature for token transfer authorization.
 * This implementation handles multiple signing methods for compatibility.
 */
export async function createTokenSignature(
  signer: ethers.Signer,
  params: SignatureParams
): Promise<string> {
  try {
    console.log("Creating EIP-712 signature with params:", params);

    // Fetch the current nonce for the owner address
    let nonce;
    try {
      // Create a read-only contract instance to query the nonce
      const ERC20_PERMIT_ABI = [
        "function nonces(address owner) view returns (uint256)",
      ];
      
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer doesn't have a provider attached");
      }
      
      const erc20Contract = new ethers.Contract(
        params.tokenAddress,
        ERC20_PERMIT_ABI,
        provider
      );
      
      console.log("Fetching nonce for address:", params.owner);
      const currentNonce = await erc20Contract.nonces(params.owner);
      
      // Convert BigInt to string
      nonce = currentNonce.toString();
      console.log("Current nonce from contract:", nonce);
    } catch (error) {
      console.error("❌ Error fetching nonce from contract:", error);
      console.log("Falling back to nonce=0");
      nonce = "0";
    }
    
    // Create the domain separator for EIP-712
    const domain = {
      name: "ODP",
      version: "0.0.1",
      chainId: params.chainId,
      verifyingContract: ethers.getAddress(params.tokenAddress),
    };
    
    // Define the permit type structure according to EIP-2612
    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    
    // Create the permit message
    const message = {
      owner: ethers.getAddress(params.owner),
      spender: ethers.getAddress(params.spender),
      value: params.value,
      nonce: nonce,
      deadline: params.deadline,
    };
    
    console.log("Domain:", domain);
    console.log("Types:", types);
    console.log("Message:", message);
    
    // Try to sign with signTypedData (ethers v6 method)
    try {
      console.log("Using signer.signTypedData");
      const signature = await signer.signTypedData(domain, types, message);
      console.log("Signature created successfully:", signature.substring(0, 10) + "...");
      return signature;
    } catch (error) {
      console.error("Error with signer.signTypedData:", error);
      
      // Fallback to _signTypedData if available (ethers v5 method)
      if ((signer as any)._signTypedData) {
        try {
          console.log("Using signer._signTypedData fallback");
          const signature = await (signer as any)._signTypedData(domain, types, message);
          console.log("Signature created successfully:", signature.substring(0, 10) + "...");
          return signature;
        } catch (signingError) {
          console.error("Error with signer._signTypedData:", signingError);
        }
      }
      
      throw new Error(`Failed to create signature: ${error}`);
    }
  } catch (error) {
    throw new Error(`Error creating token signature: ${error}`);
  }
}