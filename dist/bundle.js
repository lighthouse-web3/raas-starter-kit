/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./public/script.js":
/*!**************************!*\
  !*** ./public/script.js ***!
  \**************************/
/***/ (() => {

eval("// The following code is present if you would like to make optional inputs more\n// Granular in the frontend. For now, optional inputs will be hidden with default values set.\n/*\nfunction toggleEpochInput() {\n  const jobType = document.getElementById(\"jobType\");\n  const epochInput = document.getElementById(\"epochInput\");\n  const replicationTarget = document.getElementById(\"replicationTarget\");\n\n  // Reset visibility for both optional inputs\n  epochInput.style.display = \"none\";\n  replicationTarget.style.display = \"none\";\n\n  // Determine which optional input to display based on the job type selected\n  if (jobType.value === \"renew\" || jobType.value === \"repair\") {\n    epochInput.style.display = \"block\";\n  } else if (jobType.value === \"replication\") {\n    replicationTarget.style.display = \"block\";\n  }\n}\n\n// Call the function initially to set the correct visibility on page load\ndocument.addEventListener(\"DOMContentLoaded\", function() {\n    toggleEpochInput();\n});\n*/\n\n// Enable file upload on click.\ndocument.getElementById(\"uploadButton\").addEventListener(\"click\", uploadFile)\n\nasync function uploadFile() {\n    const fileInput = document.getElementById(\"fileUpload\")\n    const file = fileInput.files[0]\n\n    // Check if a file was selected\n    if (!file) {\n        alert(\"Please select a file to upload\")\n        return\n    }\n\n    // Show the uploading text\n    uploadStatus.textContent = \"Uploading...\"\n\n    // Create FormData to send the file\n    const formData = new FormData()\n    formData.append(\"file\", file)\n\n    // Send the file to the server to be uploaded to lighthouse\n    const uploadResponse = await fetch(\"/api/uploadFile\", {\n        method: \"POST\",\n        body: formData,\n    })\n    // Update the upload status\n    const responseJson = await uploadResponse.json()\n\n    console.log(\"Uploaded file. Response: \", responseJson)\n\n    if (uploadResponse.ok) {\n        uploadStatus.textContent = `Upload completed. You CID is ${responseJson.cid}`\n    } else {\n        uploadStatus.textContent = \"Upload failed. Please try again.\"\n    }\n\n    // Assuming that the CID is available as a property on the response object\n    const cid = responseJson.cid\n\n    // Populate the 'cid' box with the response\n    document.getElementById(\"cid\").value = cid\n}\n\n// Function to poll the deal status\nasync function pollDealStatus(cid) {\n    await fetch(`/api/deal_status?cid=${cid}`, {\n        method: \"GET\",\n    })\n        .then((response) => response.json())\n        .then((data) => {\n            // If a 400 is returned, return it\n            if (data.error) {\n                console.error(\"Error:\", data.error)\n                document.getElementById(\"jobregStatus\").textContent = \"Waiting for deal status.\"\n            } else if (data.dealInfos) {\n                console.log(data)\n                document.getElementById(\n                    \"jobregStatus\"\n                ).textContent = `Deal status: Completed! Miner: ${data.dealInfos[0].storageProvider}. DealID: https://calibration.filfox.info/en/deal/${data.dealInfos[0].dealId}`\n                if (data.jobType === \"replication\" || data.jobType === \"all\") {\n                    document.getElementById(\n                        \"replicationJobStatus\"\n                    ).innerHTML = `Replication Job Status: Executing replication job to ${data.replicationTarget} replications. Currently replications at ${data.currentActiveDeals.length}/${data.replicationTarget}.<br><br>\n        Calling getActiveDeals from smart contract instance to get all the active deals of the cid. If the number of active deals is smaller than the amount specified by the replication target, the worker retrieves the data. The CID from the new deal is sent to the smart contract`\n                }\n                if (data.jobType === \"renewal\" || data.jobType === \"all\") {\n                    document.getElementById(\n                        \"renewJobStatus\"\n                    ).innerHTML = `Renew Job Status: Executing renewal job every ${data.epochs} epochs.<br><br>\n        Calling getExpiringDeals from smart contract instance to get deals that are expiring, perform a retrieval and submit the retrieved data to aggregators to create a new deal. The CID from the new deal is sent to the smart contract`\n                }\n                if (data.jobType === \"repair\" || data.jobType === \"all\") {\n                    document.getElementById(\n                        \"repairJobStatus\"\n                    ).innerHTML = `Repair Job Status: Executing repair job every ${data.epochs} epochs.<br><br>\n        Calling the StateMarketStorageDeal operation on the Lotus endpoint to see if the deal has been inactive for longer than the repair threshold. If so, the worker resubmits the deal to the smart contract and creates a new deal.`\n                }\n            } else {\n                console.log(data)\n                // If deal information is not yet available, poll again after a delay\n                setTimeout(() => pollDealStatus(cid), 5000) // 5 seconds delay\n            }\n        })\n        // Catch all remaining unexpected errors.\n        .catch((error) => {\n            console.error(\"Error:\", error)\n            document.getElementById(\"jobregStatus\").textContent = \"Waiting for deal status.\"\n        })\n}\n\ndocument.getElementById(\"cid\").addEventListener(\"keydown\", function (event) {\n    if (event.key === \"Tab\") {\n        event.preventDefault() // Prevent the usual tab behavior\n        this.value = this.placeholder // Set the input value to the placeholder\n    }\n})\n\n// Allow the user to register a job\ndocument.getElementById(\"registerJobForm\").addEventListener(\"submit\", function (e) {\n    e.preventDefault() // Prevent the default form submission\n\n    // Show the \"uploading\" message\n    document.getElementById(\"jobregStatus\").textContent = \"Registering job...\"\n\n    // Collect form data\n    const formData = new FormData(e.target)\n    let cid\n    for (let [key, value] of formData.entries()) {\n        console.log(key, value)\n        if (key === \"cid\") {\n            cid = value // Assign the CID value if found in form data\n        }\n    }\n\n    // Send a POST request\n    fetch(\"/api/register_job\", {\n        method: \"POST\",\n        body: formData,\n    })\n        .then((response) => response.json()) // Assuming the server responds with JSON\n        .then((data) => {\n            // Update the UI with the response\n            if (!data.error) {\n                document.getElementById(\"jobregStatus\").textContent =\n                    \"CID has been registered with the smart contract! Awaiting response from lighthouse (this takes up to 24 hours)...\"\n                // Start polling the deal status\n                pollDealStatus(cid)\n            } else {\n                document.getElementById(\"jobregStatus\").textContent =\n                    \"Job registration failed! \" + data.error\n            }\n        })\n        .catch((error) => {\n            console.error(\"Error:\", error)\n            document.getElementById(\"jobregStatus\").textContent =\n                \"An error occurred during the upload.\"\n        })\n})\n\n\n//# sourceURL=webpack://FEVM-Hardhat-Kit/./public/script.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./public/script.js"]();
/******/ 	
/******/ })()
;