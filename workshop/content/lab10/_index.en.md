+++
title = "Speed up Machine learning"
date = 2020-01-11T16:24:25-08:00
weight = 10
pre = "<b>10. </b>"
+++

{{< html.inline >}}
<style>
img {
  border: 2px solid;
  border-color: black;
}
blockquote {
  border: 1px solid #6AB0DE;
  background: #E7F2FA;
}
</style>
{{< /html.inline >}}

In the lab, you will leverage Redshift for data wrangling which speed up your machine learning use case. You will use Python and Amazon Sagemaker notebook to forecast sales.

## Contents
- [Before You Begin](#before-you-begin)
- [Create Sagemaker notebook instance and setup needed Python library](#create-sagemaker-notebook-instance-and-setup-needed-python-library)
- [Connect to Redshift from your notebook](#connect-to-redshift-from-your-notebook)
- [Exam the sales transaction dataset](#exam-the-sales-transaction-dataset)
- [Use Redshift to cleanup and prepare dataset](#use-redshift-to-cleanup-and-prepare-dataset)
- [Train model and evaluate the model](#train-model-and-evaluate-the-model)
- [Forecast sales for top products](#forecast-sales-for-top-products)
- [Before You Leave](#before-you-leave)


## Before You Begin
This lab assumes you have launched a Redshift cluster and can gather the following information. If you have not launched a cluster, see [Lab 1 - Creating Redshift Clusters](../lab1.html). 
- [Your-Redshift_Hostname]
- [Your-Redshift_Port]
- [Your-Redshift_Username]
- [Your-Redshift_Password]

## Create Sagemaker notebook instance and setup needed Python library
In AWS console, nevigate to SageMaker, create a new notebook instance
![](../images/lab10/ds_lab_create_notebook_instance_01.png)
Choose the instance type you like. For this lab, we don't need a very powerful one, ml.t2.medium is good enough.
![](../images/lab10/ds_lab_create_notebook_instance_02.png)
Create a new IAM role and select S3 buckets where your machine learning datasets are located.
![](../images/lab10/ds_lab_create_notebook_instance_03.png)
Make sure in the `Network` setting part, choose the same VPC, Subnet, and Security group as your Redshift cluster. This will allow the notebook connect to Redshift easily.
![](../images/lab10/ds_lab_create_notebook_instance_04.png)
Click Create notebook instance. In a few minutes, the instance should be up and running. Find the notebook instance which was launched and click on the `Open JupyterLab` link.
![](../images/lab10/JupyterLab.png)
In the Notebook UI, create a new notebook with kernal conda_python3
![](../images/lab10/ds_lab_setup_notebook_01.png)
![](../images/lab10/ds_lab_setup_notebook_02.png)
Jupyter notebook is an interactive environment where you can run python code, bash command, and SQL (using magic) in interpret mode and see result quickly.
First you need to install required Python library by executing the following command in a notebook cell.
```bash
!pip install statsmodels
!pip install pmdarima
!pip install awswrangler
!pip install ipython-sql
```
Add a new cell and paste above code in, then execute. Below animated gif demos how to do it.
If a cell is not executed, the left `[ ]` will be empty, when it's running, it will show as `[ * ]`, after it finishes, it will show a number, e.g. `[3]`
![](../images/lab10/notebook_execute_cell.gif)

## Connect to Redshift from your notebook
Create a connection.json file with the Redshift cluster info you collected from CloudFormation output in below format. (Watch below animated gif for how to do it)
```json
{
   "host_name" : "[Your-Redshift_Hostname]",
   "port_num" : "[Your-Redshift_Port]",
   "username" : "[Your-Redshift_Username]",
   "password" : "[Your-Redshift_Password]",
   "db_name" : "[Your-Redshift_Database]"
}
```
![](../images/lab10/create_connection_json.gif)

Now we are ready to connect to Redshift cluster. We will use [aws data wrangler](https://github.com/awslabs/aws-data-wrangler) library to connect to Redshift and execute queries. In a new cell, paste and execute below code
```python
import awswrangler as wr
import json

data = {}
with open('connection.json') as f:
  data = json.load(f)

# connect to Redshift cluster
engine = wr.db.get_engine(
        db_type="redshift",
        host=data['host_name'],
        port=data['port_num'],
        database=data['db_name'],
        user=data['username'],
        password=data['password']
)

# Test connection
results = wr.db.read_sql_query('select current_user, version();', con=engine)
results
```
If connection setup correctly, you should see output like below
![](../images/lab10/ds_lab_connect_to_rs.png)

## Exam the sales transaction dataset
The dataset is located in "s3://redshift-demos/data/sales_forecasting/raw_csv/". you will create an external schema and external table from it and use Redshift Spectrum to access it. To learn more about Spectrum, please review [Lab 4 - Modernize w/ Spectrum](../lab4.html)

In a new cell, execute below code to create an external schema. Make sure replace the IAM_ROLE to the corresponding one in your environment that has S3 read permission.
```python
query_create_schema = '''
CREATE EXTERNAL SCHEMA IF NOT EXISTS ds_lab
FROM DATA CATALOG DATABASE 'default' 
IAM_ROLE 'arn:aws:iam::###account_id###:role/###redshift_role###' 
CREATE EXTERNAL DATABASE IF NOT EXISTS;
'''

with engine.connect() as con:
    con.execute(query_create_schema)
```
Then create an external table via [Redshift QueryEditor](https://console.aws.amazon.com/redshiftv2/home?region=us-east-1#query-editor:) using sample sales data.
```sql
CREATE external TABLE ds_lab.sales_raw(
  invoiceno varchar(16), 
  stockcode varchar(16), 
  description varchar(128), 
  quantity varchar(16), 
  invoicedate varchar(32), 
  unitprice varchar(16), 
  customerid varchar(16), 
  country varchar(32)
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES (
  'serialization.format' = ',',
  'field.delim' = ','
)
LOCATION
  's3://redshift-demos/data/sales_forecasting/raw_csv/'
TABLE PROPERTIES (
  'skip.header.line.count'='1');
```

Now you can exam the dataset without loading it into Redshift
![](../images/lab10/ds_lab_sample_data.png)

## Use Redshift to cleanup and prepare dataset
The dataset is not ready for forecasting. It contains bad data, null, missing values, etc. For example:
- Description is null
- CustomerID could be null
- Quantity is null
- Damaged, wrong order, missing, sample, adjustment ... Should remove those record
- UnitPrice = 0 those records should be removed
- Some dates don't have any sales.

Before we run machine learning algorithm to build model, we need to clean up the data. 80% of data scientist's time is spent on data wrangling. Let's see how to use Redshift to quickly cleanup the data. Execute below code in a new cell to create a new table and store cleaned data.
```python
query_create_table = '''
create table public.sales_clean as
    select invoiceno, stockcode, TO_DATE(invoicedate, 'MM/DD/YYYY HH24:MI') as invoicedate,
        cast(quantity as bigint) as quantity, 
        cast(unitprice as float) as unitprice, 
        country from ds_lab.sales_raw
    where 
    trim(unitprice) not like '0'
    and stockcode not in ('B', 'D', 'M', 'm', 'S');
'''
with engine.connect().execution_options(autocommit=True) as con:
    con.execute(query_create_table)
```

### Challenges:
> Instead of CTAS, you can use [materialzed view](https://docs.amazonaws.cn/en_us/redshift/latest/dg/materialized-view-create-sql-command.html) to process and store cleaned data and easily refresh it by calling REFRESH materialized view after new data added. Depend on where the source table stored and the query pattern, it could qualify for incremental refresh and shorten the data wrangling time even further.

Now the data is ready for model training and forecasting. First, you will aggregate the sales by date, then split it into training and testing set. For standard machine learning tasks such as classification and regression, one typically obtains this split by randomly separating examples into train and test sets. However, in forecasting it is important to do this train/test split based on time rather than by time series. here we use first 10 months data for training, and rest for testing.
```python
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

daily_sales = '''select date_trunc('day', invoicedate) as invoicedate, sum(quantity * unitprice) as total_sales from public.sales_clean group by 1 order by 1;'''
df = wr.db.read_sql_query(daily_sales, con=engine)
result = df.set_index('invoicedate')
result = result.resample('1D').sum()

traindata = np.trim_zeros(result.iloc[:,0], trim='f')
train = traindata[50:330]
test = traindata[330:]

result.plot(figsize=(15,8))
```
![](../images/lab10/ds_lab_visual_source.png)

One of the most widely studied models in time series forecasting is ARIMA (autoregressive integrated moving average) model. The sales dataset used here has seasonality so we will use SARIMA model. 
you can decompose the time series data to see it's trend, seasonality, and noise
```python
from pylab import rcParams
import statsmodels.api as sm

rcParams['figure.figsize'] = 15, 8
decomposition = sm.tsa.seasonal_decompose(result, model='additive')
fig = decomposition.plot()
plt.show()
```
![](../images/lab10/ds_lab_decompose.png)

## Train model and evaluate the model
To simplify the model tuning, we will use pmdarima python library to automatically select best parameters.
```python
import pmdarima as pm
from statsmodels.tsa.arima_model import ARIMA
from random import random

smodel = pm.auto_arima(train, start_p=1, start_q=1,
                         test='adf',
                         max_p=3, max_q=3, m=12,
                         start_P=0, seasonal=True,
                         d=None, D=1, trace=True,
                         error_action='ignore',  
                         suppress_warnings=True, 
                         stepwise=True)

smodel.summary()
```
![](../images/lab10/ds_lab_model_result.png)

We used the first 10 months data to train the model, If we run the prediction, we can compare the result with the testing dataset to evaluate the model.
```python
import matplotlib.pyplot as plt

n_periods = 30
fitted, confint = smodel.predict(n_periods=n_periods, return_conf_int=True)
index_of_fc = pd.date_range(train.index[-1], periods = n_periods, freq='D')

fitted_series = pd.Series(fitted, index=index_of_fc)
lower_series = pd.Series(confint[:, 0], index=index_of_fc)
upper_series = pd.Series(confint[:, 1], index=index_of_fc)

# Plot
plt.figure(figsize=(12,5), dpi=100)
plt.plot(train[:], label='training')
plt.plot(test[:30], label='actual')
plt.plot(fitted_series, color='darkgreen', label='forecast')
plt.fill_between(lower_series.index, 
                 lower_series, 
                 upper_series, 
                 color='k', alpha=.15)

plt.legend(loc='upper left', fontsize=8)
plt.title("Forecast of sales vs actual")
plt.show()
```
![](../images/lab10/ds_lab_evaluate_model.png)

## Forecast sales for top products
Now we can use the model to forecast popular product sales in next 30 days. and visualize the result.

```python
from statsmodels.tsa.statespace.sarimax import SARIMAX

prodcode = '22633'
daily_prod_sales = '''select date_trunc('day', invoicedate) as invoicedate, sum(quantity * unitprice) as total_sales from public.sales_clean where stockcode = '%s' group by 1 order by 1;'''
df = wr.db.read_sql_query(daily_prod_sales % prodcode, con=engine)
df_prod = df.set_index('invoicedate')
df_prod = df_prod.resample('1D').sum()

forecast_period = 30
prod_data = df_prod['total_sales']
train_prod = prod_data[:]
forecast_index = pd.date_range(start=df_prod.index[df_prod.size-1], freq='1D', periods=forecast_period)

my_order = (0,0,2)
my_seasonal_order = (0, 1, 2, 12)
model = SARIMAX(train_prod, order=my_order, seasonal_order=my_seasonal_order)

# train the model and run forecast
model_fit = model.fit()
fc = model_fit.forecast(forecast_period, alpha=0.05)
fc_series = pd.Series(fc, index=forecast_index)

fig = plt.figure(figsize=(12,5), dpi=100)
plt.plot(train_prod[df_prod.size-45:], label='actual')
plt.plot(fc_series[:], label='forecast')
plt.title('%d days Forecast for product %s' % (forecast_period, prodcode))
plt.legend(loc='upper left', fontsize=8)

```
![](../images/lab10/ds_lab_forecast.png)

Here is how the complete notebook looks like: (or click here: [sales forecasting](../post/sales_forecasting.html) )
{{< html.inline >}}
<iframe src=../post/sales_forecasting.html width="100%" height=450></iframe>
{{< /html.inline >}}

## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources, as well as terminating the Sagemaker notebook instance.
Note Sagemaker notebook instance can be stopped and started later with all notebooks preserved. If you want to continue your work later, you can just stop it.