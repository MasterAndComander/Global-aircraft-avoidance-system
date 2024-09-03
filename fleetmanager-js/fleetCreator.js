'use strict';
const Promise = require('bluebird');
const trgIntersect = require('@turf/boolean-intersects');
const Quadtree = require('../libraries/quadtree-js/Quadtree.js');

const TIMEOUT = 3000;
const MAX_LAT = 90;
const MIN_LAT = -90;
const MAX_LNG = 180;
const MIN_LNG = -180;
const ACCURACY = 0.000001;
const EARTH_R = 6371000; // Radius of the earth in m
const MIN_DISTANCE = 3; //Distancia mínima de la circunferencia
const MUL_FACTOR = 4; //Factor de multiplicación para el cálculo del radio en base a la velocidad
const DISTANCE_COORDINATES = 200; //Distancia en metros de los elementos cercanos
const LATERAL_EVASION_DISTANCE = 15; // distancia de evasión lateral, 15m.
const HEIGHT_EVASION_DISTANCE = 8; // distancia de evasión en altura, 8m.
const ANGLE_SEPARATION = 20; // Angulo para calcular el cono de evasión
const MP_SPEED = 7;

class FleetManager {
    constructor (opts) {
        const self = this;
        self.mySelf = process.env.FLEET_EXCHANGE;
        self.mDesigner = process.env.MISSION_EXCHANGE;
        self.deviceList = process.env.DEVICEAGENT_LIST.split(' ');
        self.rabbit = opts.rabbit;
        //logger
        self.logger = opts.logger;
        self.quadMap = new Quadtree(
            { x: MIN_LAT, y: MIN_LNG},
            { x: Math.abs(MIN_LAT) + Math.abs(MAX_LAT), y: Math.abs(MIN_LNG) + Math.abs(MAX_LNG) },
            ACCURACY
        );
        self.arrayMap = [];
        self.timerCheck = null;

    }

    //PUBLIC FUNCTIONS
    init () {
        const self = this;
        return new Promise( (resolve, reject) => {
            try {
                self.rabbit.init()
                .then(ok => {
                    self.logger.log('success', "init::Rabbit::" + ok);
                    self.joinDeviceTelemetrys()
                    .then(ok => {
                        self.logger.log('success', 'init::joinDeviceTelemetrys::'+ok);
                        self.rabbit.listenMessageSynco(self.mySelf, 'messageSyncServer', self.syncDataReceived, {objeto: self})
                        .then(ok => {
                            self.logger.log('success', 'init::JoinSyncDataReceived::'+ok);
                            self.timerCheck = setInterval(self.intervalChecking, 1000, self);
                            resolve('OK');
                        })
                        .catch(err => {
                            self.logger.log('error', 'init::JoinSyncDataReceived::'+(err.message || err));
                            reject(err);
                        });
                    })
                    .catch(err => {
                        self.logger.log('error', 'init::joinDeviceTelemetrys::'+(err.message || err));
                        reject(err);
                    });
                })
                .catch(err => {
                    self.logger.log('error', "init::Rabbit::"+(err.message || err));
                    reject(err);
                });
            } catch (e) {
                reject(e.message);
            }
        });
    }

    //PRIVATE FUNCTIONS
    joinDeviceTelemetrys() {
        const self = this;
        return new Promise( (resolve, reject) => {
             try {
                self.asyncLoopMenor(0, self.deviceList.length, (loop) => {
                    let device = self.deviceList[loop.iteration()];
                    self.rabbit.joinPublisher(device, 'telemetry', self.dataReceivedAsync, {objeto: self})
                    .then(ok => {
                        loop.next();
                    })
                    .catch(err => {
                        self.logger.log('error', 'init::joinDeviceTelemetrys::JoinMessage::'+device+'::'+(err.message || err));
                        loop.break(err);
                    });
                }, (err) => {
                    if(err)
                        reject(err);
                    else
                        resolve(JSON.stringify(self.deviceList));
                });
             } catch (error) {
                self.logger.log('error', 'joinDeviceTelemetrys::Catch::'+(e.message ? e.message : e));
                reject({error: e.message || e});
             }
        });
    }

