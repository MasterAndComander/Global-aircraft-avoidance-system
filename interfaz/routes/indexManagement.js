module.exports = function (Manager) {

    const express = require('express');
    const router = express.Router();
    const fleetManager = process.env.FLEET_EXCHANGE;
  
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
                        numLaps: 1, initMp: 1,
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


    let missions = [
      {id: 1, name: 'Lineal 3', missionType: 'linear',
        structPoints: [
        {
          'type': 'waypoint',
          'lat': 36.74662682607213,
          'lon': -4.5539314358383365,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74711463511929,
          'lon': -4.553618091998146,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.747625755242055,
          'lon': -4.553790431110286,
          'alt': 20
        }
      ]},
      {id: 2, name: 'Perimetral', missionType: 'perimeter',
        structPoints: [
        {
          'type': 'waypoint',
          'lat': 36.74658737079311,
          'lon': -4.553846385367393,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74708594055534,
          'lon': -4.553512897994636,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74745896904987,
          'lon': -4.553685237106777,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74764906941206,
          'lon': -4.55405453520487,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74731190995604,
          'lon': -4.554390260747908,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74696936877832,
          'lon': -4.55462526862803,
          'alt': 20
        },
        {
          'type': 'waypoint',
          'lat': 36.74658737079311,
          'lon': -4.553846385367393,
          'alt': 20
        }
      ]}
    ]
  
    return router;
  }
  