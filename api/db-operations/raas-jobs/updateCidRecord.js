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
            UpdateExpression: `set #attrName = :v, #lastUpdate = :lastUpdate`,
            ExpressionAttributeNames: {
                "#attrName": attributeName,
                "#lastUpdate": "lastUpdate",
            },
            ExpressionAttributeValues: {
                ":v": marshall(attributeValue),
                ":lastUpdate": marshall(Math.floor(Date.now() / 1000)),
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
            UpdateExpression: `set #attrName = :v, #lastUpdate = :lastUpdate`,
            ExpressionAttributeNames: {
                "#attrName": attributeName,
                "#lastUpdate": "lastUpdate",
            },
            ExpressionAttributeValues: {
                ":v": { L: attributeValue.map((item) => marshall(item)) },
                ":lastUpdate": marshall(Math.floor(Date.now() / 1000)),
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

const doLastUpdate = async (cid) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: { cid: { S: cid } },
            UpdateExpression: `set #attrName = :v`,
            ExpressionAttributeNames: {
                "#attrName": "lastUpdate",
            },
            ExpressionAttributeValues: {
                ":v": marshall(Math.floor(Date.now() / 1000)),
            },
            ReturnValues: "UPDATED_NEW",
        }
        const command = new UpdateItemCommand(params)
        const response = await client.send(command)
        logger.info("Updated lastUpdate for cid " + cid)
        return "Update Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

const updateCidRecordAll = async (cidInfo) => {
    try {
        const params = {
            TableName: CidRecord,
            Key: { cid: { S: cidInfo.cid } },
            UpdateExpression: `set #dealIDs = :dealIDs, #miners = :miners, #currentReplications = :currentReplications, #cidStatus = :cidStatus, #lastUpdate = :lastUpdate`,
            ExpressionAttributeNames: {
                "#dealIDs": "dealIDs",
                "#miners": "miners",
                "#currentReplications": "currentReplications",
                "#cidStatus": "cidStatus",
                "#lastUpdate": "lastUpdate",
            },
            ExpressionAttributeValues: {
                ":dealIDs": { L: cidInfo.dealIDs.map((item) => marshall(item)) },
                ":miners": { L: cidInfo.miners.map((item) => marshall(item)) },
                ":currentReplications": marshall(NumbercidInfo.currentReplications),
                ":cidStatus": marshall(cidInfo.cidStatus),
                ":lastUpdate": marshall(Math.floor(Date.now() / 1000)),
            },
            ReturnValues: "UPDATED_NEW",
        }

        const command = new UpdateItemCommand(params)
        const response = await client.send(command)
        logger.info("Updated all attributes for cid " + cidInfo.cid)
        return "Update Successful"
    } catch (error) {
        console.log(error)
        throw new Error()
    }
}

module.exports = { updateCidRecord, updateArrayInCidRecord, doLastUpdate, updateCidRecordAll }
// const dealInfos = {
//     dealID: [],
// }
// // updateCidRecord("QmZ2Y3", "cidStatus", "incomplete")
// updateCidRecord(
//     "QmS7Do1mDZNBJAVyE8N9r6wYMdg27LiSj5W9mmm9TZoeWp",
//     "currentReplications",
//     dealInfos.dealID.length
// )
