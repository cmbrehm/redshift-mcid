+++
title = "Oracle to Redshift Migration"
date = 2020-01-11T16:28:25-08:00
weight = 11
pre = "<b>11. </b>"
+++

This lab demonstrates how we can use AWS Schema Conversion Tool (AWS SCT) and AWS Database Migration Service (DMS) to migrate data and code (DDL structures and the PL/SQL code) from an Oracle database to Amazon Redshift. It also demonstrates how AWS DMS to continually replicate database changes (ongoing updates) from the source database to the target database.  

## Contents
* [Prerequisites](#prerequisites)
* [Architecture](#architecture)
* [Environment Setup](#environment-setup)
* [Before you Begin](#before-you-begin)
* [1 Convert the Schema](#2-convert-the-schema)
* [2 Migrate the data](#3-migrate-the-data)
* [3 Keep the data in sync](#4-keep-the-data-in-sync)
* [Before You Leave](#before-you-leave)

## Prerequisites
If you do not have a Remote Desktop client installed, you can use the instructions at this [link](https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/connecting_to_windows_instance.html) to do so.

## Architecture
To solve the challenge, here is the architecture that you would be going through in this lab:
* **AWS DMS replication instance**: This instance will take care of migrating data from source to target databases
* **Oracle RDS database**: This will be the source database for this migration lab
* **Amazon Redshift cluster**: This will be the target database for this migration lab
* **Windows EC2 client**:  This windows instance will serve as our workstation, where you'll have all softwares and tools
* **Associated networking resources**

![Architecture](../images/lab11/architecture.png)

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

* [Oracle-Endpoint] - Navigate to `RDS` service and then go to Databases, you should be able to see an Oracle database instance, which is the source database for this migration lab. This database is pre-loaded with 10GB ticketing dataset. Please copy the `endpoint` of this database, which we'll need for the upcoming migration steps

![](../images/lab11/rds.bmp)

* [EC2-Client-Endpoint] - Navigate to `EC2` service and you could see an EC2 instance in running state. This is an Windows instance, pre-loaded with the required drivers and softwares needed for this lab, i.e. [AWS Schema Conversion Tool](https://aws.amazon.com/dms/schema-conversion-tool/), [SQL Workbench](https://www.sql-workbench.eu/) and [Oracle SQL Developer](https://www.oracle.com/tools/downloads/sqldev-downloads.html). Please copy the public DNS or IP address to login to that instance.

![](../images/lab11/ec2.bmp)

* [Replication-Instance] - Navigate to `AWS Database Migration Service`, also known as AWS DMS. If you navigate to `Replication instances`, you could find a replication instance, which was created by our initial cloud formation template for this demo. This instance would take care of all replication tasks from source to target databases.

![](../images/lab11/0replicationinstance.bmp)

## 1 Convert the Schema
In this section, you'll take care of migrating code and data structures from the source Oracle database to Amazon Redshift datawarehouse using AWS Schema Conversion Tool. This include the table definitions, stored procedures, views and other database objects.

1.1.  To start with the migration, first you'll need to login to the windows EC2 instance using it's IP address or public endpoint. You may use Windows Remote Desktop client (RDP) tool to login to that instance. Assume that to be your windows workstation, where you do all your work on day to day basis

```
Remote Desktop Host: [EC2-Client-Endpoint]  

Username: developer
Passowrd: Password1
```

![](../images/lab11/sct1.png)

1.2.  Once logged in, open AWS Schema Conversion Tool and initiate a new project.  

Click `File> New project> Data Warehouse(OLAP) > Ok`. Then select `OLAP` followed by `Oracle DW`.

![](../images/lab11/prep2.png)

1.3.  Now, you need to configure the connectivity for the Oracle source system.

Click `Connect to Oracle DW`, then Input below parameters and Click `Test`.  It should show connection successful:

```
Servername: [Oracle-Endpoint]
port: 1521
SID: ORACLEDB
Username: dbmaster
Password: Password1
DriverPath: C:\DMS Workshop\JDBC\ojdbc8.jar
```

![](../images/lab11/prep3.png)

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

1.6.  On the left hand side, you can see all objects in Oracle and on the right hand side, all Redshift objects. you may now convert the Oracle schema `DMS_SAMPLE`.  

Right click `DMS_SAMPLE` schema and then click `convert schema`.  

After that, click the default options `Yes` and `Continue` when prompted on the next screens about already existing objects and source database statistics.

![](../images/lab11/sct2.png)

1.7.  All Oracle objects should got converted to Redshift syntax by now. But there would be some objects showing in Red, which essentially means that SCT couldn’t fully migrate these objects. You can view an assessment summary for the migration  to analyze those objects.  

Click `View > Assessment Report View`

![](../images/lab11/sct3.png)

1.8.  AWS SCT produces an executive summary describing the overall migration effort. It describes which objects could and couldn’t be migrated successfully using AWS SCT.  
Click `Action Items` tab, which would show what action you need to take to migrate the unsuccessful objects.  

![](../images/lab11/sct4.png)

1.9.  You may now examine stored procedure migration by this process.  
From the left hand screen, select the first stored procedure `generateSeats`, which shows Oracle/Redshift code side by side and also highlights all code that could not be migrated. On the top action items screen, you can also see the automated recommendations on how to resolve these code migrations.  

You can see that PL/SQL tables were used in this code, which is a vendor specific code and hence SCT could not convert it properly. You would need to manually fix the code now based on the business requirements of this stored procedure.

![](../images/lab11/sct5.png)

1.10.  Now, to save the successfully migrated objects in Redshift, you can click `dms_sample` on the right hand side and click `apply to database`. This will create all these structures in Redshift side, including table definitions, views, stored procedures and other objects.

Right click `dms_sample` on the right hand side Redshift tab and click `apply to database`.
Click the default options `Yes` when prompted on the next screens about are you sure.

![](../images/lab11/sct6.png)

1.11.  Now, you may verify that in Redshift using `Redshift query editor` in AWS console or third party IDE like `SQL workbench`, which is an open source JDBC IDE.  
Open SQL workbench from the taskbar shortcut, which opens the new connection window. In that, click `Manage Drivers` in bottom left hand corner and select Redshift.  Update the driver path as `C:\DMS Workshop\JDBC\RedshiftJDBC42-1.2.43.1067.jar`

![](../images/lab11/prep6.png)

1.12.  Then move back to the connectivity screen.
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

1.13.  You may not examine the tables migrated to the `dms_sample` schema by running below query in SQL workbench:  

```
select t.table_schema, t.table_name,i.tbl_rows
from svv_tables t left join svv_table_info i
on t.table_schema = i.schema and t.table_name = i.table
where t.table_type = 'BASE TABLE' and t.table_schema='dms_sample'
order by 1,2
```

All these tables should got successfully created in this Redshift schema, but as expected, there would not be any records in them. Next, you will migrate data from Oracle to Redshift using a service called AWS Database Migration Service (DMS)

![](../images/lab11/sct7.png)

1.14.  Before that, let us connect to Oracle and verify the dataset in Oracle. Open Oracle SQL Developer from the taskbar shortcut and click new connection button on left hand top side. Input below parameters:

```
name: Oracle
username: dbmaster
password: Password1
hostname: [Oracle-Endpoint]
port: 1521
sid: ORACLEDB
```

Click `Test`, which should be successful
Click `Connect` and input above password if prompted again

![](../images/lab11/prep8.png)

1.15.  Let us check these tables in Oracle using Oracle SQL Developer. Open Oracle SQL Developer and execute this query:

```sql
select owner, table_name, nvl(num_rows,-1)
from all_tables where owner='DMS_SAMPLE'
order by 1,2
```

You can see decent amount of records for this ticketing dataset. To migrate these records, you’ll be using AWS Database Migration Service(DMS).

![](../images/lab11/sct8.png)

1.16.  Before going to AWS Database Migration Service, you need to provide access for DMS to use log miner, so that it can perform ongoing synch using Change Data Capture. You do not need to do this extra step if you only need one time full load of the dataset.  
You'll need to execute below script in Oracle SQL Developer to grant log miner access

```
@"C:\DMS Workshop\Scripts\ExecuteOracleSQL.sql"
```

![](../images/lab11/dms1.png)

### 3 Migrate the data
In this section, you'll take care of migrating data from the source Oracle database to Amazon Redshift datawarehouse using AWS Database Migration Service(DMS)

2.1. Open your web browser and login to AWS console. Navigate to `DMS` Service. For DMS, you first need to create a replication instance with suitable configuration, would take care of all replication tasks from source to target databases. If you navigate to `Replication instances`, you can see an instance, which was taken care by our initial cloud formation template for this demo.

![](../images/lab11/0replicationinstance.bmp)

2.2. Next, you need to configure the source and target end-points. Click `Endpoints` and create `Create endpoint`

![](../images/lab11/1endpoints.bmp)

2.3. First, you'll configure a source endpoint for Oracle.
If you tickmark `Select RDS DB instance`, DMS automatically finds out our Oracle RDS instance, which you can select. Alternatively, you could have also entered the details manually as you would do in the following sections. you only need to input the `password`, which you can copy-paste from our cloudFormation inputs

![](../images/lab11/2sourceendpoint.bmp)

2.4. You'll expand the option `Test endpoint connection` option and select our VPC and then click `Run test`.
Once the test is successful, click `Create endpoint`.

![](../images/lab11/2sourceendpointtest.bmp)

2.5. Next, you'll configure a target endpoint for Redshift. Please input below:

```
Endpoint type: Target endpoint
Endpoint identifier: [input any value e.g. redshift]
Target engine: redshift
Server name: [Redshift-Endpoint]
Port: 5439
User name: demo
Password: Password1
Database name: dev
```

![](../images/lab11/3targetendpoint.bmp)

You'll expand the option `Test endpoint connection` option and select our VPC and then click `Run test`. Once the test is successful, click `Create endpoint`.

![](../images/lab11/3targetendpointtest.bmp)

You can now see both our source and target endpoints.

![](../images/lab11/4endpoints.bmp)

2.6. Our last configuration step is to create a replication task, which will take care of the data migration. Natigate to `Database migration tasks` and  Click `Create Task`.

![](../images/lab11/5taskscreate.bmp)

You need to privide any meaningful name in the `Task identifier` field. Then you can go with all defaults for instance and endpoints.
For the option `Migration type`, click `Migrate existing data and replicate existing changes`.  

![](../images/lab11/6task1.bmp)

For the next tab of `Task settings`, you'll go with all default option except for `Target table preparation mode`, where would select `Do nothing` as you already created all tables using AWS Schema conversion tool earlier.  
Also, tick `Enable CloudWatch logs` to view DMS logs in case something going wrong.

![](../images/lab11/6task2.bmp)

For the next tab of `Table mappings`, you meed to click `Add new selection rule`.  Then, for input `Schema name`, type `dms_sample`.  
Keep the `Transformation rules` options as is for this demo, but it may be very useful if you need to do any transformations for schema, table or column names.

![](../images/lab11/6task3.bmp)

Now, you will run the migration, which will migrate all existing data from Oracle to Redshift and then also take care of Change data capture(CDC) to cater ongoing changes.  
Select the replication task >  
click `Action > restart/resume`

![](../images/lab11/sct9.png)

If you want to view the statistics of what data is getting transferred, you can go to this summary page allows him to view the statics of how many records are getting transferred via DMS.  
Click full load task and click `table statistics`

![](../images/lab11/sct12.png)

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

![](../images/lab11/sct13.png)


## 4 Keep the data in sync
Now, you would verify the Change Data Capture(CDC) functionality of DMS to make sure ongoing changes are automatically replicated from Oracle to Redshift.  

3.1. In our dataaset, you have a table `sport_type` with just 2 records in it. You will now insert some records in it in Oracle side to verify if that gets replicated to Redshift. Execute below command in SQL workbench to view all records in `sport_type` table  

```sql
select * from dms_sample.sport_type order by 1;
```

![](../images/lab11/sct14.png)

3.2. You may view data on this table in Oracle too, which should show same 2 records. Switch to Oracle SQL Developer and execute below command to view `sport_type` table

```sql
select * from dms_sample.sport_type order by 1;
```

![](../images/lab11/sct15.png)

3.3. You want to confirm that the CDC process is operational. For that you will insert some records in the `sport_type` table in Oracle.  Execute below command in Oracle SQL Developer to insert five records in `sport_type` table

```sql
INSERT ALL
INTO dms_sample.sport_type (name,description) VALUES ('hockey', 'A sport in which two teams play against each other by trying to more a puck into the opponents goal using a hockey stick')
INTO dms_sample.sport_type (name,description) VALUES ('basketball', 'A sport in which two teams of five players each that oppose one another shoot a basketball through the defenders hoop')
INTO dms_sample.sport_type (name,description) VALUES ('soccer','A sport played with a spherical ball between two teams of eleven players')
INTO dms_sample.sport_type (name,description) VALUES ('volleyball','two teams of six players are separated by a net and each team tries to score by grounding a ball on the others court')
INTO dms_sample.sport_type (name,description) VALUES ('cricket','A bat-and-ball game between two teams of eleven players on a field with a wicket at each end')
SELECT * FROM dual;

COMMIT;
```

![](../images/lab11/sct17.png)

3.4. Execute below command in Oracle SQL Developer to view these new records `sport_type` table

```sql
select * from dms_sample.sport_type order by 1;
```

![](../images/lab11/sct18.png)

3.5. Now, you'll go back to Redshift and see the records there.  Execute below command in SQL workbench to view `sport_type` table

```sql
select * from dms_sample.sport_type order by 1;
```

You would see the seven newly inserted records there too

![](../images/lab11/sct19.png)

3.6. You may view the logs of the CDC process, you get to see a nice tabular metrics in the DMS console.  
Navigate to DMS service in AWS console and Select the `Ongoing Replication` task and click `table statistics`

![](../images/lab11/sct20.png)

## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources.
