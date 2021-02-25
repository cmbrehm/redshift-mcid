+++
title = "Modernize w/ Spectrum"
date = 2020-01-22T16:27:02-08:00
weight = 3
pre = "<b>3. </b>"
+++

In this lab, we show you how to combine "hot" data stored in Amazon Redshift with "warm" data in your Amazon S3 data lake - without loading or moving objects. We will also demonstrate how you can leverage views which union data in these different data stores.  Finally, we demonstrate strategies for aging off old data into S3 and maintaining only the most recent data in Amazon Redshift direct attached storage.

## Contents
* [Inspect The Data](#inspect-the-data)
* [COPY Data from S3](#what-happened-in-2016)
* [CREATE TABLE directly against S3 Data Lake](#go-back-in-time)
* [Create a Single Version of Truth](#create-a-single-version-of-truth)
* [Plan for the Future](#plan-for-the-future)

## Inspect The Data
The data we'll use for this lab is stored in a public S3 bucket and represents rideshare data from a few different companies.  Note the partitioning scheme is Year, Month, Type (where Type is a taxi company).  Inspect the data and understand the partitioning.  Note the data has already been translated to parquet format so will not be easy to read.

**Note the partitioning scheme is Year, Month, Type (where Type is a taxi company). Here's a quick Screenshot:**

```
https://s3.console.aws.amazon.com/s3/buckets/us-west-2.serverless-analytics/canonical/NY-Pub/
```

![](images/canonical_year.png)

```
https://s3.console.aws.amazon.com/s3/buckets/us-west-2.serverless-analytics/canonical/NY-Pub/year%253D2016/
```

![](images/canonical_month.png)

```
https://s3.console.aws.amazon.com/s3/buckets/us-west-2.serverless-analytics/canonical/NY-Pub/year%253D2016/month%253D1/
```

![](images/canonical_type.png)


## COPY Data from S3
In the first part of this lab, we will perform the following activities:
* Load the Green company data for January 2016 into Redshift direct-attached storage (DAS) with COPY.
* Collect supporting/refuting evidence for the impact of the January, 2016 blizzard on taxi usage.
* The CSV data is by month on Amazon S3. Here's a quick screenshot from the S3 console:

````
https://s3.console.aws.amazon.com/s3/buckets/us-west-2.serverless-analytics/NYC-Pub/green/?region=us-west-2&tab=overview&prefixSearch=green_tripdata_2016
````

![](images/green_2016.png)

* Here's Sample data from one file which can be previewed directly in the S3 console:

````
https://s3.console.aws.amazon.com/s3/object/us-west-2.serverless-analytics/NYC-Pub/green/green_tripdata_2013-08.csv?region=us-west-2&tab=select
````

![](images/green_preview.png)


### Build your DDL
Create a schema `workshop_das` and table `workshop_das.green_201601_csv` for tables that will reside on the Redshift compute nodes, AKA the Redshift direct-attached storage (DAS) tables.

{{% notice note %}}
We are copying only one month's worth of data from one company into the Direct-Attached Storage.  In the subsequent steps, we'll use Redshift Spectrum to query the entire dataset.

{{% /notice %}}
```python
CREATE SCHEMA workshop_das;

CREATE TABLE workshop_das.green_201601_csv
(
  vendorid                VARCHAR(4),
  pickup_datetime         TIMESTAMP,
  dropoff_datetime        TIMESTAMP,
  store_and_fwd_flag      VARCHAR(1),
  ratecode                INT,
  pickup_longitude        FLOAT4,
  pickup_latitude         FLOAT4,
  dropoff_longitude       FLOAT4,
  dropoff_latitude        FLOAT4,
  passenger_count         INT,
  trip_distance           FLOAT4,
  fare_amount             FLOAT4,
  extra                   FLOAT4,
  mta_tax                 FLOAT4,
  tip_amount              FLOAT4,
  tolls_amount            FLOAT4,
  ehail_fee               FLOAT4,
  improvement_surcharge   FLOAT4,
  total_amount            FLOAT4,
  payment_type            VARCHAR(4),
  trip_type               VARCHAR(4)
)
DISTSTYLE EVEN
SORTKEY (passenger_count,pickup_datetime);
```
### Build your Copy Command
* Build your copy command to copy the data from Amazon S3. This dataset has the number of taxi rides in the month of January 2016 for the Green company.

{{% notice info %}}
Recall the **COPY** command will load the data from S3 into the direct-attached storage on the Redshift side.  
{{% /notice %}}

```python
COPY workshop_das.green_201601_csv
FROM 's3://us-west-2.serverless-analytics/NYC-Pub/green/green_tripdata_2016-01.csv'
IAM_ROLE 'arn:aws:iam::[Your-AWS-Account_Id]:role/RedshiftImmersionRole'
DATEFORMAT 'auto'
IGNOREHEADER 1
DELIMITER ','
IGNOREBLANKLINES
REGION 'us-west-2'
;
```
* Determine how many rows you just loaded.

```
select count(1) from workshop_das.green_201601_csv;
--1445285
```
**HINT: `[Your-AWS-Account_Id]` in the above command should be replaced with the values determined at the beginning of the lab.**

### Pinpoint the Blizzard
In this month, there is a date which had the lowest number of taxi rides due to a blizzard. Can you find that date?

```python
SELECT TO_CHAR(pickup_datetime, 'YYYY-MM-DD'),
COUNT(*)
FROM workshop_das.green_201601_csv
GROUP BY 1
ORDER BY 2;
```

Note the query time spent on this query.  We will use it as a point of comparison against the data lake queries.

## Create Table Directly Against S3 Data Lake
In the next part of this lab, we will perform the following activities:
* Onboard "warm" historical data residing on S3 by building an external DB for Redshift Spectrum.
* Introspect the historical data, perhaps rolling-up the data in novel ways to see trends over time, or other dimensions.


### Use an AWS Glue Crawler to index the data lake
[AWS Glue](https://aws.amazon.com/glue) is a serverless data integration service that makes it easy to discover, prepare, and combine data for analytics, machine learning, and application development. AWS Glue crawls your data sources, identifies data formats, and suggests schemas to store your data. It automatically generates the code to run your data transformations and loading processes.

Today, we will use the AWS Glue Crawler to create your external table `adb305.ny_pub` stored in parquet format under location `s3://us-west-2.serverless-analytics/canonical/NY-Pub/`

1. Navigate to the [**Glue Crawler Page**](https://console.aws.amazon.com/glue/home?#catalog:tab=crawlers)

  ![](images/crawler_0.png)

1. Click on *Add Crawler*, and enter the crawler name *NYTaxiCrawler* and click *Next*.

	![](images/crawler_1.png)

1. Select *Data stores* as the source type and click *Next*.

	![](images/crawler_2.png)

1. Choose *S3* as the data store and the include path of *s3://us-west-2.serverless-analytics/canonical/NY-Pub*

	![](images/crawler_3.png)

1. *Choose an existing IAM role* and select *AWSGlueServiceRole-ImmersionDay*.  

	![](images/crawler_4.png)

1. Select *Run on demand* for the frequency.

  ![](images/crawler_5.png)

1. Click on *Add database* and enter the Database of *spectrumdb*

	![](images/crawler_6.png)

1. Select all remaining defaults. Once the Crawler has been created, click on *Run Crawler*.

	![](images/crawler_7.png)

1. Once the Crawler has completed its run (should only take a minute or two), you will see a new table in the Glue Catalog. https://console.aws.amazon.com/glue/home?#catalog:tab=tables

	![](images/crawler_8.png)

1. Click on the *ny_pub* table, notice the recordCount of 2.87 billion.

	![](images/crawler_9.png)


### Create external schema (and DB) for Redshift Spectrum
* Now that the table has been cataloged, switch back to your Redshift query editor and create an external schema **adb305** pointing to your Glue Catalog Database **spectrumdb**

{{% notice info %}}
CREATE EXTERNAL SCHEMA supports federated queries from Redshift.  You can use this external schema to connect to Amazon RDS for PostgreSQL or Amazon Aurora with PostgreSQL compatibility databases. You can also create an external schema that references a database in an external data catalog such as AWS Glue, Athena, or a database in an Apache Hive metastore, such as Amazon EMR.
{{% /notice %}}

```python
CREATE external SCHEMA adb305
FROM data catalog DATABASE 'spectrumdb'
IAM_ROLE 'arn:aws:iam::[Your-AWS-Account_Id]:role/RedshiftImmersionRole'
CREATE external DATABASE if not exists;
```
* Let's query rollups for January 2016 again, this time using the external table.

```python
SELECT TO_CHAR(pickup_datetime, 'YYYY-MM-DD'),
COUNT(*)
FROM adb305.ny_pub
WHERE YEAR = 2016 and Month = 01
GROUP BY 1
ORDER BY 1;
```
How long did this query take?  Check the **Execution timeline** for details
![](images/lab4-spectrum-execution.png)

{{% notice info %}}
With Redshift Spectrum, you are billed per terabyte of data scanned, rounded up to the next megabyte, with a 10 megabyte minimum per query.  Prices vary by region but start at $5.00 USD per terabyte in the US regions.  For example, if you scan 10 gigabytes of data, you will be charged $0.05. If you scan 1 terabyte of data, you will be charged $5.00.  
{{% /notice %}}
{{% notice note %}}
You can improve query performance and reduce costs by storing data in a compressed, partitioned, columnar data format. If you compress data using one of Redshift Spectrum’s supported formats, your costs will go down because less data is scanned. Similarly, if you store data in a columnar format, such as Parquet or ORC, your charges will also go down because Redshift Spectrum only scans columns needed by the query.
{{% /notice %}}

## Create a Single Version of Truth
In the next part of this lab, we will demonstrate how to create a view which has data that is consolidated from S3 via Spectrum and the Redshift direct-attached storage.  An architecture like this would allow to keep "hot" data locally and let older data age off to S3.  In the next section we will discuss strategies to accomplish the aging.

### Create a union view between Amazon Redshift and Redshift Spectrum
 Use **Create Table As (CTAS)** to create a table with data from January 2016 for the Green company. Compare the runtime to populate this with the COPY runtime earlier.

```python
CREATE TABLE workshop_das.taxi_201601 AS
SELECT * FROM adb305.ny_pub
WHERE year = 2016 AND month = 1;
```

Note: What about column compression/encoding? Remember that on a [CREATE TABLE AS](https://docs.aws.amazon.com/redshift/latest/dg/r_CTAS_usage_notes.html
), Amazon Redshift automatically assigns compression encoding as follows:

* Columns that are defined as sort keys are assigned RAW compression.
* Columns that are defined as BOOLEAN, REAL, or DOUBLE PRECISION, or GEOMETRY data types are assigned RAW compression.
* Columns that are defined as SMALLINT, INTEGER, BIGINT, DECIMAL, DATE, TIMESTAMP, or TIMESTAMPTZ are assigned AZ64 compression.
* Columns that are defined as CHAR or VARCHAR are assigned LZO compression.

{{% notice info %}}


{{% /notice %}}

```
ANALYZE COMPRESSION workshop_das.taxi_201601
```

### Remove overlaps in the Spectrum table
Now that we've loaded all January, 2016 data, we can remove the partitions from the Spectrum table so there is no overlap between the direct-attached storage (DAS) table and the Spectrum table.

```python
ALTER TABLE adb305.ny_pub DROP PARTITION(year=2016, month=1, type='fhv');
ALTER TABLE adb305.ny_pub DROP PARTITION(year=2016, month=1, type='green');
ALTER TABLE adb305.ny_pub DROP PARTITION(year=2016, month=1, type='yellow');
```
{{% notice info %}}
This does not delete the data on S3.   You can query system table `svv_external_partitions` to see the active partitions for external tables.
{{% /notice %}}

### Create a view with no Schema Binding
Create a view **adb305_view_NYTaxiRides** from **workshop_das.taxi_201601** that allows seamless querying of the DAS and Spectrum data.

```python
CREATE VIEW adb305_view_NYTaxiRides AS
  SELECT * FROM workshop_das.taxi_201601
  UNION ALL
  SELECT * FROM adb305.ny_pub
WITH NO SCHEMA BINDING;

```
{{% notice info %}}
The clause `WITH NO SCHEMA BINDING` is used to create a [late-binding view](https://docs.aws.amazon.com/redshift/latest/dg/r_CREATE_VIEW.html#r_CREATE_VIEW-parameters)
A late-binding view doesn't check the underlying database objects, such as tables and other views, until the view is queried. As a result, you can alter or drop the underlying objects without dropping and recreating the view.
{{% /notice %}}


Query against hot data in DAS.
````
SELECT year, month, type, COUNT(*)
FROM adb305_view_NYTaxiRides
WHERE year = 2016 AND month = 1 AND passenger_count = 4
GROUP BY 1,2,3 ORDER BY 1,2,3;
````

Now let's add data from the data lake.
```
SELECT year, month, type, COUNT(*)
FROM adb305_view_NYTaxiRides
WHERE year = 2016 AND month IN (1,2) AND passenger_count = 4
GROUP BY 1,2,3 ORDER BY 1,2,3;

````

{{% notice note %}}
Feel free to experiment and examine the EXPLAIN plans for the queries using the **Execution** button in the Query Editor

{{% /notice %}}

## Aging Data
Data can be aged from hot to warm storage using the SQL command [UNLOAD](https://docs.aws.amazon.com/redshift/latest/dg/r_UNLOAD.html)

For example:
```
UNLOAD ('select-statement')
TO 's3://my-s3-bucket/data'
FORMAT AS PARQUET
PARTITION BY (year, month, type)
ESCAPE
```
