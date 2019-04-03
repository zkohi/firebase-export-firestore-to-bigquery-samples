import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

export const exportUserListJob = functions.pubsub
  .topic("cron-export-user-list-job")
  .onPublish(
    async (
      message: functions.pubsub.Message,
      context: functions.EventContext
    ) => {
      const eventAgeMs = Date.now() - Date.parse(context.timestamp);
      const eventMaxAgeMs = 90000;
      if (eventAgeMs > eventMaxAgeMs) {
        const errorMessage = `Dropping event ${
          context.eventId
        } with age[ms]: ${eventAgeMs}`;
        console.error(errorMessage);
        return;
      }

      const exportTime = new Date();
      try {
        let pageToken = null;
        do {
          const listUsersResult: admin.auth.ListUsersResult = pageToken
            ? await admin.auth().listUsers(500, pageToken)
            : await admin.auth().listUsers(500);
          const batch = admin.firestore().batch();

          listUsersResult.users.forEach((userRecord: admin.auth.UserRecord) => {
            const ref = admin
              .firestore()
              .collection("users")
              .doc(userRecord.uid);
            const customClaims = userRecord.customClaims
              ? userRecord.customClaims
              : {};
            const creationTime = new Date(userRecord.metadata.creationTime);
            const lastSignInTime = userRecord.metadata.lastSignInTime
              ? new Date(userRecord.metadata.lastSignInTime)
              : null;
            const providerIds = userRecord.providerData.map(
              (provider: admin.auth.UserInfo) => provider.providerId
            );
            const data = {
              customClaims,
              disabled: userRecord.disabled,
              emailVerified: userRecord.emailVerified,
              creationTime,
              lastSignInTime,
              providerIds,
              exportTime
            };
            batch.set(ref, data);
          });

          await batch.commit();

          pageToken = listUsersResult.pageToken;
        } while (pageToken);

        return;
      } catch (e) {
        console.error(e);
        return Promise.reject(e);
      }
    }
  );
