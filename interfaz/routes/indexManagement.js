module.exports = function (Manager) {

    const express = require('express');
    const router = express.Router();
    const fleetManager = process.env.FLEET_EXCHANGE;
    const missions = JSON.parse(process.env.MISSION_LIST.replace(/&quot;/g, '\"'))
  
    router.get('/', (req, res, next) => {
        res.redirect('/mapView');
    });
  
    router.get('/mapView', async (req, res, next) => {
      let page = 'mapView';
      res.render(page, {
        page: page, missions: missions, devices: process.env.DEVICEAGENT_LIST.split(' '),
        title: 'GAAS'
      });
    });

    router.post('/play', (req, res, next) => {
      let keys = Object.keys(req.body);
      if( keys.indexOf('devices') > -1 && keys.indexOf('missionId') > -1 
    ) {
          try {
              if(Array.isArray(req.body.devices) && req.body.devices.length > 0) {
                let mission = missions.find(elem => elem.id == req.body.missionId);
                if(mission) {
                  let erMsg = {
                      action: 'GenerateExecutionProcess', target: fleetManager,
                      args: {
                        mission: mission, finalAction: 'RTL',
                        devicesId: req.body.devices
                      }
                  };
                  Manager.sendMessage(fleetManager, 'messageSyncServer', erMsg)
                  .then(execRes => {
                      if(execRes.error == 'ERR_NOERROR')
                          res.status(200).json({ success: true, data: { result: execRes } });
                      else
                          res.status(200).json({ success: false, error: execRes.error });
                      })
                  .catch(err => {
                      res.status(200).json({ success: false, error: (err.error || err) });
                  });
              } else {
                  res.status(200).json({ success: false, error: 'Mission not found' });
              }
              } else {
                  res.status(200).json({ success: false, error: 'Any device must be selected' });
              }
          } catch (error) {
              res.status(200).json({ success: false, error: error.message || error });
          }
      } else {
          res.status(400).json({ success: false, error: 'ERR_BADPARAMS' });
      }
  });

  router.post('/stop', (req, res, next) => {
    let keys = Object.keys(req.body);
    if( keys.indexOf('missionId') > -1 ) {
        try {
          let erMsg = {
            action: 'CancelExecution', target: fleetManager,
            args: {
              missionId: req.body.missionId
            }
          };
          Manager.sendMessage(fleetManager, 'messageSyncServer', erMsg)
          .then(execRes => {
              if(execRes.error == 'ERR_NOERROR')
                  res.status(200).json({ success: true, data: { result: execRes } });
              else
                  res.status(200).json({ success: false, error: execRes.error });
              })
          .catch(err => {
              res.status(200).json({ success: false, error: (err.error || err) });
          });
        } catch (error) {
            res.status(200).json({ success: false, error: error.message || error });
        }
    } else {
        res.status(400).json({ success: false, error: 'ERR_BADPARAMS' });
    }
});
  
    return router;
  }
  