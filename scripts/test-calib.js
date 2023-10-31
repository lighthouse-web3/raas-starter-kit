require("dotenv").config()
const { ethers } = require("ethers")
const CIDTool = require("cid-tool")

const dealStatusABI = require("./dealStatusABI")

const submit = async () => {
    const provider = new ethers.providers.JsonRpcProvider(
        "https://filecoin-calibration.chainup.net/rpc/v1"
    )
    const privateKey = process.env.PRIVATE_KEY
    const signer = new ethers.Wallet(privateKey, provider)

    const dealStatusContract = new ethers.Contract(
        "0x6ec8722e6543fB5976a547434c8644b51e24785b",
        dealStatusABI,
        signer
    )
    console.log("Get all deals")
    cid = "QmPjPBsEjop5fvyocutSgftkKtE2YEoEG6EHNjRwzcrAPk"
    let allDeals = await dealStatusContract.getAllDeals(ethers.utils.toUtf8Bytes(cid))
    console.log("Deals : " + allDeals)
    // console.log("Submit A CID")

    // console.log("Executing Submit Function")
    // cid = "QmPjPBsEjop5fvyocutSgftkKtE2YEoEG6EHNjRwzcrAPk"
    // let tx1 = await dealStatusContract.submit(cid)
    // tx1 = await tx1.wait()
    // console.log("Transaction1 : " + tx1)
    // console.log("Submit A CID")

    // let allCIDs = await dealStatusContract.getAllCIDs()
    // console.log("AllCIDs: " + allCIDs)

    console.log("Get expiring deals")
    let expDealsTx = await dealStatusContract.getExpiringDeals(ethers.utils.toUtf8Bytes(cid), 10000)
    expDealsTx = await expDealsTx.wait()
    console.log("Expiring Deals : " + JSON.stringify(expDealsTx))
}

submit()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
