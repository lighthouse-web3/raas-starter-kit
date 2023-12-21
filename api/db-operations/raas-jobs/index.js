const createCidRecord = require("./createCidRecord")
const { updateCidRecord, updateArrayInCidRecord, doLastUpdate } = require("./updateCidRecord")
const getIncompleteCidRecords = require("./getIncompleteCids")
const deleteCidRecord = require("./deleteCidRecord")
const getCidInfo = require("./getCidInfo")
module.exports = {
    createCidRecord,
    updateCidRecord,
    updateArrayInCidRecord,
    getIncompleteCidRecords,
    deleteCidRecord,
    getCidInfo,
    doLastUpdate,
}
