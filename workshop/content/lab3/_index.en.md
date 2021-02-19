+++
title = "Table Design and Query Tuning"
date = 2020-01-22T16:27:02-08:00
weight = 3
pre = "<b>3. </b>"
+++

In this lab you will analyze the affects of Compression, De-Normalization, Distribution and Sorting on Redshift query performance.

## Contents
* [Before You Begin](#before-you-begin)
* [Result Set Caching and Execution Plan Reuse](#result-set-caching-and-execution-plan-reuse)
* [Selective Filtering](#selective-filtering)
* [Compression](#compression)
* [Join Strategies](#join-strategies)
* [Before You Leave](#before-you-leave)
 
## Before You Begin
This lab assumes you have launched a Redshift cluster, loaded it with TPC Benchmark data and can gather the following information.  If you have not launched a cluster, see [LAB 1 - Creating Redshift Clusters](../lab1.html).  If you have not yet loaded it, see [LAB 2 - Data Loading](../lab2.html).
* [Your-Redshift_Hostname]
* [Your-Redshift_Port]
* [Your-Redshift_Username]
* [Your-Redshift_Password]

It also assumes you have access to a configured client tool. For more details on configuring SQL Workbench/J as your client tool, see [Lab 1 - Creating Redshift Clusters : Configure Client Tool](../lab1.html#configure-client-tool). As an alternative you can use the Redshift provided online Query Editor which does not require an installation.
```
https://console.aws.amazon.com/redshift/home?#query:
```

## Result Set Caching and Execution Plan Reuse

{{% notice warning %}}
The query editor only runs short queries that can complete within 10 minutes. Query result sets are paginated with 100 rows per page. 
{{% /notice %}}

Redshift enables a result set cache to speed up retrieval of data when it knows that the data in the underlying table has not changed.  It can also re-use compiled query plans when only the predicate of the query has changed.

1. Execute the following query and note the query execution time.  Since this is the first execution of this query Redshift will need to compile the query as well as cache the result set.
```sql
SELECT c_mktsegment, o_orderpriority, sum(o_totalprice)
FROM customer c
JOIN orders o on c_custkey = o_custkey
GROUP BY c_mktsegment, o_orderpriority;
```

2. Execute the same query a second time and note the query execution time.  In the second execution redshift will leverage the result set cache and return immediately.
```sql
SELECT c_mktsegment, o_orderpriority, sum(o_totalprice)
FROM customer c
JOIN orders o on c_custkey = o_custkey
GROUP BY c_mktsegment, o_orderpriority;
```

3. Update data in the table and run the query again. When data in an underlying table has changed Redshift will be aware of the change and invalidate the result set cache associated to the query.  Note the execution time is not as fast as Step 2, but faster than Step 1 because while it couldn’t re-use the cache it could re-use the compiled plan.
```sql
UPDATE customer
SET c_mktsegment = c_mktsegment
WHERE c_mktsegment = 'MACHINERY';

VACUUM DELETE ONLY customer;

SELECT c_mktsegment, o_orderpriority, sum(o_totalprice)
FROM customer c
JOIN orders o on c_custkey = o_custkey
GROUP BY c_mktsegment, o_orderpriority;
```

4. Execute a new query with a predicate and note the query execution time.  Since this is the first execution of this query Redshift will need to compile the query as well as cache the result set.
```sql
SELECT c_mktsegment, count(1)
FROM Customer c
WHERE c_mktsegment = 'MACHINERY'
GROUP BY c_mktsegment;
```

5. Execute the query with a slightly different predicate and note that the execution time is faster than the prior execution even though a very similar amount of data was scanned and aggregated.  This behavior is due to the re-use of the compile cache because only the predicate has changed.  This type of pattern is typical for BI reporting where the SQL pattern remains consistent with different users retrieving data associated to different predicates.
```sql
SELECT c_mktsegment, count(1)
FROM customer c
WHERE c_mktsegment = 'BUILDING'
GROUP BY c_mktsegment;
```

## Selective Filtering
Redshift takes advantage of zone maps which allows the optimizer to skip reading blocks of data when it knows that the filter criteria will not be matched.   In the case of the *orders* table, because we have defined a sort key on the o_order_date, queries leveraging that field as a predicate will return much faster.

6. Execute the following query twice noting the execution time of the second execution.  The first execution is to ensure the plan is compiled.  The second is more representative of the end-user experience.

> Note: The set enable_result_cache_for_session to false is used to ensure the result set cache is not used.

```sql
set enable_result_cache_for_session to false;

SELECT count(1), sum(o_totalprice)
FROM orders
WHERE o_orderdate between '1992-07-05' and '1992-07-07';

SELECT count(1), sum(o_totalprice)
FROM orders
WHERE o_orderdate between '1992-07-05' and '1992-07-07';
```


7. Execute the following query twice noting the execution time of the second execution. Again, the first query is to ensure the plan is compiled. Note: this query has a different filter condition compared to the query used in previous step but scans relatively the same number of rows of data.

```sql
set enable_result_cache_for_session to false;

SELECT count(1), sum(o_totalprice)
FROM orders
where o_orderkey < 600001;

SELECT count(1), sum(o_totalprice)
FROM orders
where o_orderkey < 600001;
```

8. Execute the following to compare execution times for each query. You will notice the second query takes significantly longer than the query in the previous step even though the number of rows which were aggregated is similar. This is due to the first query’s ability to take advantage of the Sort Key (o_orderdate) defined on the table.

```SQL
SELECT query, TRIM(querytxt) as SQL, starttime, endtime, DATEDIFF(microsecs, starttime, endtime) AS duration
FROM STL_QUERY
WHERE TRIM(querytxt) like '%orders%'
ORDER BY starttime DESC
LIMIT 4;
```

## Compression
Redshift operates on high amounts of data. In order to optimize Redshift workloads, one of the key principles is to lower the amount of data stored. Instead of working on entire rows of data, containing values of different types and function, Redshift operates in a columnar fashion.  This gives the opportunity to implement algorithms that can operate on single columns of data which can be compressed independently.

9. If you refer to [LAB 2 - Data Loading](../lab2.html), the *lineitem* table was defined without any specified compression encodings.  Instead, when the data was loaded, the encodings were automatically applied using the defaults because the COMPUPDATE PRESET clause was used in the COPY statement.  Execute the following query to determine the compression used for the *lineitem* table.
```sql
SELECT tablename, "column", encoding
FROM pg_table_def
WHERE schemaname = 'public' AND tablename = 'lineitem'
```

10. Create a copy of *lineitem* table setting the ENCODING of each column to RAW and load that table with the lineitem data.
```sql
DROP TABLE IF EXISTS lineitem_v1;
CREATE TABLE lineitem_v1 (
  L_ORDERKEY bigint NOT NULL ENCODE RAW       ,
  L_PARTKEY bigint ENCODE RAW                 ,
  L_SUPPKEY bigint ENCODE RAW                 ,
  L_LINENUMBER integer NOT NULL ENCODE RAW    ,
  L_QUANTITY decimal(18,4) ENCODE RAW         ,
  L_EXTENDEDPRICE decimal(18,4) ENCODE RAW    ,
  L_DISCOUNT decimal(18,4) ENCODE RAW         ,
  L_TAX decimal(18,4) ENCODE RAW              ,
  L_RETURNFLAG varchar(1) ENCODE RAW          ,
  L_LINESTATUS varchar(1) ENCODE RAW          ,
  L_SHIPDATE date ENCODE RAW                  ,
  L_COMMITDATE date ENCODE RAW                ,
  L_RECEIPTDATE date ENCODE RAW               ,
  L_SHIPINSTRUCT varchar(25) ENCODE RAW       ,
  L_SHIPMODE varchar(10) ENCODE RAW           ,
  L_COMMENT varchar(44) ENCODE RAW
)
distkey (L_ORDERKEY)
sortkey (L_RECEIPTDATE);

INSERT INTO lineitem_v1
SELECT * FROM lineitem;

ANALYZE lineitem_v1;
```

11. Redshift provides the ANALYZE COMPRESSION command.  This command will determine the encoding for each column which will yield the most compression.  Execute the ANALYZE COMPRESSION command on the table which was just loaded.  Note the results and compare them to the results from step 12.
```sql
ANALYZE COMPRESSION lineitem_v1;
```
> Note: While most columns have the same encodings, some columns will get better compression if the encoding is changed.

12. Analyze the storage space for these tables, with and without compression. The table stores by column the amount of storage used in MB. You should see about a 70% savings on the storage of the second table compared to first. This query gives you the storage requirements per column for each table, then the total storage for the table (repeated identically on each line).
```sql
SELECT
  CAST(d.attname AS CHAR(50)),
  SUM(CASE WHEN CAST(d.relname AS CHAR(50)) = 'lineitem'
THEN b.size_in_mb ELSE 0 END) AS size_in_mb,
  SUM(CASE WHEN CAST(d.relname AS CHAR(50)) = 'lineitem_v1'
THEN b.size_in_mb ELSE 0 END) AS size_in_mb_v1,
  SUM(SUM(CASE WHEN CAST(d.relname AS CHAR(50)) = 'lineitem'
THEN b.size_in_mb ELSE 0 END)) OVER () AS total_mb,
  SUM(SUM(CASE WHEN CAST(d.relname AS CHAR(50)) = 'lineitem_v1'
THEN b.size_in_mb ELSE 0 END)) OVER () AS total_mb_v1
FROM (
  SELECT relname, attname, attnum - 1 as colid
  FROM pg_class t
  INNER JOIN pg_attribute a ON a.attrelid = t.oid
  WHERE t.relname LIKE 'lineitem%') d
INNER JOIN (
  SELECT name, col, MAX(blocknum) AS size_in_mb
  FROM stv_blocklist b
  INNER JOIN stv_tbl_perm p ON b.tbl=p.id
  GROUP BY name, col) b
ON d.relname = b.name AND d.colid = b.col
GROUP BY d.attname
ORDER BY d.attname;
```

## Join Strategies
Because or the distributed architecture of Redshift, in order to process data which is joined together, data may have to be broadcast from one node to another.  It’s important to analyze the explain plan on a query to identify which join strategies is being used and how to improve it.

13. Execute an EXPLAIN on the following query.  When these tables were loaded in [LAB 2 - Data Loading](../lab2.html), they were set with a DISTSTYLE of ALL for the *customer* table.  An ALL distribution is a good practice for relatively small dimension tables.  This results in a join strategy of “DS_DIST_ALL_NONE” and a relatively low cost.  The DISTKEY for the *orders* and *lineitem* tables is *orderkey*.  Since these two tables are distributed on the same key the data is co-located and as join strategy of "DS_DIST_NONE" can be leveraged.

```sql
EXPLAIN
SELECT c_mktsegment,COUNT(o_orderkey) AS orders_count, sum(l_quantity) as quantity, sum (l_extendedprice) as extendedprice
FROM lineitem
JOIN orders on l_orderkey = o_orderkey
JOIN customer c on o_custkey = c_custkey
WHERE l_commitdate between '1992-01-01T00:00:00Z' and '1992-12-31T00:00:00Z'
GROUP BY c_mktsegment;
```

{{< html.inline >}}
<details><summary>&gt;Hint</summary>
{{< /html.inline >}}
```python
XN HashAggregate  (cost=77743573.02..77743573.06 rows=5 width=43)
  ->  XN Hash Join DS_DIST_ALL_NONE  (cost=1137500.00..77351933.42 rows=39163960 width=43)
        Hash Cond: ("outer".o_custkey = "inner".c_custkey)
        ->  XN Hash Join DS_DIST_NONE  (cost=950000.00..70800289.92 rows=39163960 width=39)
              Hash Cond: ("outer".l_orderkey = "inner".o_orderkey)
              ->  XN Seq Scan on lineitem  (cost=0.00..8985568.32 rows=79308960 width=31)
                    Filter: ((l_commitdate <= '1992-12-31'::date) AND (l_commitdate >= '1992-01-01'::date))
              ->  XN Hash  (cost=760000.00..760000.00 rows=76000000 width=16)
                    ->  XN Seq Scan on orders  (cost=0.00..760000.00 rows=76000000 width=16)
        ->  XN Hash  (cost=150000.00..150000.00 rows=15000000 width=20)
              ->  XN Seq Scan on customer c  (cost=0.00..150000.00 rows=15000000 width=20)
```
{{< html.inline >}}
</details>
{{< /html.inline >}}

14. Now execute the query twice noting the execution time of the second execution.  The first execution is to ensure the plan is compiled.  The second is more representative of the end-user experience.

> Note: The set enable_result_cache_for_session to false is used to ensure the result set cache is not used.

```sql
set enable_result_cache_for_session to false;

SELECT c_mktsegment,COUNT(o_orderkey) AS orders_count, sum(l_quantity) as quantity, sum (l_extendedprice) as extendedprice
FROM lineitem
JOIN orders on l_orderkey = o_orderkey
JOIN customer c on o_custkey = c_custkey
WHERE l_commitdate between '1992-01-01T00:00:00Z' and '1992-12-31T00:00:00Z'
GROUP BY c_mktsegment;
```

15. Create a new version of the *customer* table which is distributed using the *custkey*. Execute an EXPLAIN and notice this results in a join strategy of “DS_BCAST_INNER" with a higher cost.  This is due to the fact that neither the *customer* or the *orders* table is co-located and data from the inner table has to be broadcast in order for the join to complete.
```sql
DROP TABLE IF EXISTS customer_v1;
CREATE TABLE customer_v1
DISTKEY (c_custkey) as
SELECT * FROM customer;

EXPLAIN
SELECT c_mktsegment,COUNT(o_orderkey) AS orders_count, sum(l_quantity) as quantity, sum (l_extendedprice) as extendedprice
FROM lineitem
JOIN orders on l_orderkey = o_orderkey
JOIN customer_v1 c on o_custkey = c_custkey
WHERE l_commitdate between '1992-01-01T00:00:00Z' and '1992-12-31T00:00:00Z'
GROUP BY c_mktsegment;
```

{{< html.inline >}}
<details><summary>&gt;Hint</summary>
{{< /html.inline >}}
```python
XN HashAggregate  (cost=4200077745781.50..4200077745781.54 rows=5 width=43)
  ->  XN Hash Join DS_BCAST_INNER  (cost=1137500.00..4200077353037.66 rows=39274384 width=43)
        Hash Cond: ("outer".o_custkey = "inner".c_custkey)
        ->  XN Hash Join DS_DIST_NONE  (cost=950000.00..70800289.92 rows=39163960 width=39)
              Hash Cond: ("outer".l_orderkey = "inner".o_orderkey)
              ->  XN Seq Scan on lineitem  (cost=0.00..8985568.32 rows=79308960 width=31)
                    Filter: ((l_commitdate <= '1992-12-31'::date) AND (l_commitdate >= '1992-01-01'::date))
              ->  XN Hash  (cost=760000.00..760000.00 rows=76000000 width=16)
                    ->  XN Seq Scan on orders  (cost=0.00..760000.00 rows=76000000 width=16)
        ->  XN Hash  (cost=150000.00..150000.00 rows=15000000 width=20)
              ->  XN Seq Scan on customer_v1 c  (cost=0.00..150000.00 rows=15000000 width=20)
```
{{< html.inline >}}
</details>
{{< /html.inline >}}

16. Now execute the query twice noting the execution time of the second execution.  The first execution is to ensure the plan is compiled.  The second is more representative of the end-user experience.

> Note: The set enable_result_cache_for_session to false is used to ensure the result set cache is not used.

```sql
set enable_result_cache_for_session to false;

SELECT c_mktsegment,COUNT(o_orderkey) AS orders_count, sum(l_quantity) as quantity, sum (l_extendedprice) as extendedprice
FROM lineitem
JOIN orders on l_orderkey = o_orderkey
JOIN customer_v1 c on o_custkey = c_custkey
WHERE l_commitdate between '1992-01-01T00:00:00Z' and '1992-12-31T00:00:00Z'
GROUP BY c_mktsegment;
```

17. Finally, create a new version of the *orders* table which is distributed using the EVEN distribution. Execute an EXPLAIN and notice this results in a join strategy of "DS_DIST_INNER" when joining the large *lineitem* table to the *orders* table because they are not distributed on the same key.  Also, when joining those results to the *customer* table, the data needs to be broadcasted to the nodes as evidenced by the “DS_BCAST_INNER"  join strategy.

```sql
DROP TABLE IF EXISTS orders_v1;
CREATE TABLE orders_v1
DISTSTYLE EVEN as
SELECT * FROM orders;

EXPLAIN
SELECT c_mktsegment,COUNT(o_orderkey) AS orders_count, sum(l_quantity) as quantity, sum (l_extendedprice) as extendedprice
FROM lineitem
JOIN orders_v1 on l_orderkey = o_orderkey
JOIN customer_v1 c on o_custkey = c_custkey
WHERE l_commitdate between '1992-01-01T00:00:00Z' and '1992-12-31T00:00:00Z'
GROUP BY c_mktsegment;
```

{{< html.inline >}}
<details><summary>&gt;Hint</summary>
{{< /html.inline >}}
```python
XN HashAggregate  (cost=10280077745781.50..10280077745781.54 rows=5 width=43)
  ->  XN Hash Join DS_BCAST_INNER  (cost=1137500.00..10280077353037.66 rows=39274384 width=43)
        Hash Cond: ("outer".o_custkey = "inner".c_custkey)
        ->  XN Hash Join DS_DIST_INNER  (cost=950000.00..6080070800289.92 rows=39163960 width=39)
              Inner Dist Key: orders_v1.o_orderkey
              Hash Cond: ("outer".l_orderkey = "inner".o_orderkey)
              ->  XN Seq Scan on lineitem  (cost=0.00..8985568.32 rows=79308960 width=31)
                    Filter: ((l_commitdate <= '1992-12-31'::date) AND (l_commitdate >= '1992-01-01'::date))
              ->  XN Hash  (cost=760000.00..760000.00 rows=76000000 width=16)
                    ->  XN Seq Scan on orders_v1  (cost=0.00..760000.00 rows=76000000 width=16)
        ->  XN Hash  (cost=150000.00..150000.00 rows=15000000 width=20)
              ->  XN Seq Scan on customer_v1 c  (cost=0.00..150000.00 rows=15000000 width=20)
```          
{{< html.inline >}}
</details>
{{< /html.inline >}}

18. Now execute the query twice noting the execution time of the second execution.  The first execution is to ensure the plan is compiled.  The second is more representative of the end-user experience.

> Note: The set enable_result_cache_for_session to false is used to ensure the result set cache is not used.

```sql
set enable_result_cache_for_session to false;

SELECT c_mktsegment,COUNT(o_orderkey) AS orders_count, sum(l_quantity) as quantity, sum (l_extendedprice) as extendedprice
FROM lineitem
JOIN orders_v1 on l_orderkey = o_orderkey
JOIN customer c on o_custkey = c_custkey
WHERE l_commitdate between '1992-01-01T00:00:00Z' and '1992-12-31T00:00:00Z'
GROUP BY c_mktsegment;
```


## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources.
