'use strict';

require('dotenv').config();

const loggerJs = require('../libraries/loggerlib/index.js');
const Rabbit = require('../libraries/rabbit-js/index.js');
const ToBoolean = require('to-boolean');

const logger = new loggerJs('log', 'FleetManager');
const fleetCreatorClass = require('./fleetCreator');

let rabbit;
let fleetCreator;

logger.init(ToBoolean(process.env.DEBUG_MODE))
.then(ok => {
    logger.log("info", "main::loggerJs::Logger started...");
    start();
})
.catch(err => {
    console.log(err);
    process.exit(1);
})


async function start() {
    try {
        let rabbitConfig = {
            hostname: process.env.RABBITMQ_URL,
            port: process.env.RABBITMQ_PORT,
            username: process.env.RABBITMQ_USER,
            password: process.env.RABBITMQ_PASSWORD,
            vhost: process.env.RABBITMQ_VHOST
        };
        rabbit = new Rabbit(rabbitConfig);
        fleetCreator = new fleetCreatorClass({rabbit: rabbit, logger: logger})
        let goodStart = await fleetCreator.init();
        logger.log('success', "main::Init::"+goodStart);
    } catch (error) {
        logger.log('error', "main::start::catch" + (error.message || error));
        process.exit(1);       
    }
}
