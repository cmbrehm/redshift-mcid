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
- [Contents](#contents)
- [Before You Begin](#before-you-begin)
- [Configure Security](#configure-security)
  - [Security Group](#security-group)
- [Launch Redshift Cluster](#launch-redshift-cluster)
- [Run Sample Query](#run-sample-query)

## Before You Begin
* Determine and capture the following information and login to the [AWS Console](https://console.aws.amazon.com/). If you are new to AWS, you can [create an account](https://portal.aws.amazon.com/billing/signup).
  * [Your-AWS_Account_Id]
  * [Your_AWS_User_Name]
  * [Your_AWS_Password]
* This lab will leverage the us-west-2 AWS Region (Oregon).  In the top-right corner, switch the AWS console to us-west-2.  

## Configure Security
{{% notice info %}}
For purposes of this lab, we will be configuring our Redshift cluster in a public VPC subnet (one that allows internet ingress).  We will configure a VPC Security Group to allow only connections from your public IP for the course of this lab.  This would not be a recommended configuration for a production system.
{{% /notice %}}

### Security Group
Create a **Security Group** associated to the VPC.  Edit the Security Group to create a rule which allows incoming connections to Redshift from your IP Address as well as a self-referencing rule for All Traffic.
```
https://console.aws.amazon.com/vpc/home#SecurityGroups:sort=groupId
```
![](../images/SecurityGroup.png)
![](../images/SecurityGroup_1.png)
![](../images/SecurityGroup_2.png)

## Launch Redshift Cluster
Finally, navigate to the **Amazon Redshift Dashboard** and click on the "Create Cluster" button.  
```
https://console.aws.amazon.com/redshiftv2/home?#clusters
```
* Cluster Configuration - Select "Free Trial" for a one-node dc2.large cluster.  This will be sufficient for today's lab.
![](../images/CreateCluster1.png)
{{< html.inline >}}<img src=../images/CreateCluster1.png class=box>{{< /html.inline >}}

* Cluster Details - Enter values as appropriate for your organization.  
{{% notice warning %}}
Note the Master user password as you will not be able to retrieve this value later.
{{% /notice %}}
![](../images/CreateCluster2.png)

* Cluster Permissions - Select RedshiftImmersionRole from the **Available IAM Role** dropdown  and click **Associate IAM role**
![](../images/CreateCluster3.png)

* Additional Configuration - Disable **Use defaults** and set **Publicly Accessible** to true.

{{% notice info %}}
Once again, please don't do this in any environment that's more important than a sandbox.
{{% /notice %}}

![](../images/CreateCluster4.png)

Leave the remaining settings with their default values.  Click **Create Cluster** to launch the Redshift cluster.

## Run Sample Query
Wait for the cluster to become **Available**.  Select it with the selection box next to it and click **Query cluster** to open the query interface.

For this Immersion Day, we will leverage the old version of Query Editor.  To open query editor,

1. Select Query Editor from the left hand side
2. Click on "old query editor" in the blue notification at the top of the screen

![](../images/lab1-query-editor-1.png)
![](../images/lab1-query-editor-2.png)

* Click **Connect to Database**, enter in database information, and click **Connect to Database**

![](../images/lab1-query-editor-3.png)

* Run the following query to list the users within the redshift cluster.  
```
select * from pg_user
```

* If you receive the following results, you have established connectivity and this lab is complete.  

![](../images/Users3.png)
