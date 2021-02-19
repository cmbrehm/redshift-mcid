+++
title = "Use SAML 2.0 for SSO with Redshift"
date = 2020-01-22T16:27:02-08:00
weight = 9
pre = "<b>9. </b>"
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

In this lab, we show you how to enable SSO using the Redshift BrowserSAML plugin with any SAML 2.0 provider. It will walk through the setup of the IdP (using JumpCloud an IdP which provides 10 free users), the configuration of the AWS environment, and the configuration of your SQL client tool.

## Contents
* [Identity Provider Configuration](#identity-provider-configuration)
* [IAM Configuration](#iam-configuration)
* [Client tool setup](#client-tool-setup)

## Before You Begin
This lab assumes you have launched a Redshift cluster.  If you have not launched a cluster, see [LAB 1 - Creating Redshift Clusters](../lab1.html). The lab also assume you can gather the following information.

* [Your-Redshift-Cluster]
* [Your-Redshift_Database]
* [Your-Redshift_Endpoint]
* [Your-AWS-Account_Id]
* [Your-AWS-Region]

## Identity Provider Configuration
In this first step, you create the SAML 2.0 application, create your users within the identity provider and add your db users to that application.  For our purposes we'll use JumpCloud as our IdP as it provides up to 10 users free.

1. Download and save the AWS Service Provider metadata from the following location: https://signin.aws.amazon.com/static/saml-metadata.xml
2. Create a JumpCloud account. If you don’t already have access to a JumpCloud account, you can create one from the following location: https://console.jumpcloud.com/signup
3. Create a new custom SAML 2.0 Application
![](../images/lab9/CreateApplication.png)
4. Name the application: Redshift
![](../images/lab9/ApplicationName.png)
5. Upload the AWS Service Provider metadata file you downloaded in step 1.
![](../images/lab9/UploadMetadata.png)
6. Set the IdP Entity Id: JumpCloud
![](../images/lab9/EntityId.png)
7. Set the IdP Url: [uniquename]-redshift and activate the application
![](../images/lab9/IdpUrl.png)
8. Edit the application and modify the ACS URL to: http://localhost:7890/redshift/
> Note: Step 8 & 9 need to happen after the application has been activated because JumpCloud will not import the AWS SAML metadata until that happens.  Notice when you re-open the application the SP Entity Id has been updated to the value retrieved from the metadata file.

![](../images/lab9/ACSUrl.png)
9. Customize the attributes replacing the value for [Your-AWS-Account_Id] and save the application.

|Category|Attribute|Value|
|-|-|-|
|User|https://aws.amazon.com/SAML/Attributes/RoleSessionName|username|
|User|https://redshift.amazon.com/SAML/Attributes/DbUser|username|
|Constant|https://aws.amazon.com/SAML/Attributes/Role|arn:aws:iam::[Your-AWS-Account_Id]:saml-provider/jumpCloud,arn:aws:iam::[Your-AWS-Account_Id]:role/jumpcloudsso|
|Constant|https://redshift.amazon.com/SAML/Attributes/AutoCreate|true|

![](../images/lab9/Attributes.png)

10. Download the metadata for the identity provider application.  You will use this in the IAM configuration.
![](../images/lab9/IdPMetadata.png)
11. Create a user group and associate the group to application you just created.
https://console.jumpcloud.com/#/groups

![](../images/lab9/CreateGroup1.png)
![](../images/lab9/CreateGroup2.png)

12. Create a user and associate to the *ssousers* group you just created.  Since this is test, use a fake email address and specify a password so the user doesn't have to set one.

![](../images/lab9/CreateUser1.png)
![](../images/lab9/CreateUser2.png)


## IAM configuration
In this step you enroll the identity provider within AWS.  You also create a role with access to login to Redshift and which the identity provider is allowed to assume.

1. Sign into the [IAM Console](https://console.aws.amazon.com/iam/home?#/home) within the AWS Management Console and create the SAML identity provider named *jumpCloud*.  Upload the identity provider Metadata file you downloaded in step 10 above.

![](../images/lab9/CreateProvider1.png)
![](../images/lab9/CreateProvider2.png)
![](../images/lab9/CreateProvider3.png)

2. Create a role named *jumpcloudsso* which the identity provider is allowed to assume.  Specify the SAML provider of *jumpCloud* and set the SAML:aud to *http://localhost:7890/redshift/*.  This will ensure that this SAML application is only used for this endpoint. Skip the *Attach permissions policies* and click on *Create role*.

![](../images/lab9/CreateRole1.png)
![](../images/lab9/CreateRole2.png)

3. Edit the *jumpcloudsso* role you just created and add the following *inline policy*.  This policy grants the role the privilege to GetClusterCredentials and CreateClusterUser. Replace the values for for [Your-Redshift-Cluster], [Your-Redshift_Database], [Your-AWS-Account_Id] and [Your-AWS-Region].
```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
              "redshift:GetClusterCredentials",
              "redshift:CreateClusterUser"
              ],
            "Resource": [
                "arn:aws:redshift:[Your-AWS-Region]:[Your-AWS-Account_Id]:cluster:[Your-Redshift-Cluster]",
                "arn:aws:redshift:[Your-AWS-Region]:[Your-AWS-Account_Id]:dbuser:[Your-Redshift-Cluster]/${redshift:DbUser}",
                "arn:aws:redshift:[Your-AWS-Region]:[Your-AWS-Account_Id]:dbname:[Your-Redshift-Cluster]/[Your-Redshift_Database]"
            ],
            "Condition": {
                "StringLike": {
                    "aws:userid": "*:${redshift:DbUser}"
                }
            }
        }
    ]
}
```

![](../images/lab9/AddPolicy1.png)
![](../images/lab9/AddPolicy2.png)
![](../images/lab9/AddPolicy3.png)


## Client Tool Setup
Finally, we'll setup our JDBC Client to call the identity provider for authorization by configuring it with IAM authentication.
> Note: IAM authentication requires using the JDBC Driver with AWS SDK included or that you ensure the AWS SDK is within your java classpath. See the [Redshift Documentation](https://docs.aws.amazon.com/redshift/latest/mgmt/configure-jdbc-connection.html#download-jdbc-driver) for more details.  

1. Download and install a JDBC Client.  For this lab we will use [SQL Workbench/J](http://www.sql-workbench.net).

2. Download the Redshift **JDBC driver with SDK** version 1.2.40 or higher from the [JDBC download page](https://docs.aws.amazon.com/redshift/latest/mgmt/configure-jdbc-connection.html#jdbc-previous-versions-with-sdk).

3. Launch SQL Workbench/J and navigate to [File | Manage Drivers]. Select “Amazon Redshift” and set the driver Library location to where you downloaded the new Redshift JDBC Driver. Click Ok.

![](../images/lab9/UpdateDriver.png)

4. Create a new connection.  Set the connection properties using [Your-Redshift_Endpoint], [Your-Redshift_Database], and the identity provider properties.  For the JDBC *URL* be sure to add the **IAM** qualifier.  For the *login_url* be sure to use the *[uniquename]-redshift* specified in step 7 above.

|Property|Value|Value|
|--|--|--|
|URL|jdbc:redshift:iam://[Your-Redshift_Endpoint]/[Your-Redshift_Database]|
|login_url|https://sso.jumpcloud.com/saml2/[uniquename]_redshift|
|plugin_name|com.amazon.redshift.plugin.BrowserSamlCredentialsProvider|

![](../images/lab9/JDBCSetup.png)

5. Connect to the database. A browser window will open and load the IdP login page.  Enter the email address and password you created earlier. Then click on *SSO LOGIN*.  If successful, you should be shown a message to close the browser window.

![](../images/lab9/SSOLogin1.png)
![](../images/lab9/SSOLogin2.png)

6. Finally, to confirm that you are logged in as the Identity Provider user, execute the following statement:

```
select current_user;
```

![](../images/lab9/SelectUser.png)

## Before You Leave
If you are done using your cluster, please think about decommissioning it to avoid having to pay for unused resources.
