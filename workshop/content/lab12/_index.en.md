+++
title = "SQL Server to Redshift Migration"
date = 2020-01-11T16:28:25-08:00
weight = 12
pre = "<b>12. </b>"
+++

This lab demonstrates how we can use AWS Schema Conversion Tool (AWS SCT) to migrate data and code (DDL structures and the T-SQL code) from an SQL Server database to Amazon Redshift.

## Contents
* [Prerequisites](#prerequisites)
* [Architecture](#architecture)
* [Environment Setup](#environment-setup)
* [Before you Begin](#before-you-begin)
* [1 Convert the Schema](#2-convert-the-schema)
* [2 Migrate the data](#3-migrate-the-data)
* [Before You Leave](#before-you-leave)

## Prerequisites
If you do not have a Remote Desktop client installed, you can use the instructions at this [link](https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/connecting_to_windows_instance.html) to do so.

## Architecture
To solve the challenge, here is the architecture that you would be going through in this lab:
* **MSSQL database instance**: This will be the source database for this migration lab
* **Amazon Redshift cluster**: This will be the target database for this migration lab
* **Windows EC2 client**:  This windows instance will serve as our workstation, where you'll have all SCT and other tools to perform migration
* **Associated networking resources**

![Architecture](../images/lab12/demo-architecture-sct.png)

## Environment Setup
If you are running this workshop in an AWS-sponsored or AWS-staffed event, it is likely that you are given a temporary AWS account environment, in which the required lab resources have been pre-provisioned for you. In that case, please directly proceed to the next steps.  Otherwise, use the following Cloud Formation template link.  

[![Launch](../images/cloudformation-launch-stack.png)](https://console.aws.amazon.com/cloudformation/home?#/stacks/new?stackName=ImmersionLab2&templateURL=https://s3-us-west-2.amazonaws.com/redshift-immersionday-labs/lab11.yaml)

`Optional` Open AWS console and then navigate to CloudFormation service. You will then be able to view the [deployed stack](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks?filteringText=&filteringStatus=active&viewNested=true&hideStacks=false).

{{% notice note %}}
Please select *US-East-1 (N.Virginia)* for the cloudFormation stack. Other regions are not supported for this lab at this moment.  
{{% /notice %}}
{{% notice note %}}
The template will use the default CIDR block of 0.0.0.0/0 which provides access from any IP Address.  It is a best practice to replace this a range of IP addresses which should have access or allow only your own IP Address x.x.x.x/32.  
{{% /notice %}}
{{% notice note %}}
To avoid paying for unused resources, please delete this cloudFormation stack after finishing this lab.
{{% /notice %}}

## Before You Begin
Gather the following key pieces of information which are unique to your environment by navigating to the deployed cloudFormation stack.  

* [Redshift-Endpoint] - Navigate to `Amazon Redshift` service and then to `Clusters`. You should be able to see the target Redshift cluster for this migration. Click the `properties` tab and then copy `endpoint` of this cluster.

![](../images/lab11/redshift.bmp)

* [EC2-Client-Endpoint] - Navigate to `EC2` service and you could see an EC2 instance in running state. This is an Windows instance, pre-loaded with the required drivers and softwares needed for this lab, i.e. [AWS Schema Conversion Tool](https://aws.amazon.com/dms/schema-conversion-tool/), [SQL Workbench](https://www.sql-workbench.eu/) and [Oracle SQL Developer](https://www.oracle.com/tools/downloads/sqldev-downloads.html). Please copy the public DNS or IP address to login to that instance.

![](../images/lab11/ec2.bmp)

## 1 Convert the Schema
In this section, you'll take care of migrating code and data structures from the source SQL Server database to Amazon Redshift datawarehouse using AWS Schema Conversion Tool. This include the table definitions, stored procedures, views and other database objects.

1.1.  To start with the migration, first you'll need to login to the windows EC2 instance using it's IP address or public endpoint. You may use Windows Remote Desktop client (RDP) tool to login to that instance. Assume that to be your windows workstation, where you do all your work on day to day basis

```
Remote Desktop Host: [EC2-Client-Endpoint]  

Username: developer
Passowrd: Password1
```

![](../images/lab11/sct1.png)

1.2.  Once logged in, open AWS Schema Conversion Tool and initiate a new project.  

Click `File> New project> Data Warehouse(OLAP) > Ok`. Then select `OLAP` followed by `Microsoft SQL Server DW`.

![](../images/lab12/sqlserver-sct1.png)

1.3.  Now, you need to configure the connectivity for the  Microsoft SQL Server source system.

Click `Connect to Microsoft SQL Server DW`, then Input below parameters and Click `Test`.  It should show connection successful:

```
Servername: localhost
port: 1433
Username: awssct
Password: Password1
DriverPath: C:\DMS Workshop\JDBC\sqljdbc_7.4\enu\mssql-jdbc-7.4.1.jre8.jar
```

![](../images/lab12/sqlserver-sct2.png)

1.4.  By default, AWS SCT uses AWS Glue as ETL solution for the migration. You will need to disable it as it's not being used in this lab.  

Click `Settings` then select `Project Settings`   

![](../images/lab11/prep4.png)

Uncheck `Use AWS Glue`  
Click `OK` after that

![](../images/lab11/prep4a.png)

1.5.  Now, you need to configure the connectivity for the target system, Redshift.
Input below parameters in the connection Tab and then click `Test`. It should show connection successful.

```
Servername: [Redshift-Endpoint]
Port: 5439
Database: dev
Username: demo
Password: Password1
RedshiftDriverPath: C:\DMS Workshop\JDBC\RedshiftJDBC42-1.2.43.1067.jar
```

![](../images/lab11/prep5.png)

1.6.  On the left hand side, you can see all objects in SQL Server and on the right hand side, all Redshift objects. you may now convert the SQL Server schema `DMS_SAMPLE`.  

Right click `DMS_SAMPLE` schema and then click `convert schema`.  

After that, click the default options `Yes` and `Continue` when prompted on the next screens about already existing objects and source database statistics.

![](../images/lab12/sqlserver-sct3.png)

1.7.  All SQL Server objects should got converted to Redshift syntax by now. But there would be some objects showing in Red, which essentially means that SCT couldn’t fully migrate these objects. You can view an assessment summary for the migration  to analyze those objects.  

Click `View > Assessment Report View`

![](../images/lab12/sqlserver-sct4.png)

1.8.  AWS SCT produces an executive summary describing the overall migration effort. It describes which objects could and couldn’t be migrated successfully using AWS SCT.  
Click `Action Items` tab, which would show what action you need to take to migrate the unsuccessful objects.  

![](../images/lab12/sqlserver-sct5.png)

1.9.  Now, to save the successfully migrated objects in Redshift, you can save the scripts generated by SCT into your local disk and run these scripts directly into your Redshift cluster using SQL workbench.

Right click `dms_sample` on the right hand side Redshift tab and click `Save as SQL`.

![](../images/lab12/sqlserver-sct6.png)

1.10.  Now, you can the script in Redshift using `Redshift query editor` in AWS console or third party IDE like `SQL workbench`, which is an open source JDBC IDE.  
Open SQL workbench from the taskbar shortcut, which opens the new connection window. In that, click `Manage Drivers` in bottom left hand corner and select Redshift.  Update the driver path as `C:\DMS Workshop\JDBC\RedshiftJDBC42-1.2.43.1067.jar`

![](../images/lab11/prep6.png)

1.11.  Then move back to the connectivity screen.
Input below parameters and then click `Test`, which should be successful then Click `OK`.

```
Driver: Amazon Redshift
URL: jdbc:redshift://[Redshift-Endpoint]:5439/dev
Username: awsuser
Username: demo
Password: Password1
Autocommit: tick mark
```

![](../images/lab11/prep7.png)

1.12. Run the scripts saved in step 1.9 in SQL workbench:  

All these tables should got successfully created in this Redshift schema, but as expected, there would not be any records in them. Next, you will migrate data from SQL Server to Redshift using a AWS SCT extractor agents.

![](../images/lab12/sqlserver-sct7.png)

1.13.  You may not examine the tables migrated to the `dms_sample` schema by running below query in SQL workbench:  

```
select t.table_schema, t.table_name,i.tbl_rows
from svv_tables t left join svv_table_info i
on t.table_schema = i.schema and t.table_name = i.table
where t.table_type = 'BASE TABLE' and t.table_schema='dms_sample'
order by 1,2
```

All these tables should get successfully created in this Redshift schema, but as expected, there would not be any records in them. Next, you will migrate data from SQL Server to Redshift using a service called AWS Database Migration Service (DMS)

![](../images/lab12/TableCreationVerify.png)


### 3 Migrate the data
In this section, you'll take care of migrating data from the source SQL Server database to Amazon Redshift datawarehouse using AWS SCT extractor agents

2.1. We need to create a IAM user for AWS Service profile used by SCT extractor agents. Open your web browser and login to AWS console. Navigate to `IAM` Service. Create a user for AWS SCT extractor agents. This user needs to have policies for EC2, IAM, S3 and Redshift.

![](../images/lab12/sqlserver-sct8.png)

2.2. Next, you need to configure the settings.properties file at `C:\Program Files\AWS SCT Data Extractor Agent` with the below configuration. you dont need to perform this step if you reinstalled the SCT during this demo and configured the agent during installation.
```
port=8192
vendor=SQLSERVER
driver.jars="C:\DMS Workshop\JDBC\sqljdbc_7.4\enu\mssql-jdbc-7.4.1.jre8.jar"
redshift.driver.jars="C:\DMS Workshop\JDBC\RedshiftJDBC42-no-awssdk-1.2.43.1067.jar"

working.folder=C:/Users/developer
extractor.private.folder=C:/Users/developer

ssl.option=OFF
ssl.require.client.authentication=OFF

 #extractor.start.fetch.size=20000
 #extractor.out.file.size=10485760
```

![](../images/lab12/sqlserver-sct9.png)

2.3. Next you need to start the extractor agents background process by double clicking on StartAgent.bat at at `C:\Program Files\AWS SCT Data Extractor Agent`. Check the task scheduler to see if sct-extractor task is running to verify.

![](../images/lab12/sqlserver-sct10.png)

2.4. Next, create an IAM user with policies to have access to EC2, S3, Redshift and IAM. Download the access key and secret key information of this user. You will use this user in AWS service profile in SCT.  

![](../images/lab12/IAMUser.png)

2.5. In SCT tool, create an AWS Service profile by using the access key and secret of IAM user created in previous step. In SCT, go to `settings` and click `Global Settings`. Under Global Settings, provide the IAM user credentials and click `Test connection`, verify the connection success as shown in the image below. Click `Apply` and `ok`.

![](../images/lab12/AWS-ServiceProfile.png)

2.6. Within SCT, go to `View` and click on `Data migration view`.

![](../images/lab12/DMView.png)

Here you need to register the extractor agents. Click on `Register` and fill out the information. Click on `Test connection` to verify agent connection.

![](../images/lab12/RegisterAgent.png)

Once agent is registered, you need to create a task for the agent to perform the Extract, Upload and Copy operation. Right click on the source/left side and choose `Create local task` option.

![](../images/lab12/CreateLocalTask.png)

In the window of `Create local task`, choose `Migration mode` as `Extract, upload and copy` and on the `AWS S3 Settings` tab enter the S3 location used in this demo.

![](../images/lab12/LocalTask.png)
![](../images/lab12/LocalTask2.png)

Once the local task is created, click on the `Start` to kick off the migration.

![](../images/lab12/StartLocalTask.png)

You can check the status of each task and subtasks (at table level) performed by SCT to migrate your data.

![](../images/lab12/LocalTaskStatus.png)

If you want to view the logs of this migration, you can click on the `Download log` to save the logs at SCT installed location.

![](../images/lab12/CheckLogs.png)

You may verify the same in SQL workbench.
You can see all these tables got loaded with data in Redshift.  
Execute the same command executed earlier in SQL workbench to view the record count

```sql
select t.table_schema, t.table_name,i.tbl_rows
from svv_tables t left join svv_table_info i
on t.table_schema = i.schema and t.table_name = i.table
where t.table_type = 'BASE TABLE' and t.table_schema='dms_sample'
order by 1,2
```

![](../images/lab12/CheckResults.png)

## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources.
