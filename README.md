# Export Firebase Authentication users and Cloud Firestore to BigQuery

- Export Firebase Authentication users to Cloud Firestore
- Export Cloud Firestore to Cloud Storage
- Export Cloud Storage to BigQuery(Partitioned tables)

## See

- [Cloud Pub/Sub triggers](https://firebase.google.com/docs/functions/pubsub-events)
- [admin.auth().listUsers()](https://firebase.google.com/docs/reference/admin/node/admin.auth.Auth#listUsers)
- [Schedule data exports](https://firebase.google.com/docs/firestore/solutions/schedule-export)
- [Loading data from Cloud Firestore exports](https://cloud.google.com/bigquery/docs/loading-data-cloud-firestore)
- [BigQuery API For Jobs Resource](https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs)
- [Partitioned tables](https://cloud.google.com/bigquery/docs/partitioned-tables#partitioned_tables)

## Inspired

- https://github.com/firebase/snippets-node/tree/master/firestore/solution-scheduled-backups

## Setup

#### Cloud SDK

See: [Cloud SDK quickstarts](https://cloud.google.com/sdk/docs/quickstarts/)

#### firebase

See: [Firebase CLI](https://firebase.google.com/docs/cli/)

```
firebase login
firebase use <projectId>
```

See: [Schedule data exports](https://firebase.google.com/docs/firestore/solutions/schedule-export)

You must complete the following tasks.

- [Before you begin](https://firebase.google.com/docs/firestore/solutions/schedule-export#before_you_begin)
- [Configure access permissions](https://firebase.google.com/docs/firestore/solutions/schedule-export#configure_access_permissions)
  - You should assign the Storage Admin role on your bucket from [Console](https://console.cloud.google.com/storage/browser) if error occurred when you run gsutil
- Create Cloud Storage bucket for export and import operations(ex: gs://PROJECT-ID_backups-firestore)
- [Enable Object Lifecycle Management](https://cloud.google.com/storage/docs/managing-lifecycles) for a bucket if you want

#### BigQuery

See: [Creating datasets](https://cloud.google.com/bigquery/docs/datasets#creating_a_dataset)

Create new dataset. Dataset ID is firestore in this sample code.

#### node_modules

```
npm i
cd appengine
npm i
cd ../functions/
npm i
```

## Deploy

#### appengine

```
cd appengine/
npm run deploy
```

- [Setting up Cloud IAP access](https://cloud.google.com/iap/docs/app-engine-quickstart#iap-access)

#### functions

```
cd functions/
npm run deploy
```

## Creating and Configuring Cron Jobs by Cloud Scheduler

See: [Creating and Configuring Cron Jobs](https://cloud.google.com/scheduler/docs/creating)

#### Export Firebase Authentication users to Cloud Firestore

Choose the Pub/Sub target and set topic.

Topic is cron-export-user-list-job in this sample code.

#### Export All Cloud Firestore collections and Specified collections to Cloud Storage

Choose the App Engine HTTP target and set URL.

ex. /cloud-firestore-export?outputUriPrefix=gs://PROJECT-ID_backups-firestore&collections=users,etc

#### Export Specified collections to BigQuery(Partitioned tables)

Choose the App Engine HTTP target and set URL.

ex. /cloud-firestore-export-to-bigquery?outputUriPrefix=gs://PROJECT-ID_backups-firestore&collections=users,etc

## Additional

You can create the table to use [Scheduling queries](https://cloud.google.com/bigquery/docs/scheduling-queries).
You can create the interactive dashboards to use [Data Portal](https://datastudio.google.com/overview).

## Coution

If collection fields is changed then [set the projectionFields property](https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs#configuration.load.projectionFields) or [update BigQuery table schema](https://cloud.google.com/bigquery/docs/managing-table-schemas)

And edit Scheduling queries,  do [manual run](https://cloud.google.com/bigquery/docs/scheduling-queries#setting_up_a_manual_run_on_historical_dates) if you need.
