task("get-deal-info", "Gets a deal's info from deal id")
    .addParam("contract", "The address of the DealRewarder contract")
    .addParam("dealId", "The deal id of the deal you want the info of")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract
        const networkId = network.name
        const dealId = taskArgs.dealId
        console.log("Running dealStatus on network", networkId)

        //create a new wallet instance
        const wallet = new ethers.Wallet(network.config.accounts[0], ethers.provider)

        const DealStatus = await ethers.getContractFactory("DealStatus", wallet)

        const dealStatus = await DealStatus.attach(contractAddr)

        const dealActivationReturn = await dealStatus.getDealActivationData(dealId)
        console.log("Deal Activation return data is: ", dealActivationReturn)
        console.log("Which gets parsed to:")
        printBigIntChainOutput(dealActivationReturn)
        const dealTermReturn = await dealStatus.getDealTermData(dealId)
        console.log("Deal Term return data is: ", dealTermReturn)
        console.log("Which gets parsed to:")
        printBigIntChainOutput(dealTermReturn)

        console.log("Complete!")

        // Converts the BigInt return data from a view function to a readable format
        function printBigIntChainOutput(output) {
            for (let i = 0; i < output.length; i++) {
                console.log(
                    Object.keys(output)[i + output.length],
                    ":",
                    Number(Object.values(output)[i]._hex)
                )
            }
        }
    })
//sample contract 0xc3B1D57038BD4a2263e56c3bE8689d4B3Cc7C786
