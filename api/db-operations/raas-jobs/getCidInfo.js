const client = require("../ddbClient")
const { CidRecord } = require("../utils/constants")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const { GetItemCommand } = require("@aws-sdk/client-dynamodb")

const getCid = async (cid) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: marshall({ cid: cid }),
        }
        const command = new GetItemCommand(params)
        const response = await client.send(command)
        // console.log(unmarshall(response))
        logger.info("Recieved Info of Cid " + cid)
        if (!response.Item) {
            return null
        }
        return unmarshall(response.Item)
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}
module.exports = getCid