    syncDataReceived(params) {
        const self = params.objeto;
        return new Promise( (resolve, reject) => {
            try {
                self.logger.log('success', 'syncDataReceived::'+JSON.stringify(params.msg));
                let data = params.msg;
                if(data.target && data.target == self.mySelf) {
                    if((typeof data.action === 'string') && (typeof data.args === 'object')) {
                        let timeout = 0;
                        if(data.args.timeout)
                            timeout = data.args.timeout;
                        switch (data.action) {
                            //Para la parte de ejecución de misiones
                            case 'GenerateExecutionProcess':
                                if(
                                    (data.args.mission && (typeof data.args.mission === 'object')) &&
                                    (data.args.finalAction && (typeof data.args.finalAction === 'string')) &&
                                    (!isNaN(parseInt(data.args.numLaps))) && (!isNaN(parseInt(data.args.initMp))) &&
                                    (data.args.devicesId && (Array.isArray(data.args.devicesId)))
                                ) {
                                    self.createExecProcess(data.args.mission, data.args.devicesId, data.args.numLaps)
                                    .then(struct => {
                                        resolve({error: 'ERR_NOERROR', responses: struct});
                                    })
                                    .catch(err => reject({error: err.message || err}));
                                } else {
                                    self.logger.log('error', 'syncDataReceived::GenerateExecutionProcess::ERR_BADPARAMS');
                                    resolve({error: 'ERR_BADPARAMS'});
                                }
                                break;
                            default:
                                self.logger.log('error', 'syncDataReceived::Catch::Not enough params');
                                throw new Error('ERR_NOT_ENOUGH_PARAMS');  
                        }
                    } else {
                        self.logger.log('error', 'syncDataReceived::Catch::Message Inconsistency');
                        throw new Error('ERR_BAD_MESSAGE_FORMAT');
                    }
                } else {
                    self.logger.log('error', 'syncDataReceived::Catch::Incorrect Target');
                    throw new Error('ERR_INCORRECT_TARGET');    
                }
            } catch (e) {
                self.logger.log('error', 'syncDataReceived::Catch::'+(e.message ? e.message : e));
                reject({error: e.message || e});
            }
        });
    }

    dataReceivedAsync(params) {
        const self = params.objeto;
        try {
            self.logger.log('success', 'dataReceivedAsync::'+JSON.stringify(params.msg));
            let data = params.msg;
            if( (typeof data.id === 'string') && (typeof data.mode === 'string') &&
                (typeof data.gps === 'object') &&
                (!isNaN(data.gps.altitude)) &&
                (!isNaN(data.gps.latitude)) &&
                (!isNaN(data.gps.longitude))
            ) {
                self.updateTelemetry(data)
                .then(device => {
                    if(!(device.onGround) && device.priority > 1)
                        self.checkElementCollisions(device);
                });
            } else {
                self.logger.log('error', 'dataReceivedAsync::ExtendedTelemetry::ERR_BADPARAMS');
            }
        } catch (e) {
            self.logger.log('error', 'dataReceivedAsync::Catch::'+(e.message ? e.message : e));
        }
    }

    /******************************************************************************/
    /* FUNCIONES ASOCIADAS A LA EVASIÓN                                           */
    /******************************************************************************/

    //Esta función busca colisiones en base a un único elemento
    checkElementCollisions(device) {
        const self = this;
        /*
            Las prioridades son las siguientes:
            * ON EVASION - El dispositivo ya esta evadiendo
            * IDLE - Prioridad más baja
            * AUTO
            * ASSISTED
            * MANUAL - Prioridad más alta
            * Contingency - No debería ni llegar a este punto (NO SE PUEDE PARAR)
        */
        self.logger.log('info', device.device+'::checkElementCollisions::Priority::'+device.priority);
        let near = self.quadMap.findNearCoordinatesbyPoints(device.nextPos, DISTANCE_COORDINATES, {notSelf: true, includeData: true});
        //Una vez obtenidos los vecinos proximos, analizamos la trayectoria del elemento con sus vecinos
        self.checkCrossTrajectorys(device, near.data)
        .then(result => {
            self.logger.log('info', device.device+'::checkElementCollisions::Device::ERR_NOERROR');
        })
        .catch(err => {
            self.logger.log('error', device.device+'::checkElementCollisions::Device::'+JSON.stringify(err.message || err));
        });
    }

