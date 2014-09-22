var
    assert  = require('assert'),
    bole    = require('bole'),
    restify = require('restify')
    ;

var slackClient;
var logger = bole('slack');

var createClient = exports.createClient = function createClient(opts)
{
    slackClient = restify.createJSONClient({ url: opts.slack });
    logger.info('Slack client created')
};

var report = exports.report = function report(message)
{
    if (!slackClient) return;

    var body = { text: message };
    slackClient.post('', body, function(err, req, res, obj)
    {
        if (err)
            logger.error({error: err, message: message}, 'error posting to webhook');
        else if (res.statusCode === 200)
        {
            logger.info('report posted to Slack');
        }
    });
};
