// Useing Apache-2.0 license code in this code of parts. Author is Google, Inc.
// https://github.com/firebase/snippets-node/tree/master/firestore/solution-scheduled-backups
"use strict";

const axios = require("axios");
const dateformat = require("dateformat");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const express = require("express");

const app = express();
app.enable("trust proxy");

app.use(bodyParser.raw());
app.use(bodyParser.json());
app.use(bodyParser.text());

const cloudFirestoreExportToBigqueryProjectionFields = {
  // To load only specific fields, set the projectionFields property.
  // See: https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs#configuration.load.projectionFields
  // users: [
  //   "creationTime"
  // ]
};

app.get("/", (req, res) => {
  res.send("Hello, World!").end();
});

app.get("/cloud-firestore-export", async (req, res) => {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/datastore"]
  });

  const accessTokenResponse = await auth.getAccessToken();
  const accessToken = accessTokenResponse.token;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + accessToken
  };

  const outputUriPrefix = req.query.outputUriPrefix;
  if (!(outputUriPrefix && outputUriPrefix.indexOf("gs://") == 0)) {
    res.status(500).send(`Malformed outputUriPrefix: ${outputUriPrefix}`);
  }

  const timestamp = req.query.date
    ? req.query.date
    : dateformat(Date.now(), "yyyy-mm-dd");
  let path = outputUriPrefix;
  if (path.endsWith("/")) {
    path += timestamp;
  } else {
    path += "/" + timestamp;
  }

  const body = {
    outputUriPrefix: `${path}/all`
  };

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const url = `https://firestore.googleapis.com/v1beta1/projects/${projectId}/databases/(default):exportDocuments`;

  try {
    const response = await axios.post(url, body, { headers });

    // If specified, mark specific collections for backup
    const collections = req.query.collections;
    if (collections) {
      await axios.post(
        url,
        {
          outputUriPrefix: `${path}/collections`,
          collectionIds: collections.split(",")
        },
        { headers }
      );
    }
    res
      .status(200)
      .send(response.data)
      .end();
  } catch (e) {
    if (e.response) {
      console.warn(e.response.data);
    }

    res
      .status(500)
      .send("Could not start backup: " + e)
      .end();
  }
});

app.get("/cloud-firestore-export-to-bigquery", async (req, res) => {
  const auth = await google.auth.getClient({
    scopes: ["https://www.googleapis.com/auth/bigquery"]
  });

  const accessTokenResponse = await auth.getAccessToken();
  const accessToken = accessTokenResponse.token;

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + accessToken
  };

  const bucket = req.query.bucket;
  if (!(bucket && bucket.indexOf("gs://") == 0)) {
    res.status(500).send(`Malformed bucket: ${bucket}`);
  }

  const collections = req.query.collections;
  const collectionIds = collections.split(",");
  if (collectionIds.length === 0) {
    res.status(500).send(`Malformed collections: ${collections}`);
  }

  const now = Date.now();
  const date = req.query.date ? new Date(req.query.date).getTime() : now;
  const timestamp = req.query.date
    ? req.query.date
    : dateformat(date, "yyyy-mm-dd");
  const ymd = timestamp.split("-").join("");
  let path = bucket;
  if (path.endsWith("/")) {
    path += timestamp;
  } else {
    path += "/" + timestamp;
  }

  const projectId = process.env.GOOGLE_CLOUD_PROJECT;

  try {
    for (let i = 0; i < collectionIds.length; i++) {
      const collection = collectionIds[i];
      const sourceUri = `${path}/collections/all_namespaces/kind_${collection}/all_namespaces_kind_${collection}.export_metadata`;
      const url = `https://www.googleapis.com/bigquery/v2/projects/${projectId}/jobs`;
      const projectionFields = cloudFirestoreExportToBigqueryProjectionFields[
        collection
      ]
        ? cloudFirestoreExportToBigqueryProjectionFields[collection]
        : [];
      const body = {
        jobReference: {
          projectId,
          jobId: `${collection}-${now}`,
          location: "US"
        },
        configuration: {
          load: {
            destinationTable: {
              tableId: `${collection}$${ymd}`,
              datasetId: "firestore",
              projectId
            },
            projectionFields,
            timePartitioning: { type: "DAY", requirePartitionFilter: true },
            sourceFormat: "DATASTORE_BACKUP",
            writeDisposition: "WRITE_TRUNCATE",
            sourceUris: [sourceUri]
          }
        }
      };
      const response = await axios.post(url, body, {
        headers
      });
      if (response.data.status.errorResult) {
        return res
          .status(500)
          .send(
            `Could not start export: ${
              response.data.status.errorResult.message
            }`
          )
          .end();
      }
    }
    res
      .status(200)
      .send("OK")
      .end();
  } catch (e) {
    if (e.response) {
      console.warn(e.response.data);
    }

    res
      .status(500)
      .send("Could not start export: " + e)
      .end();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(process.env.PORT || 8080, () => {
  console.log(`App listening on port ${PORT}`);
  console.log("Press Ctrl+C to quit.");
});