    intervalChecking (objeto) {
        const self = objeto;
        self.updateOnline();
    }

    //Con esta función se analiza si un dispositivo está actualizando su telemetría
    updateOnline () {
        const self = this;
        const actualTime = new Date().getTime();
        self.arrayMap.forEach(item => {
            actualTime - item.lastUpdate > 5000 ? item.online = false : item.online = true;
        });
    }

    //Este función actualiza la telemetría del obj almacenado. Para poder analizar los cruces
    updateTelemetry (data) {
        const self = this;
        return new Promise((resolve) => {
        let item = self.arrayMap.find(elem => elem.device == data.id);
        if(item) {
            if(self.quadMap.has(item.nextPos))
                self.quadMap.delete(item.nextPos);
            item.currPos = self.convertLatLng2Points(data.gps);
            item.nextPos = self.calculateNextPosition(data);
            item.speed = data.v.speed || 0;
            item.radius = self.calculateRadiusBySpeed(item.speed);
            item.bearing = self.calculateBearing(data.v);
            item.lastUpdate = new Date().getTime();
            item.online = true;
            item.mode = data.mode;
            item.gpsData = data.gps;
            item.priority = item.onEvasion ? 150 : (item.priority || 100);
            item.onEvasion = item.onEvasion || false;
            item.onGround = data.mode == "LANDED";
            self.quadMap.add(item.nextPos, item);
            resolve(item);
        } else {
            let pos = self.arrayMap.push({
                device: data.id,
                priority: 100,
                online: true, gpsData: data.gps, mode: data.mode,
                lastUpdate: new Date().getTime(), currPos: self.convertLatLng2Points(data.gps),
                lastEvasion: {deviceId: null, timer: new Date().getTime()},
                nextPos: self.calculateNextPosition(data),
                onGround: data.mode == "LANDED",
                onEvasion: false, radius: self.calculateRadiusBySpeed(data.v.speed || 0),
                bearing: self.calculateBearing(data.v),
                speed: data.v.speed || 0
            });
            self.quadMap.add(self.arrayMap[pos-1].nextPos, self.arrayMap[pos-1]);
            resolve(self.arrayMap[pos-1]);
        }
        });
    }

    //Calcula el radio de la circunferencia
    calculateRadiusBySpeed (velocity) {
        const self = this;
        let cur = velocity * MUL_FACTOR;
        return cur > MIN_DISTANCE ? cur : MIN_DISTANCE;
    }

    //Calcula el bearing en base a las dos posiciones
    calculateBearing(telem) {
        const self = this;
        if(telem.vy == 0 && telem.vx == 0) {
            
        } else {
            let theta = self.rad2deg(Math.atan2(telem.vy, telem.vx))
            return theta < 0 ? 360 + theta : theta;
        }
    }

    //Calcula la siguiente posición estimada a 1 segundo, en base a las velocidades
    calculateNextPosition (telem) {
        const self = this;
        telem.vx = (Math.abs(telem.v.vx) >= 0.1) ? parseFloat(telem.v.vx.toFixed(5)) : 0;
        telem.vy = (Math.abs(telem.v.vy) >= 0.1) ? parseFloat(telem.v.vy.toFixed(5)) : 0;
        telem.vz = (Math.abs(telem.v.vz) >= 0.1) ? parseFloat(telem.v.vz.toFixed(5)) : 0;
        let latLng = null;

        if(telem.v.vy == 0 && telem.v.vx == 0) {
            latLng = {latitude: telem.gps.latitude, longitude: telem.gps.longitude};
        } else {
            let angle = self.rad2deg(Math.atan2(telem.v.vy, telem.v.vx));
            let distance = Math.sqrt((Math.pow(telem.v.vx, 2)) + (Math.pow(telem.v.vy, 2)));
            latLng = self.getLatLonFromCoordinatesBearingAngle(telem.gps.latitude, telem.gps.longitude, angle, distance);
        }
        let altitude = parseFloat((telem.gps.altitude + telem.v.vz).toFixed(2));
        return {x: latLng.latitude, y: latLng.longitude, z: altitude};
    }

