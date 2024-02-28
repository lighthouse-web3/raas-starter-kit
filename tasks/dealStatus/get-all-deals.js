task("get-all-deals", "Gives all deals for cid for which complete function is called")
    .addParam("contract", "The address of the deal status solidity")
    .addParam("pieceCid", "The piece CID of the deal you want the status of")
    .setAction(async (taskArgs) => {
        const contractAddr = taskArgs.contract
        const cid = ethers.utils.toUtf8Bytes(taskArgs.pieceCid)

        const networkId = network.name
        console.log("Getting deal status on network", networkId)

        //create a DealStatus contract factory
        const DealStatus = await ethers.getContractFactory("DealStatus")
        //create a DealStatus contract instance
        //this is what you will call to interact with the deployed contract
        const dealStatus = await DealStatus.attach(contractAddr)

        //send a transaction to call makeDealProposal() method
        cidDeals = await dealStatus.getAllDeals(cid)
        // dealId = "19988"
        // console.log(cidDeals.some((deal) => deal.dealId.toString() === dealId.toString()))

        // let result = await dealStatus.pieceStatus(cidHex)
        // console.log("The deal status is:", result)
    })
