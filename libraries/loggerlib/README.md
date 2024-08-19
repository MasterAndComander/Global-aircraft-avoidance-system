# Logger
Librería para los logs que se encarga de almacenarlos en fichero y/o mostrarlos por consola

## Constructor (dirName, logName)
*dirName*: **{String}** Directorio donde se almacenan los ficheros de logs. Siempre será /home/$USER/{dirName}/

*logName*: **{String}** Palabra clave para poder filtrar logs.


## Inicializador (debugMode) (Devuelve una promesa, debe hacerse al principio del todo)
*debugMode*: **{Boolean}** Si esta a 'true', los logs se muestran también por el terminal, en caso contrario se escriben en el fichero unicamente.


## Niveles de log
Se han definido 4 niveles de log, en base a su estado:

*info*: Log del tipo informativo, se mostrará en azul en la terminal.

*success*: Log del tipo acierto, se mostrará en verde en la terminal.

*warn*: Log del tipo aviso, se mostrará en amarillo en la terminal.

*error*: Log del tipo error, se mostrará en rojo en la terminal.


## Forma de uso

Un ejemplo de uso sería:

```javascript
const loggerJs = require('/home/<user>/logger-js/index.js');
const logger = new loggerJs('log', 'TestNode');

logger.init(true)
.then(ok => {
    logger.log('info', 'Escribo al log una notificación');
    logger.log('warn', 'Escribo al log un aviso');
    logger.log('success', 'Escribo al log algo que sucedió correctamente');
    logger.log('error', 'Escribo al log un error');
})
.catch(err => {
    //Si sale por aquí es porque no se pudo crear el directorio
});


```
### Para visualizar los logs por terminal, se debe poner la variable debugMode a true
 **PM2**

  pm2 start /home/@userName/TestNode/main.js --name TestNode -- '{"debugMode": true}'

 **Terminal**
 
  args='{"debugMode":true}' nodemon main.js

