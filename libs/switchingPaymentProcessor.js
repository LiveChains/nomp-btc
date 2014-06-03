var fs = require('fs');

var redis = require('redis');
var async = require('async');

var Stratum = require('stratum-pool');
var util = require('stratum-pool/lib/util.js');


module.exports = function(logger){

    var portalConfig = JSON.parse(process.env.portalConfig);

    var poolConfigs = JSON.parse(process.env.pools);

    var redisClient = redis.createClient(portalConfig.redis.port, portalConfig.redis.host);

    for (var switchName in portalConfig.switching){
        var switchConfig = portalConfig.switching[switchName].singleCoinPayout;
        if (!switchConfig) continue;
        switchConfig.name = switchName;

        SetupForSwitch(logger, redisClient, portalConfig, switchConfig);
    }

};




function SetupForSwitch(logger, redisClient, portalConfig, switchConfig){
    var logSystem = 'Payments';
    var logComponent = switchConfig.name;


    var daemon = new Stratum.daemon.interface([switchConfig.daemon], function(severity, message){
        logger[severity](logSystem, logComponent, message);
    });

    var magnitude;
    var minPaymentSatoshis;
    var coinPrecision;

    var paymentInterval;

    var exampleAddress;

    var getProperAddress = function(address){
        if (address.length === 40){
            return util.addressFromEx(exampleAddress, address);
        }
        else return address;
    };

    async.parallel([
        function(callback){
            daemon.cmd('listaddressgroupings', [], function(result) {
                if (result.error){
                    logger.error(logSystem, logComponent, 'Error with payment processing daemon ' + JSON.stringify(result.error));
                    callback(true);
                }
                else{
                    exampleAddress = result.response[0][0][0];
                    callback()
                }
            }, true);
        },
        function(callback){
            daemon.cmd('getbalance', [], function(result){
                if (result.error){
                    callback(true);
                    return;
                }
                try {
                    var d = result.data.split('result":')[1].split(',')[0].split('.')[1];
                    magnitude = parseInt('10' + new Array(d.length).join('0'));
                    minPaymentSatoshis = parseInt(switchConfig.payments.minimumPayment * magnitude);
                    coinPrecision = magnitude.toString().length - 1;
                    callback();
                }
                catch(e){
                    logger.error(logSystem, logComponent, 'Error detecting number of satoshis in a coin, cannot do payment processing. Tried parsing: ' + result.data);
                    callback(true);
                }

            }, true, true);
        }
    ], function(err){
        if (err)
            return;
        paymentInterval = setInterval(function(){
            processPayments();
        }, switchConfig.payments.interval * 1000);
        setTimeout(processPayments, 100);
        logger.debug(logSystem, logComponent, 'Payment processing setup to run every ' + switchConfig.payments.interval + ' seconds');
    });



    var processPayments = function(){
        async.waterfall([
            function callback(){

            }
        ], function(error, result){

        })
    };

}