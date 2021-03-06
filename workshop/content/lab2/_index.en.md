+++
title = "Data Loading"
date = 2020-01-22T16:27:02-08:00
weight = 2
pre = "<b>2. </b>"
+++

In this lab, you will use a set of eight tables based on the TPC Benchmark data model.  You create these tables within your Redshift cluster and load these tables with sample data stored in S3.  

## Contents
- [Contents](#contents)
- [Create Tables](#create-tables)
- [Loading Data](#loading-data)
- [Table Maintenance - ANALYZE](#table-maintenance---analyze)
- [Table Maintenance - VACUUM](#table-maintenance---vacuum)
- [Troubleshooting Loads](#troubleshooting-loads)

## Create Tables

{{% notice warning %}}
The query editor only runs short queries that can complete within 10 minutes. Query result sets are paginated with 100 rows per page.
{{% /notice %}}

Copy the following create table statements to create tables in the database mimicking the TPC Benchmark data model.

![](images/Model.png)

```
DROP TABLE IF EXISTS partsupp;
DROP TABLE IF EXISTS lineitem;
DROP TABLE IF EXISTS supplier;
DROP TABLE IF EXISTS part;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customer;
DROP TABLE IF EXISTS nation;
DROP TABLE IF EXISTS region;

CREATE TABLE region (
  R_REGIONKEY bigint NOT NULL,
  R_NAME varchar(25),
  R_COMMENT varchar(152))
diststyle all;

CREATE TABLE nation (
  N_NATIONKEY bigint NOT NULL,
  N_NAME varchar(25),
  N_REGIONKEY bigint,
  N_COMMENT varchar(152))
diststyle all;

create table customer (
  C_CUSTKEY bigint NOT NULL,
  C_NAME varchar(25),
  C_ADDRESS varchar(40),
  C_NATIONKEY bigint,
  C_PHONE varchar(15),
  C_ACCTBAL decimal(18,4),
  C_MKTSEGMENT varchar(10),
  C_COMMENT varchar(117))
diststyle all;

create table orders (
  O_ORDERKEY bigint NOT NULL,
  O_CUSTKEY bigint,
  O_ORDERSTATUS varchar(1),
  O_TOTALPRICE decimal(18,4),
  O_ORDERDATE Date,
  O_ORDERPRIORITY varchar(15),
  O_CLERK varchar(15),
  O_SHIPPRIORITY Integer,
  O_COMMENT varchar(79))
distkey (O_ORDERKEY)
sortkey (O_ORDERDATE);

create table part (
  P_PARTKEY bigint NOT NULL,
  P_NAME varchar(55),
  P_MFGR  varchar(25),
  P_BRAND varchar(10),
  P_TYPE varchar(25),
  P_SIZE integer,
  P_CONTAINER varchar(10),
  P_RETAILPRICE decimal(18,4),
  P_COMMENT varchar(23))
diststyle all;

create table supplier (
  S_SUPPKEY bigint NOT NULL,
  S_NAME varchar(25),
  S_ADDRESS varchar(40),
  S_NATIONKEY bigint,
  S_PHONE varchar(15),
  S_ACCTBAL decimal(18,4),
  S_COMMENT varchar(101))
diststyle all;                                                              

create table lineitem (
  L_ORDERKEY bigint NOT NULL,
  L_PARTKEY bigint,
  L_SUPPKEY bigint,
  L_LINENUMBER integer NOT NULL,
  L_QUANTITY decimal(18,4),
  L_EXTENDEDPRICE decimal(18,4),
  L_DISCOUNT decimal(18,4),
  L_TAX decimal(18,4),
  L_RETURNFLAG varchar(1),
  L_LINESTATUS varchar(1),
  L_SHIPDATE date,
  L_COMMITDATE date,
  L_RECEIPTDATE date,
  L_SHIPINSTRUCT varchar(25),
  L_SHIPMODE varchar(10),
  L_COMMENT varchar(44))
distkey (L_ORDERKEY)
sortkey (L_RECEIPTDATE);

create table partsupp (
  PS_PARTKEY bigint NOT NULL,
  PS_SUPPKEY bigint NOT NULL,
  PS_AVAILQTY integer,
  PS_SUPPLYCOST decimal(18,4),
  PS_COMMENT varchar(199))
diststyle even;
```

* Select the **public** schema from the dropdown under Resources->Select Schema
* Paste the above into the query box and click **Run**

The tables should appear as Resources.

## Loading Data
A COPY command loads large amounts of data much more efficiently than using INSERT statements, and stores the data more effectively as well.  Use a single COPY command to load data for one table from multiple files.  Amazon Redshift then automatically loads the data in parallel.  For your convenience, the sample data you will use is available in a public Amazon S3 bucket. To ensure that  Redshift performs a compression analysis, set the COMPUPDATE parameter to ON in your COPY commands. To copy this data you will need to replace the [Your-AWS_Account_Id] value in the script below.

```
COPY region FROM 's3://redshift-immersionday-labs/data/region/region.tbl.lzo'
iam_role 'arn:aws:iam::[Your-AWS_Account_Id]:role/RedshiftImmersionRole'
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

COPY nation FROM 's3://redshift-immersionday-labs/data/nation/nation.tbl.'
iam_role 'arn:aws:iam::[Your-AWS_Account_Id]:role/RedshiftImmersionRole'
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy customer from 's3://redshift-immersionday-labs/data/customer/customer.tbl.'
iam_role 'arn:aws:iam::[Your-AWS_Account_Id]:role/RedshiftImmersionRole'
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy part from 's3://redshift-immersionday-labs/data/part/part.tbl.'
iam_role 'arn:aws:iam::[Your-AWS_Account_Id]:role/RedshiftImmersionRole'
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

copy supplier from 's3://redshift-immersionday-labs/data/supplier/supplier.json' manifest
iam_role 'arn:aws:iam::[Your-AWS_Account_Id]:role/RedshiftImmersionRole'
region 'us-west-2' lzop delimiter '|' COMPUPDATE PRESET;

```
The estimated time to load the data is as follows:

* REGION (5 rows) - 20s
* NATION (25 rows) - 20s
*	CUSTOMER (15M rows) – 3m
* PART - (20M rows) - 4m
*	SUPPLIER - (1M rows) - 1m

{{% notice note %}}
This load should finish in about 15 minutes.  You can monitor the progress in the queries tab on the left menu bar
{{% /notice %}}
Note: A few key takeaways from the above COPY statements.
1. COMPUPDATE PRESET ON will assign compression using the Amazon Redshift best practices related to the data type of the column but without analyzing the data in the table.
2. COPY for the REGION table points to a specific file (region.tbl.lzo) while COPY for other tables point to a prefix to multiple files (lineitem.tbl.)
3. COPY for the SUPPLIER table points a manifest file (supplier.json)



## Table Maintenance - ANALYZE
You should at regular intervals, update the statistical metadata that the query planner uses to build and choose optimal plans.  You can analyze a table explicitly by running the ANALYZE command.  When you load data with the COPY command, you can perform an analysis on incrementally loaded data automatically by setting the STATUPDATE option to ON.  When loading into an empty table, the COPY command by default performs the ANALYZE operation.

Run the ANALYZE command against the CUSTOMER table.
```
analyze customer;
```
To find out when ANALYZE commands were run, you can query system tables and view such as STL_QUERY and STV_STATEMENTTEXT and include a restriction on padb_fetch_sample.  For example, to find out when the CUSTOMER table was last analyzed, run this query:
```
select query, rtrim(querytxt), starttime
from stl_query
where
querytxt like 'padb_fetch_sample%' and
querytxt like '%customer%'
order by query desc;
```
Note: Time timestamp of the ANALYZE will correlate to when the COPY command was executed and there will be no entry for the second analyze statement.  Redshift knows that it does not need to run the ANALYZE operation as no data has changed in the table.

## Table Maintenance - VACUUM
You should run the VACUUM command following a significant number of deletes or updates.  To perform an update, Amazon Redshift deletes the original row and appends the updated row, so every update is effectively a delete and an insert.  While, Amazon Redshift recently enabled a feature which automatically and periodically reclaims space, it is a good idea to be aware of how to manually perform this operation.  You can run a full vacuum, a delete only vacuum, or sort only vacuum.

Capture the initial space usage of the ORDERS table.
```
select sum(blocks) as total_space from
(select col, count(*) as blocks
from stv_blocklist, stv_tbl_perm
where stv_blocklist.tbl = stv_tbl_perm.id and
stv_blocklist.slice = stv_tbl_perm.slice and
stv_tbl_perm.name = 'part'
group by col
);
```

{{% notice note %}}
STV_BLOCKLIST contains the number of 1 MB disk blocks that are used by each slice, table, or column in a database.  Use aggregate queries with STV_BLOCKLIST, as the following examples show, to determine the number of 1 MB disk blocks allocated per database, table, slice, or column.
{{% /notice %}}

Delete rows from the PART table.
```
delete from part where p_mfgr <= 'Manufacturer#4';
```

Confirm that Redshift did not automatically reclaim space by running the following query again and noting the values have not changed.
```
select sum(blocks) as total_space from
(select col, count(*) as blocks
from stv_blocklist, stv_tbl_perm
where stv_blocklist.tbl = stv_tbl_perm.id and
stv_blocklist.slice = stv_tbl_perm.slice and
stv_tbl_perm.name = 'part'
group by col
);
```

Run the VACUUM command
```
vacuum delete only part;
```

Confirm that the VACUUM command reclaimed space by running the following query again and noting the values have changed.
```
select sum(blocks) as total_space from
(select col, count(*) as blocks
from stv_blocklist, stv_tbl_perm
where stv_blocklist.tbl = stv_tbl_perm.id and
stv_blocklist.slice = stv_tbl_perm.slice and
stv_tbl_perm.name = 'part'
group by col
);
```


Note:  If you have a table with very few columns but a very large number of rows, the three hidden metadata identify columns (INSERT_XID, DELETE_XID, ROW_ID) will consume a disproportionate amount of the disk space for the table.  In order to optimize compression of the hidden columns, load the table in a single copy transaction where possible.  If you load the table with multiple separate COPY commands, the INSERT_XID column will not compress well and multiple vacuum operations will not improve compression of INSERT_XID.

## Troubleshooting Loads
There are two Amazon Redshift system tables that can be helpful in troubleshooting data load issues:
* STL_LOAD_ERRORS
* STL_FILE_SCAN

In addition, you can validate your data without actually loading the table.  Use the NOLOAD option with the COPY command to make sure that your data file will load without any errors before running the actual data load.  Running COPY with the NOLOAD option is much faster than loading the data since it only parses the files.

Let’s try to load the CUSTOMER table with a different data file with mismatched columns.  To copy this data you will need to replace the [Your-AWS_Account_Id] and value in the script below.   
```
COPY customer FROM 's3://redshift-immersionday-labs/data/nation/nation.tbl.'
iam_role 'arn:aws:iam::[Your-AWS_Account_Id]:role/RedshiftImmersionRole'
region 'us-west-2' lzop delimiter '|' noload;
```

You will get the following error.
```
ERROR: Load into table 'customer' failed.  Check 'stl_load_errors' system table for details. [SQL State=XX000]
```

Query the STL_LOAD_ERROR system table for details.
```
select * from stl_load_errors;
```

You can also create a view that returns details about load errors.  The following example joins the STL_LOAD_ERRORS table to the STV_TBL_PERM table to match table IDs with actual table names.
```
create view loadview as
(select distinct tbl, trim(name) as table_name, query, starttime,
trim(filename) as input, line_number, colname, err_code,
trim(err_reason) as reason
from stl_load_errors sl, stv_tbl_perm sp
where sl.tbl = sp.id);

-- Query the LOADVIEW view to isolate the problem.
select * from loadview where table_name='customer';
```
