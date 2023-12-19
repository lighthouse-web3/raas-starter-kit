const { DeleteItemCommand } = require("@aws-sdk/client-dynamodb")
const { CidRecord } = require("../utils/constants")
const client = require("../ddbClient")

const deleteCidRecord = async (cid) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: { cid: { S: cid } },
        }
        const command = new DeleteItemCommand(params)
        const response = await client.send(command)
        console.log(response)
        return "Delete Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

deleteCidRecord("QmS7Do1mDZNBJAVyE8N9r6wYMdg27LiSj5W9mmm9TZoeWp")

module.exports = deleteCidRecord