    //Función que determina si un bicho es supcestible de evadir
    checkPriority(evasor, evadido) {
        const self = this;
        if(evadido.priority < evasor.priority) {
            return true;
        } else if((evadido.priority == evasor.priority)) {
            return evadido.device < evasor.device;
        } else {
            return false;
        }
    }

    //Función que analiza los cruces entre un elemento y sus vecinos.
    checkCrossTrajectorys(evasor, closers) {
        const self = this;
        return new Promise( (resolve, reject) => {
            self.asyncLoopMenor(0, closers.length, function(loop) {
                let item = closers[loop.iteration()];
                //Si la prioridad del item es un número más pequeño, significa que se pueden
                //aplicar acciones sobre evasor. Si fuera un número mayor es que ese item
                //ya ha sido visitado en una iteración anterior y por tanto ya se habrán aplicado acciones de ser necesario
                if(item && item.online && !item.onGround && self.checkPriority(evasor, item)) {
                    self.logger.log('warn', 'checkCrossTrajectorys::'+evasor.device+'::Priority:'+evasor.priority+'::'+item.device+'::Priority:'+item.priority)
                    self.hayInterseccion(evasor, item)
                    .then(intersecta => {
                        if(intersecta) {
                            //Si ya esta en evasion y me esta evadiendo a mí, no mandemos evadir a nosotros
                            if(item.onEvasion && evasor.device == item.lastEvasion.deviceId) {
                                self.logger.log('info', evasor.device+'::checkCrossTrajectorys::ItemEvadingEvasor::'+item.device);
                            } else if(
                                //Comprobamos que no hayamos mandado hace poco el mismo mensaje a ese dron
                                (evasor.lastEvasion.deviceId != item.device) || 
                                (evasor.lastEvasion.deviceId == item.device && (new Date().getTime() - evasor.lastEvasion.timer > 3000))
                                ) {
                                //Mandamos mensaje al Device
                                let packet = {
                                    Target: evasor.device,
                                    Source: self.mySelf,
                                    Body: intersecta
                                };
                                self.rabbit.publishMessage(evasor.device, 'messageServer', packet)
                                .then(result => {
                                    self.logger.log('info', evasor.device+'::checkCrossTrajectorys::EvasionInit::'+JSON.stringify(result));
                                    evasor.lastEvasion.deviceId = item.device;
                                    evasor.lastEvasion.timer = new Date().getTime();
                                })
                                .catch(err => {
                                    self.logger.log('error', evasor.device+'::checkCrossTrajectorys::EvasionInit::'+JSON.stringify(err.message || err));
                                });
                            } else {
                                self.logger.log('info', evasor.device+'::checkCrossTrajectorys::JustSending');
                            }
                        }
                        loop.next();
                    })
                    .catch(err => {
                        self.logger.log('error', evasor.device+'::checkCrossTrajectorys::hayInterseccion::'+JSON.stringify(err.message || err));
                        loop.next();
                    });
                } else
                    loop.next();
            }, function(err) {
                resolve();
            });
        });
    }
    
    //Comprueba si dos coordenadas gps son iguales ajustadas al 5º decimal (1.1 m)
    sameGPSPosition(point1, point2) {
        const self = this;
        return (point1.latitude && point2.latitude) && (point1.longitude && point2.longitude) &&
            (Math.floor(point1.latitude*100000) == Math.floor(point2.latitude*100000)) &&
            (Math.floor(point1.longitude*100000) == Math.floor(point2.longitude*100000))
    }

    //Devuelve la distancia en 3 dimensiones
    getDistance3D(lat1, lng1, alt1, lat2, lng2, alt2) {
        const self = this;
        let dAlt = Math.abs(alt1 - alt2);
        let dHaver = self.getDistanceFromLatLon(lat1, lng1, lat2, lng2);
        return Math.sqrt(Math.pow(dAlt, 2) + Math.pow(dHaver, 2));
    }

