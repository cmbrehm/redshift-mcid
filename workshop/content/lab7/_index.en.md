+++
title = "Operations"
date = 2020-01-22T16:27:02-08:00
weight = 7
pre = "<b>7. </b>"
+++
{{< html.inline >}}
<style>
img {
  border: 2px solid;
  border-color: black;
}
</style>
{{< /html.inline >}}

In this lab, we step through some common operations a Redshift Administrator may have to do to maintain their Redhshift environment.

## Contents
* [Before You Begin](#before-you-begin)
* [Event Subscriptions](#event-subscriptions)
* [Cluster Encryption](#cluster-encryption)
* [Cross Region Snapshots](#cross-region-snapshots)
* [Elastic Resize](#elastic-resize)
* [Before You Leave](#before-you-leave)

## Before You Begin
This lab assumes you have launched a Redshift cluster.  If you have not launched a cluster, see [LAB 1 - Creating Redshift Clusters](../lab1.html).

## Event Subscriptions
1. Navigate to your Redshift Events page.  Notice the *Events* involved with creating the cluster.  
```
https://console.aws.amazon.com/redshiftv2/home?#events
```
![](../images/Events.png)

2. Click on the *Event subscriptions* tab and then click on the *Create event subscription* button.
![](../images/CreateSubscription_0.png)

3. Create a subscription named *ClusterManagement* with the Source type *Cluster* for *all clusters* and a severity of *Info, Error*.  
![](../images/CreateSubscription_1.png)

4. Choose the subscription actions.  Choose *Create a new SNS topic* and name that topic *ClusterManagement*. Click *Create Topic*.
![](../images/CreateSubscription_2.png)

5. Ensure the subscription is enabled, and click on *Create event subscription*.›
![](../images/CreateSubscription_3.png)

6. Navigate to the SNS console and click on the newly created topic *ClusterManagement*.  Click on *Create subscription*.
```
https://console.aws.amazon.com/sns/v3/home?#/topics
```
![](../images/CreateSubscription_4.png)

7. Enter the protocol *Email* and enter the endpoint of an email address you have access to. Click *Create subscription*.
![](../images/CreateSubscription_5.png)

8. You will recieve an email shortly.  Click on the *Confirm subscription* link in the email.
![](../images/ConfirmSubscriptionEmail.png)

9. The link should take you to a final confirmation page confirming the subscription.
![](../images/SubscriptionConfirmed.png)

## Cluster Encryption
Note: This portion of the lab will take ~45 minutes to complete based on the data loaded in [LAB 2 - Creating Redshift Clusters](../lab2.html).  Please plan accordingly.

1. Navigate to your Redshift Cluster list.  Select your cluster and click on *Actions* -> *Modify*.
```
https://console.aws.amazon.com/redshiftv2/home?#clusters
```
![](../images/ModifyCluster.png)

2. Under *Database configurations*, enable the *Use AWS Key Management Service (AWS KMS)* radio option.  Click *Modify cluster*.
![](../images/EnableKMS.png)

4. Notice your cluster enters a *resizing* status.  The process of encrypting your cluster is similar to resizing your cluster using the classic resize method.  All data is read, encrypted and re-written. During this time, the cluster is still available for read queries, but not write queries.
![](../images/Resizing.png)

5. You should also receive an email notification about the cluster resize because of the event subscription we setup earlier.
![](../images/ResizeNotification.png)

## Cross Region Snapshots
1. Navigate to your Redshift Cluster list.  Select your cluster and click on *Actinos* -> *Configure Cross-region snapshots*.
```
https://console.aws.amazon.com/redshiftv2/home?#clusters
```
![](../images/ConfigureCRR_0.png)

2. Select the *Yes* radio button to enable the copy.  Select the destination region of *us-east-2*.  Because the cluster is encrypted you must establish a grant in the other region to allow the snapshot to be re-encrypted.  Select *Create new grant* for the Choose a Snapshot Copy Grant.  Name the Snapshot Copy Grant with the value *snapshotgrant*.  Click *Save*.
![](../images/ConfigureCRR_1.png)

3. To demonstrate the cross-region replication, initiate a manual backup.  Click on *Actions* -> *Create snapshot*.
![](../images/Snapshot_0.png)

4. Name the snapshot *CRRBackup* and click *Create snapshot*.
![](../images/Snapshot_1.png)

5. Navigate to your list of snapshots and notice the snapshot is being created.
```
https://console.aws.amazon.com/redshiftv2/home?#snapshots
```
![](../images/Snapshot_2.png)

6. Wait for the snapshot to finish being created.  The status will be *Available*.
![](../images/Snapshot_3.png)

7. Navigate to the us-east-2 region by select *Ohio* from the region drop down, or navigate to the following link.  
```
https://us-east-2.console.aws.amazon.com/redshiftv2/home?region=us-east-2#snapshots
```
![](../images/Snapshot_4.png)

## Elastic Resize
Note: This portion of the lab will take ~15 minutes to complete, please plan accordingly.
1. Navigate to your Redshift Cluster list.  Select your cluster and click on *Actions* -> *Resize*.  Note, if you don't see your cluster, you may have to change the *Region* drop-down.
![](../images/Resize_0.png)

2. Ensure the *Elastic Resize* radio is selected.  Choose the *New number of nodes*, and click *Resize now*.
![](../images/Resize_1.png)

3. When the resize operation begins, you'll see the Cluster Status of *Preparing for resize*.
![](../images/Resize_2.png)

4. When the operation completes, you'll see the Cluster Status of *Available* again.
![](../images/Resize_3.png)

## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources.
