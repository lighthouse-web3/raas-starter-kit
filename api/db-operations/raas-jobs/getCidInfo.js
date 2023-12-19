const client = require("../ddbClient")
const { CidRecord } = require("../utils/constants")
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb")

const { GetItemCommand } = require("@aws-sdk/client-dynamodb")

const getCid = async (cid) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: marshall({ cid: cid }),
        }
        const command = new GetItemCommand(params)
        const response = await client.send(command)
        console.log(response)
        if (!response.Item) {
            return null
        }
        return unmarshall(response.Item)
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}
// getCid("QmS7Do1mDZNBJAVyE8N9r6wYMdg27LiSj5W9mmm9TZoeWp")
module.exports = getCid
