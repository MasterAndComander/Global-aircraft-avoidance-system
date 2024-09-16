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
const gjv = require("geojson-validation");

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
        //Valido las misiones
        parseMissions(process.env.MISSION_LIST)
        .then(missions => {
            let indexManagement = require('./routes/indexManagement')(Manager, missions);

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
            logger.log('error', "app::parseMissions::"+(err.message || err));
            process.exit(1);
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

const parseMissions = function(str) {
    return new Promise( (resolve, reject) => {
        try {
            let myArray = [];
            let hayError = false;
            let misiones = JSON.parse(str.replace(/&quot;/g, '\"'));
            if(Array.isArray(misiones)) {
                asyncLoopMenor(0, misiones.length, (loop) => {
                    let mission = misiones[loop.iteration()];
                    if(gjv.valid(mission)) {
                        let mTr = transformMission(mission, loop.iteration()+1);
                        if(mTr)
                            myArray.push(mTr);
                        loop.next()
                    } else {
                        hayError = true;
                        loop.next()
                    }
                }, (err) => {
                    if(hayError)
                        logger.log('warn', "app::parseMissions::Some missions contains errors");
                    resolve(myArray);
                });
            } else {
                reject('MISSION_LIST must be an Array');
            }
        } catch (error) {
            reject(error)
        }
    });
}

const transformMission = function(laMission, index) {
    try {
        let json = {structPoints: []};
        if(laMission.properties && laMission.properties.name)
            json.name = laMission.properties.name;
        else
            json.name = 'Misión '+index;
        if(laMission.properties && laMission.properties.id)
            json.id = laMission.properties.id;
        else
            json.id = parseInt(index);
        if(laMission.geometry && laMission.geometry.type && (laMission.geometry.type == 'Polygon' || laMission.geometry.type == 'LineString')) {
            let iteration;
            if(laMission.geometry.type == 'LineString') {
                json.missionType = 'linear';
                iteration = laMission.geometry.coordinates;
            } else {
                json.missionType = 'perimeter';
                iteration = laMission.geometry.coordinates[0];
            }
            let altitude = laMission.properties.altitude && laMission.properties.altitude >= 10 ? laMission.properties.altitude : 20;
            iteration.forEach(element => {
                json.structPoints.push(
                    {
                        "type": "waypoint",
                        "lat": element[1],
                        "lon": element[0],
                        "alt": altitude
                    }
                )
            });
            return json;
        } else
            return undefined;
    } catch (error) {
        return undefined
    }
}

//Loop asincrono
const asyncLoopMenor = function(inicio, iterations, func, callback) {
    let index = inicio;
    let done = false;
    let numIterations=iterations;
    let loop = {
        next: function(init, fin) {
            if(init!=undefined){index=init;}
            if(fin!=undefined){numIterations=fin;}
            if (done) {
                return;
            }
            if (index < numIterations) {
                index++;
                func(loop);
            } else {
                done = true;
                callback();
            }
        },
        iteration: function() {
          return index - 1;
        },
        setIndex: function(value) {
          index=index+value;
        },
        break: function(value) {
          done = true;
          callback(value);
        },
        getEnd: function() {
          return numIterations;
        }
    };
    loop.next();
    return loop;
}

module.exports = app;