    //Analiza si los puntos pasados intersectan a una distancia establecida
    hayInterseccion(evasor, evadido) {
        const self = this;
        return new Promise ( (resolve, reject) => {
            try {
                let point1Evasor = self.convertPoints2LatLng(evasor.currPos);
                let point2Evasor = self.convertPoints2LatLng(evasor.nextPos);
                let point1Evadido = self.convertPoints2LatLng(evadido.currPos);
                let point2Evadido = self.convertPoints2LatLng(evadido.nextPos);
                //Calculamos la distancia entre ambos elementos
                let distance = self.getDistance3D(
                    point2Evasor.latitude, point2Evasor.longitude, point2Evasor.altitude, 
                    point2Evadido.latitude, point2Evadido.longitude, point2Evadido.altitude
                );
                let hayChoque = distance <= evasor.radius + evadido.radius;
                if(hayChoque) {
                    if (self.sameGPSPosition(point1Evasor, point2Evasor) && self.sameGPSPosition(point1Evadido, point2Evadido)) {
                        //Si ambos mantienen la posición, asumimos que no habrá intersección
                        resolve(false);
                    } else if(self.sameGPSPosition(point1Evasor, point2Evasor)) {
                        //Entramos si el que debe evadir está estático
                        //Calculamos las coordenadas a las que se va a evadir
                        // Primero bearing entre evasor y evadido
                        let bearingEvasor_Evadido = self.getBearingBetween2Coordinates(
                            point1Evasor.latitude, point1Evasor.longitude, 
                            point2Evadido.latitude, point2Evadido.longitude
                        );
                        //Ahora el ángulo de evasión
                        let angle = self.getEvadingAngle(evadido.bearing, bearingEvasor_Evadido);
                        self.logger.log('info', 'checkCrossTrajectorys::hayInterseccion::CHECKS::'+evasor.device+'::'+evadido.device+'::EVASOR_STATIC::BEARINBDev::'+bearingEvasor_Evadido+'::EVADIDO_BEARING::'+evadido.bearing+'::ANGLE::'+angle);
                        let evasionPoint = self.getLatLonFromCoordinatesBearingAngle(point1Evasor.latitude, point1Evasor.longitude, angle, LATERAL_EVASION_DISTANCE);
                        let newAltitude = point1Evasor.altitude;
                        if(point1Evasor.altitude > point2Evadido.altitude || (Math.abs(point1Evasor.altitude - point2Evadido.altitude) <= 1))
                            newAltitude = evasor.gpsData.altitude + HEIGHT_EVASION_DISTANCE;//newAltitude = point1Evasor.altitude + HEIGHT_EVASION_DISTANCE;
                        else
                            newAltitude = evasor.gpsData.altitude;
                        resolve({
                            message: 'Evasion',
                            latitude: evasionPoint.latitude,
                            longitude: evasionPoint.longitude,
                            altitude: newAltitude
                        });
                    } else if (self.sameGPSPosition(point1Evadido, point2Evadido)) {
                        //Entramos si el que va a ser evadido está estático
                        //Calculamos las coordenadas a las que se va a evadir
                        // Primero bearing entre evasor y evadido
                        let bearingEvadido_Evasor = self.getBearingBetween2Coordinates(
                            point1Evadido.latitude, point1Evadido.longitude,
                            point2Evasor.latitude, point2Evasor.longitude
                        );
                        //Ahora el ángulo de evasión
                        let angle = self.getEvadingAngle(evasor.bearing, bearingEvadido_Evasor);
                        self.logger.log('info', 'checkCrossTrajectorys::hayInterseccion::CHECKS::'+evasor.device+'::'+evadido.device+'::EVADIDO_STATIC::BEARINBDev::'+bearingEvadido_Evasor+'::EVASOR_BEARING::'+evasor.bearing+'::ANGLE::'+angle);
                        let evasionPoint = self.getLatLonFromCoordinatesBearingAngle(point2Evasor.latitude, point2Evasor.longitude, angle, LATERAL_EVASION_DISTANCE);
                        let newAltitude = point2Evasor.altitude;
                        if(point1Evasor.altitude > point2Evadido.altitude || (Math.abs(point1Evasor.altitude - point2Evadido.altitude) <= 1))
                            newAltitude = evasor.gpsData.altitude + HEIGHT_EVASION_DISTANCE;//newAltitude = point2Evasor.altitude + HEIGHT_EVASION_DISTANCE;
                        else
                            newAltitude = evasor.gpsData.altitude;
                        resolve({
                            message: 'Evasion',
                            latitude: evasionPoint.latitude,
                            longitude: evasionPoint.longitude,
                            altitude: newAltitude
                        });
                    } else {
                        //Entramos si ambos están en movimiento
                        //Primero calculamos los puntos que forman el triangulo
                        let first = self.calculateTriangle(evasor, point2Evasor, ANGLE_SEPARATION);
                        let second = self.calculateTriangle(evadido, point2Evadido, ANGLE_SEPARATION);
                        self.logger.log('info', 'checkCrossTrajectorys::hayInterseccion::CHECKS::EVASOR::'+evasor.device+'::EVADIDO::'+evadido.device+
                        '::MOVEMENT_2::EVASOR_BEARING::'+evasor.bearing+'::EVADIDO_BEARING::'+evadido.bearing+
                        '::EVASOR_DISTANCE::'+evasor.radius+'::EVADIDO_DISTANCE::'+evadido.radius+
                        '::EVADE?::'+self.checkIfTriangleIntersection(first.p1, first.q1, first.r1, second.p1, second.q1, second.r1));
                        if(self.checkIfTriangleIntersection(first.p1, first.q1, first.r1, second.p1, second.q1, second.r1)) {
                            let bearingEvasor_Evadido = self.getBearingBetween2Coordinates(
                                point2Evasor.latitude, point2Evasor.longitude, 
                                point2Evadido.latitude, point2Evadido.longitude
                            );
                            //Ahora el ángulo de evasión
                            let angle = self.getEvadingAngle(evadido.bearing, bearingEvasor_Evadido);
                            let evasionPoint = self.getLatLonFromCoordinatesBearingAngle(point2Evasor.latitude, point2Evasor.longitude, angle, LATERAL_EVASION_DISTANCE);
                            let newAltitude = point2Evasor.altitude;
                            if(point2Evasor.altitude > point2Evadido.altitude || (Math.abs(point2Evasor.altitude - point2Evadido.altitude) <= 1))
                                newAltitude = evasor.gpsData.altitude + HEIGHT_EVASION_DISTANCE;//newAltitude = point2Evasor.altitude + HEIGHT_EVASION_DISTANCE;
                            else 
                                newAltitude = evasor.gpsData.altitude;
                            resolve({
                                message: 'Evasion',
                                latitude: evasionPoint.latitude,
                                longitude: evasionPoint.longitude,
                                altitude: newAltitude
                            });
                        } else {
                            resolve(false);
                        }
                    }
                } else {
                    resolve(false);
                }
            } catch (e) {
                self.logger.log('error', 'CHECKS::'+(e.message))
                reject(e.message);
            }
        });
    }

