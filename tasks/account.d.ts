
// ----- Types -----
export interface FundOut {
  address: string;
  balance: string;
  tokenBal?: string;
  odp?: string;
  newTokenBal?: string;
  newBalance?: string;
}

export interface Out {
  [key: string]: FundOut;
}

