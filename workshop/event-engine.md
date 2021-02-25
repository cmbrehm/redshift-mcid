# Event Engine Config

This is how to onboard this specific environment into EE.  Not meant to be a general EE guide.

- Create a Module
- Leave Master Template blank
- Use [`/cfn/lab1.yaml`](cfn/lab1.yaml) as the Team Template (copy/paste it)
- under the IAM tab, add the following *IAM Policy Statements*
```
[
  {
    "Effect": "Allow",
    "Action": [
      "iam:GetRole",
      "iam:PassRole"
    ],
    "Resource": [
      "arn:aws:iam::$$teamAccountId:role/RedshiftImmersionRole",
      "arn:aws:iam::$$teamAccountId:role/service-role/AWSGlueServiceRole-ImmersionDay"
    ]
  }
]
```
- add the following for *IAM Managed Policy ARNs*
```
arn:aws:iam::aws:policy/PowerUserAccess
arn:aws:iam::aws:policy/AmazonRedshiftDataFullAccess
arn:aws:iam::aws:policy/AmazonRedshiftFullAccess
```

Save the module and you can use it as the only one in the Event Engine blueprint
