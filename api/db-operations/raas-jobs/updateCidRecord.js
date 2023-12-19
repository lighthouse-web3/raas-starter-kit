const { UpdateItemCommand } = require("@aws-sdk/client-dynamodb")
const client = require("../ddbClient")
const { CidRecord } = require("../utils/constants")
const { marshall } = require("@aws-sdk/util-dynamodb")
const logger = require("../../winston")
const updateCidRecord = async (cid, attributeName, attributeValue) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: { cid: { S: cid } },
            UpdateExpression: `set #attrName = :v`,
            ExpressionAttributeNames: {
                "#attrName": attributeName,
            },
            ExpressionAttributeValues: {
                ":v": marshall(attributeValue),
            },
            ReturnValues: "UPDATED_NEW",
        }
        const command = new UpdateItemCommand(params)
        const response = await client.send(command)
        logger.info("Updated attribute " + attributeName + " for cid " + cid)
        return "Update Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

const updateArrayInCidRecord = async (cid, attributeName, attributeValue) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: { cid: { S: cid } },
            UpdateExpression: `set #attrName = :v`,
            ExpressionAttributeNames: {
                "#attrName": attributeName,
            },
            ExpressionAttributeValues: {
                ":v": { L: attributeValue.map((item) => marshall(item)) },
            },
            ReturnValues: "UPDATED_NEW",
        }
        const command = new UpdateItemCommand(params)
        const response = await client.send(command)
        logger.info("Updated attribute " + attributeName + " for cid " + cid)
        return "Update Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

// const dealInfos = {
//     dealID: [],
// }
// // updateCidRecord("QmZ2Y3", "status", "incomplete")
// updateCidRecord(
//     "QmS7Do1mDZNBJAVyE8N9r6wYMdg27LiSj5W9mmm9TZoeWp",
//     "currentReplications",
//     dealInfos.dealID.length
// )

module.exports = { updateCidRecord, updateArrayInCidRecord }
