+++
title = "Creating a Cluster"
date = 2020-01-22T16:27:02-08:00
weight = 1
pre = "<b>1. </b>"
+++

{{< html.inline >}}
<style>
.box {
  border: 2px solid;
  border-color: DarkGray;
  height: 400px;
}
</style>
{{< /html.inline >}}

In this lab you will launch a new Redshift Cluster, setup connectivity and configure a JDBC Client tool.

## Contents
* [Before You Begin](#before-you-begin)
* [Cloud Formation](#cloud-formation)
* [Configure Security](#configure-security)
* [Launch Redshift Cluster ](#launch-redshift-cluster)
* [Configure Client Tool](#configure-client-tool)
* [Run Sample Query](#run-sample-query)
* [Before You Leave](#before-you-leave)

## Before You Begin
* Determine and capture the following information and login to the [AWS Console](https://console.aws.amazon.com/). If you are new to AWS, you can [create an account](https://portal.aws.amazon.com/billing/signup).
  * [Your-AWS_Account_Id]
  * [Your_AWS_User_Name]
  * [Your_AWS_Password]
* Determine the [AWS Region Name] and [AWS Region Id] which is closest to you and switch your console to that [Region](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RegionsAndAvailabilityZones.html).  

## Configure Security
{{% notice info %}}
For purposes of this lab, we will be configuring our Redshift cluster in a public VPC subnet (one that allows internet ingress).  We will configure a VPC Security Group to allow only connections from your public IP for the course of this lab.  This would not be a recommended configuration for a production system.
{{% /notice %}}

### Security Group
Create a **Security Group** associated to the VPC.  Edit the Security Group to create a rule which allows incoming connections to Redshift from your IP Address as well as a self-referencing rule for All Traffic.
```
https://console.aws.amazon.com/vpc/home#SecurityGroups:sort=groupId
```
{{< html.inline >}}<img src=../images/SecurityGroup.png class=box>{{< /html.inline >}}
{{{< html.inline >}}<img src=../images/SecurityGroup_1.png class=box>{{< /html.inline >}}
{{< html.inline >}}<img src=../images/SecurityGroup_2.png class=box>{{< /html.inline >}}

## Launch Redshift Cluster
Finally, navigate to the **Amazon Redshift Dashboard** and click on the "Create Cluster" button.  
```
https://console.aws.amazon.com/redshiftv2/home?#clusters
```
* Cluster Configuration - Select "Free Trial" for a one-node dc2.large cluster.  This will be sufficient for today's lab.
{{< html.inline >}}<img src=../images/CreateCluster1.png class=box>{{< /html.inline >}}

* Cluster Details - Enter values as appropriate for your organization.  
{{% notice warning %}}
Note the Master user password as you will not be able to retrieve this value later.
{{% /notice %}}
{{< html.inline >}}<img src=../images/CreateCluster2.png class=box>{{< /html.inline >}}

* Cluster Permissions - Select RedshiftImmersionRole from the **Available IAM Role** dropdown  and click **Associate IAM role**
{{< html.inline >}}<img src=../images/CreateCluster3.png class=box>{{< /html.inline >}}

* Additional Configuration - Disable **Use defaults** and set **Publicly Accessible** to true.

{{% notice info %}}
Once again, please don't do this in any environment that's more important than a sandbox.
{{% /notice %}}

{{< html.inline >}}<img src=../images/CreateCluster4.png class=box>{{< /html.inline >}}

Leave the remaining settings with their default values.  Click **Create Cluster** to launch the Redshift cluster.

## Configure Client Tool
* While Amazon Redshift does provide a web-based [Query editor](https://console.aws.amazon.com/redshift/home?#query:) for executing simple queries, for these labs, it is recommended you install a third-party tool.  We will use [SQL Workbench/J](http://www.sql-workbench.net).
* Navigate to the [SQL Workbench/J Downloads Page](https://www.sql-workbench.eu/downloads.html) and click on the `Generic package for all systems` link to download the latest version of the SQL Workbench/J product.  Note: SQL Workbench/J requires Java 8 or later to be installed on your system.
* Extract the downloaded zip file into a directory of your choice.
* If using a Windows machine.  Execute the `SQLWorkbench.exe` program.
* If using a Mac or Unix system.  Open the `Terminal` app, `cd` to the extract directory, type `bash sqlworkbench.sh` and press enter.
* If this fails to run and you do not have java running on your system, you may need to download and install it.   See the following site for options: https://www.codejava.net/java-se/download-and-install-jdk-14-openjdk-and-oracle-jdk
* Once running, navigate to the following location to download the latest JDBC driver: [Configure JDBC Connection](https://docs.aws.amazon.com/redshift/latest/mgmt/configure-jdbc-connection.html#jdbc-previous-versions-with-sdk).
* Launch SQL Workbench/J and navigate to ``[File | Manage Drivers]``.
* Select `Amazon Redshift` and set the driver Library location to where you downloaded the Redshift JDBC Driver. Click Ok.
![](../images/Library.png)
* Navigate to [File | Connect Window] to create a new connection profile and modify the following settings and once complete click on the "Test Connection" button.
  * Name - "LabConnection"
  * Driver - Amazon Redshift (com.amazon.redshift.jdbc.Driver)
  * URL - Find this by navigating to the [Cluster List](https://console.aws.amazon.com/redshiftv2/home?#clusters), selecting your cluster, clicking on **Properties** and copying the **Endpoint** located in the **Connection details**.  
  ![](../images/JDBCUrl.png)
  * Username - [Master user name]
  * Password - [Master user password]
  * Autocommit - Enabled

![](../images/Connection.png)

## Run Sample Query
* Run the following query to list the users within the redshift cluster.  
```
select * from pg_user
```
* If you receive the following results, you have established connectivity and this lab is complete.  
![](../images/Users.png)

## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources.
