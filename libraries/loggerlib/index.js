'use strict';

const path = require('path');
const Promise = require('bluebird');
const fs = require('fs');
const log4js = require('log4js');

const FILE_SIZE = 41943040;
const MAX_FILES = 20;

class Logger {
  constructor (dirName, logName) {
    const self = this;
    self.dirName = dirName;
    self.logName = logName;
  }

  init (debugMode) {
    const self = this;
    return new Promise( (resolve, reject) => {
      fs.mkdir(path.join(process.env.HOME, self.dirName), (err) => {
        if(err && err.code!='EEXIST') {
          reject(err);
        } else {
          let losAppenders = ['onFile'];
          if(debugMode == true || debugMode == 'true')
            losAppenders.push('onTerminal');
          log4js.configure({
            levels: {
              success: {value: 1, colour: 'green'},
              info: {value: 2, colour: 'blue'},
              warn: {value: 3, colour: 'yellow'},
              error: {value: 4, colour: 'red'}
            },
            pm2: true,
            appenders: {
              onFile: {
                type: 'fileSync',
                filename: path.join(process.env.HOME, self.dirName, 'system.log'),
                maxLogSize: FILE_SIZE,
                backups: MAX_FILES,
                layout: { type: 'basic' }
              },
              onTerminal: {
                type: 'stdout',
                layout: { type: 'coloured' }
              }
            },
            categories: {
              default: { appenders: losAppenders, level: 'success' }
            }
          });
          self.logger = log4js.getLogger(self.logName);
          resolve();
        }
      });
    })
  }

  log (level, msg) {
    const self = this;
    if(level.toLowerCase() == 'info') {
      self.logger.info(msg);
    } else if (level.toLowerCase() == 'error') {
      self.logger.error(msg);
    } else if (level.toLowerCase() == 'warn') {
      self.logger.warn(msg);
    } else if (level.toLowerCase() == 'success') {
      self.logger.success(msg);
    }
  }
}

module.exports = Logger;
