import {HardhatRuntimeEnvironment} from "hardhat/types";

export const getNetwork = (hre: HardhatRuntimeEnvironment) => {
    const network = hre.network;
    return network;
};

export const getNetworks = (
    hre: HardhatRuntimeEnvironment,
    filteredNetworks?: Array<string> = ["localhost"],
) => {
    filteredNetworks = filteredNetworks ?? [];

    let networkNames = Object.keys(hre.config.networks);
    networkNames = networkNames.filter(
        (network: string) => !filteredNetworks.includes(network),
    );
    return networkNames;
};


