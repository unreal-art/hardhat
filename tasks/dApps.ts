import {task} from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import {syncDapps} from "../utils/syncDapps";
import {execSync} from "child_process";
import {getNetworks} from "../utils/network";

task("dapp", "Sync Dapp: always pass network its a must")
    .setAction(async ({}, hre) => {
        await syncDapps(hre)
    });


task("dapps", "Sync All Daps")
    .setAction(async ({}, hre) => {
        let networkNames = getNetworks(hre);
        console.log(`Networks: ${networkNames.join(", ")}`);

        for (const network of networkNames) {
            console.log("sync dapp ", network)
            try {
                const output = execSync(`npx hardhat dapp --network ${network}`, {
                    encoding: "utf-8",
                });
                console.log(output);
            } catch (e) {
                console.error(e);
            }
        }

    })



