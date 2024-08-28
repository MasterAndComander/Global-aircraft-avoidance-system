'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const ToBoolean = require('to-boolean');
const Promise = require('bluebird');

const loggerLibrary = require('../libraries/loggerlib/index.js');

const logger = new loggerLibrary('log', 'GASS_UI');
const ManagerClass = require('./manageSocket.js');

const app = express();

//Inicializo el logger
logger.init(ToBoolean(process.env.DEBUG_MODE))
.then(ok => {
    let rabbitConfig = {
        hostname: process.env.RABBITMQ_URL,
        port: process.env.RABBITMQ_PORT,
        username: process.env.RABBITMQ_USER,
        password: process.env.RABBITMQ_PASSWORD,
        vhost: process.env.RABBITMQ_VHOST
    };
    const Manager = new ManagerClass(require('./bin/www'), logger, rabbitConfig);
    Manager.init()
    .then(ok => {
        let indexManagement = require('./routes/indexManagement')(Manager);

        app.use(cors());
        app.use(compression());
        app.use(express.static(path.join(__dirname, 'public')));
        // view engine setup
        app.set('views', path.join(__dirname, 'views'));
        app.set('view engine', 'pug');

        app.use(bodyParser.json({limit: '100mb'}));
        app.use(bodyParser.urlencoded({limit: '100mb', extended: true}));
        app.use(cookieParser());

        app.use('/', indexManagement);

        app.use(function(req, res, next) {
            logger.log('error', "app::internalMessage::development::"+req.url+"::URL not found");
            res.redirect('/');
        });
    
        // error handlers
        // development error handler
        // will print stacktrace
        if (app.get('env') === 'development') {
            app.use(function(err, req, res, next) {
                console.log(err)
                logger.log('info', "app::internalMessage::development::"+(typeof req));
                logger.log('error', "app::internalMessage::development::"+(err.message || err));
                res.redirect('/');
            });
        }
    
        // production error handler
        // no stacktraces leaked to user
        app.use(function(err, req, res, next) {
            logger.log('info', "app::internalMessage::500::"+(typeof req));
            logger.log('error', "app::internalMessage::500::"+(err.message || err));
            res.redirect('/');
        });
    })
    .catch(err => {
        logger.log('error', "app::Manager::init::"+(err.message || err));
        process.exit(1);
    });
})
.catch(err => {
    console.log(err.message || err);
});

module.exports = app;