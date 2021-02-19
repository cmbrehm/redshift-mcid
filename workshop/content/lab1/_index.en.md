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

## Cloud Formation
To launch this cluster and configure security automatically using cloud formation, use the following link and skip ahead to [Configure Client Tool](#configure-client-tool).  
[![Launch](../images/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?#/stacks/new?stackName=ImmersionLab1&templateURL=https://s3-us-west-2.amazonaws.com/redshift-immersionday-labs/lab1.yaml)

{{% notice note %}}
When choosing a Region for your cluster, consider *US-WEST-2 (Oregon)*.  While most of these labs can be done in any Region, some labs query data in S3 which is located in *US-WEST-2*.
{{% /notice %}}

{{% notice note %}}
The template will use the default CIDR block of 0.0.0.0/0 which provides access from any IP Address.  It is a best practice to replace this a range of IP addresses which should have access.  For the purpose of these labs, replace it with your IP Address x.x.x.x/32.
{{% /notice %}}

## Configure Security
### VPC
Create or identify a VPC where you will launch your Redshift cluster.  For many customers, the default VPC, Subnets, and Security Group are sufficient.  If you are using the defaults, you can skip ahead to [Subnet Group](#subnet-group).  For our purposes we will create a new **VPC** to isolate the traffic and create a new public subnet where the Redshift cluster will be deployed.
```
https://console.aws.amazon.com/vpc/home?#CreateVpc:
```
![](../images/VPC.png)

By default the VPC does not support DNS Hostnames. Enable it now by clicking **Actions** --> **Edit DNS hostnames**.
{{< html.inline >}}<img src=../images/VPC_1.png class=box>{{< /html.inline >}}

Click the **enable** check box.
{{< html.inline >}}<img src=../images/VPC_2.png class=box>{{< /html.inline >}}

### InternetGateway
To allow machines in your subnet to access the internet, we will create an **Internet Gateway**.  Once created, select the Internet Gateway and attach it to the VPC created earlier.  
```
https://console.aws.amazon.com/vpc/home?#Create%20Internet%20Gateway:
```
![](../images/InternetGateway.png)
![](../images/InternetGatewayAttach1.png)
![](../images/InternetGatewayAttach2.png)
### Subnets
Now, create two subnets with a default route to the previously created VPC in two different Availability Zones to improve fault tolerance.
```
https://console.aws.amazon.com/vpc/home?#CreateSubnet:
```
![](../images/Subnet1.png)
![](../images/Subnet2.png)
### Route Table
To ensure the subnet has a way to connect to the internet, create a **Route Table** with the default route pointed to the internet gateway and with the new subnets added.
```
https://console.aws.amazon.com/vpc/home?#CreateRouteTable:
```
![](../images/Route.png)
![](../images/EditRoute.png)
![](../images/EditSubnet.png)

### Security Group
Create a **Security Group** associated to the VPC you created earlier.  Edit the Security Group to create a rule which allows incoming connections to Redshift from your IP Address as well as a self-referencing rule for All Traffic.
```
https://console.aws.amazon.com/vpc/home#SecurityGroups:sort=groupId
```
{{< html.inline >}}<img src=../images/SecurityGroup.png class=box>{{< /html.inline >}}
{{{< html.inline >}}<img src=../images/SecurityGroup_1.png class=box>{{< /html.inline >}}
{{< html.inline >}}<img src=../images/SecurityGroup_2.png class=box>{{< /html.inline >}}

### Subnet Group
Now, create a Redshift **Cluster Subnet Group** containing the two subnets you created earlier by clicking the add all subnets for this VPC button.
```
https://console.aws.amazon.com/redshiftv2/home?#subnet-groups
```
{{< html.inline >}}<img src=../images/SubnetGroup.png class=box>{{< /html.inline >}}

### S3 Access
In order for Redshift to have access to S3 to load data, create an **IAM Role** with the type "Redshift" and the use-case of "Redshift - Customizable" and attach the AmazonS3ReadOnlyAccess and AWSGlueConsoleFullAccess policies to the role.
```
https://console.aws.amazon.com/iam/home?#/roles$new?step=type
```
![](../images/Role.png)

## Launch Redshift Cluster
Finally, navigate to the **Amazon Redshift Dashboard** and click on the "Create Cluster" button.  
```
https://console.aws.amazon.com/redshiftv2/home?#clusters
```
* Cluster Configuration - Choose the node type and set the number of nodes.  For these labs a dc2.large node type with 4 nodes will be suitable.
{{< html.inline >}}<img src=../images/CreateCluster1.png class=box>{{< /html.inline >}}

* Cluster Details - Enter values as appropriate for your organization.  Note the Master user password as you will not be able to retrieve this value later.
{{< html.inline >}}<img src=../images/CreateCluster2.png class=box>{{< /html.inline >}}

* Cluster Permissions - Select the Role which you identified or created earlier to associate to the cluster, and click **Add IAM role**
{{< html.inline >}}<img src=../images/CreateCluster3.png class=box>{{< /html.inline >}}

* Additional Configuration - Disable **Use defaults** and choose the VPC, Subnet Group, and VPC Security group you identified or created earlier.
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
