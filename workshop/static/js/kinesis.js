// variable injection
var awsRegion = document.getElementById('awsRegion').title;
var kinesisStreamName = document.getElementById('kinesisStreamName').title;
var cognitoPoolId = document.getElementById('cognitoPoolId').title;
var version = document.getElementById('version').title;
var language = document.getElementById('language').title;
var scriptVersion = '2020-15-04'
var ip = ''

// Send log to Kinesis
var sendLog = function () {
    console.log('Send Log')
    // Configure Credentials to use Cognito
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: cognitoPoolId
    });
    AWS.config.region = awsRegion;
    AWS.config.credentials.get(function (err) {
        if (err) {
            // alert('Error retrieving credentials.');
            console.error(err);
            return;
        }
        // create Amazon Kinesis service object
        var kinesis = new AWS.Kinesis({
            apiVersion: '2013-12-02'
        });

        // create user Id
        var userId
        // check whether user use HTML5
        if (window.localStorage) {
            // generate userId if not data in localstorage
            userId = localStorage.getItem('userId');
            isRegistered = 'false';
            if (userId == null) {
                userId = AWS.config.credentials.identityId;
                localStorage.setItem('userId', userId);
                isRegistered = 'true';
            }
        } else {
            userId = 'guestUser'
        }

        var recordData = [];
        var record = {
            Data: JSON.stringify({
                page_path: window.location.pathname,
                user_id: userId,
                is_registered: isRegistered,
                version: version,
                language: language,
                scriptVersion: scriptVersion,
                agent: navigator.userAgent,
                user_ts: Date.now(),
                ip_address: ip
            }),
            PartitionKey: 'partition-' + userId
        };
        recordData.push(record);

        kinesis.putRecords({
            Records: recordData,
            StreamName: kinesisStreamName
        }, function (err, data) {
            if (err) {
                console.error(err);
            }
        });

    });
};

function setIP(json) {
  ip = json.ip
}

document.addEventListener('DOMContentLoaded', function() {
   sendLog();
}, false);