    //Comprueba si dos triangulos intersectan
  checkIfTriangleIntersection(p1, q1, r1, p2, q2, r2) {
    let firstTriangle = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [p1.longitude, p1.latitude],
            [q1.longitude, q1.latitude],
            [r1.longitude, r1.latitude],
            [p1.longitude, p1.latitude]
          ]
        ]
      }
    };
    let secondTriangle = {
      "type": "Feature",
      "properties": {},
      "geometry": {
        "type": "Polygon",
        "coordinates": [
          [
            [p2.longitude, p2.latitude],
            [q2.longitude, q2.latitude],
            [r2.longitude, r2.latitude],
            [p2.longitude, p2.latitude]
          ]
        ]
      }
    };

    return trgIntersect.default(firstTriangle, secondTriangle);
}


    //Devuelve el bearing entre dos coordenadas
    getBearingBetween2Coordinates(lat1, lng1, lat2, lng2) {
        const self = this;
        const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
        const x = (Math.cos(lat1) * Math.sin(lat2)) - 
                (Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1));
        const theta = Math.atan2(y, x);
        return (self.rad2deg(theta) + 360) % 360;
    }

    //Devuelve el ángulo al que evadir
    getEvadingAngle(bearingEvadido, bearingBetweenDevices) {
        const self = this;
        if(isNaN(bearingEvadido) || isNaN(bearingBetweenDevices))
        return null;
        let bearingBetweenDevicesPlus90 = (bearingBetweenDevices + 90)%360;
        let bearingBetweenDevicesMinus90 = (bearingBetweenDevices - 90) % 360;
        return Math.max((bearingBetweenDevicesPlus90 - bearingEvadido)%360, (bearingBetweenDevicesMinus90 - bearingEvadido)%360)
    }

    //Dado un device, calcula su cono de movimiento
    calculateTriangle(device, initPoint, sepAngle) {
        const self = this;
        let supPoint = self.getLatLonFromCoordinatesBearingAngle(initPoint.latitude, initPoint.longitude, device.bearing + sepAngle, device.radius);
        let infPoint = self.getLatLonFromCoordinatesBearingAngle(initPoint.latitude, initPoint.longitude, device.bearing - sepAngle, device.radius);
        return {p1: supPoint, q1: initPoint, r1: infPoint};
    }

    //Devuelve una posición GPS basada en unas coordenadas, un ángulo y una distancia
    getLatLonFromCoordinatesBearingAngle(lat1, lng1, bearing, distance) {
        const self = this;
        const lat1R = self.deg2rad(lat1);
        const lng1R = self.deg2rad(lng1);
        const bearingR = self.deg2rad(bearing);

        const lat2R = Math.asin( (Math.sin(lat1R) * Math.cos(distance/EARTH_R)) + (Math.cos(lat1R) * Math.sin(distance/EARTH_R) * Math.cos(bearingR)) );
        const lng2R = lng1R + Math.atan2((Math.sin(bearingR) * Math.sin(distance/EARTH_R) * Math.cos(lat1R)), (Math.cos(distance/EARTH_R) - (Math.sin(lat1R) * Math.sin(lat2R)) ));
        return {latitude: parseFloat(self.rad2deg(lat2R).toFixed(7)), longitude: parseFloat(self.rad2deg(lng2R).toFixed(7))};
    }

    rad2deg(rad) {
        return rad * (180/Math.PI);
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    convertPoints2LatLng(point) {
        return { latitude: point.x || 0, longitude: point.y || 0, altitude: point.z || 0 };
    }

    convertLatLng2Points(point) {
        return { x: point.latitude || 0, y: point.longitude || 0, z: point.altitude || 0 };
    }

    toMetres(value) {
        return value*1000;
    }

    toKilometres(value) {
        return value/1000;
    }

    /******************************************************************************/
    /* FUNCIONES ASOCIADAS A LA EJECUCIÓN DE MISIONES AUTOMÁTICAS                 */
    /******************************************************************************/

    getDevicesInList(list) {
        const self = this;
        return new Promise( (resolve, reject) => {
            try {
                resolve(self.arrayMap.filter(function(e) {
                    return this.indexOf(e.device) >= 0;
                }, list));
            } catch (e) {
                reject(e.message);
            }
        });
    }

    //Devuelve la distancia entre dos coordenadas gps
    getDistanceFromLatLon(lat1, lon1, lat2, lon2) {
        const self = this;
        let dLat = self.deg2rad(lat2-lat1);
        let dLon = self.deg2rad(lon2-lon1);
        let a =
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(self.deg2rad(lat1)) * Math.cos(self.deg2rad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
        let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return EARTH_R * c; // Distance in m
    }

    createExecProcess(mission, devicesId, numLaps) {
        const self = this;
        return new Promise( (resolve, reject) => {
          try {
            let arrayResponses = [];
            self.translateMps(mission.structPoints)
            .then(missionPoints => {
                self.asyncLoopMenor(0, devicesId.length, (loop) => {
                    let i = loop.iteration();
                    let msgBody = {
                        message: 'automatic-mission',
                        mission_id: mission.id,
                        mission: missionPoints,
                        num_laps: parseInt(numLaps),
                        init_waypoint: 1,
                        current_waypoint: 0,
                        user: 'ALBERTO',
                        final_action: 'RTL',
                        end_waypoint: missionPoints.length,
                        approach_altitude: 0
                    };
                    let packet = self.createServerPacket(devicesId[i], self.mySelf, 'automatic-mission', msgBody);
                    console.log(JSON.stringify(packet))
                    self.sendRemoteRabbit(packet, 'command')
                    .then(resStart => {
                        arrayResponses.push({droneId: devicesId[i], error: 'ERR_NOERROR'});
                        loop.next();
                    })
                    .catch(err => {
                        arrayResponses.push({droneId: devicesId[i], error: err.message || err});
                        loop.next();
                    });
                }, (err) => {
                    resolve(arrayResponses);
                });
            })
            .catch(err => {
                self.logger.log('error', 'createExecProcess::translateMps::'+JSON.stringify(err.message || err));
                reject(err);
            });
          } catch (e) {
            reject(e.message);
          }
        });
    }
    
    translateMps(points) {
        const self = this;
        return new Promise( (resolve, reject) => {
            try {
                let missionPoints = [];
                self.asyncLoopMenor(0, points.length, loop => {
                    let elem = points[loop.iteration()];
                    let mp = {
                        type: "waypoint",
                        latitude: elem.lat,
                        longitude: elem.lon,
                        altitude: elem.alt,
                        speed: 7,
                        heading: null
                    };
                    missionPoints.push(mp);
                    loop.next();
                }, err => {
                    if(err)
                        reject(err);
                    else
                        resolve(missionPoints);
                })
            } catch (error) {
                reject(error);
            }
        });
    }

    /******************************************************************************/
    /* LOOPS ASINCRONOS                                                           */
    /******************************************************************************/
    asyncLoopMenor(inicio, iterations, func, callback) {
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

    /******************************************************************************/
    /* GESTIÓN DE MENSAJES                                                        */
    /******************************************************************************/
    
    //Crea un mensaje tipo que se queda en el server
    createServerPacket (target, source, action, body) {
        if(!body["cmd_id"])
            body["cmd_id"] = action+'_'+(new Date().getTime());
        let packet = {
            'target': target,
            'id': source,
            'action': action,
            'args': body
        };
        return packet;
    }

    //Envía el mensaje al broker de Rabbit
    sendRemoteRabbit(data, cola) {
        const self = this;
        return new Promise( (resolve, reject) => {
            if(typeof cola === 'string') {
                self.rabbit.publishMessage(data.target, cola, data)
                .then(ok => resolve(true))
                .catch(err => reject(err));
            } else {
                reject('ERR_BAD_TYPE_QUEUE');
            }
        });
    }


    //Envía mensaje síncrono
    sendSyncMessage(target, routingKey, message, elapsedTime) {
    const self = this;
        return new Promise( (resolve, reject) => {
            let timer = TIMEOUT;
            if(elapsedTime && (!isNaN(elapsedTime)) && (parseInt(elapsedTime) > TIMEOUT))
                timer = elapsedTime;
            self.rabbit.sendMessageSynco(target, routingKey, message, self.routingFunction, {resolve: resolve, reject: reject, timeout: timer})
            .then(ok => {

            })
            .catch(err => reject(err));
        });
    }

    routingFunction(params) {
        try {
            if(params && (typeof params.resolve === 'function') ) {
                let data;
                if(typeof params.msg === 'string')
                    data = JSON.parse(params.msg);
                else if(typeof params.msg === 'object')
                    data = params.msg
                else
                    throw new Error('ERR_BAD_MSG_FORMAT');
                params.resolve(data);
            }
        } catch (e) {
            params.reject(e);
        }
    }

}

module.exports = FleetManager;
