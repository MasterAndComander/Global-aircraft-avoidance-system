'use strict';
const Vec2 = require('./Vec2.js');
const Cell = require('./Cell.js');

class Quadtree {
  /** @description Constructor del árbol, incluye el primer nodo (esquina inferior izquierda)
   * @param {JSON} position JSON formado tipo { x: Number, y: Number}, ha de ser la esquina inferior izquierda
   * @param {JSON} size JSON formado tipo { x: Number, y: Number}, tamaño de la estructura
   * @param {number} accuracy Grado de precisión requerido
   * @return {Quadtree} Devuelve el objeto creado
   */
  constructor(position, size, accuracy) {
    const self = this;
    self.maxDistance = Math.max(size.x, size.y);
    self.accuracy = accuracy || 0;
    self.MaxLevel = 8;
    self.root = new Cell(this, position, size, 0, self.MaxLevel);
  }

  //Quadtree.MaxLevel = 8;

  //PUBLIC FUNCTIONS

  /** @description Añade una posición a la estructura
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {JSON} data JSON para almacenar información adicional
   */
  add (p, data) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    self.root.add(p, data);
  };

  /** @description Busca y devuelve el punto pasado como parámetro, null si no esta
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @return {Vec2} Devuelve el punto pasado como parámetro o null
   */
  has (p) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    return self.root.has(p);
  };

  /** @description Busca y borra el punto pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @return {Boolean} Devuelve true si lo borra, false en sentido contrario
   */
  delete (p) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    return self.root.delete(p);
  };

  /** @description Busca el punto más cercano al pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {JSON} options JSON con parámetros { includeData: Boolean, maxDist: Boolean, notSelf: Boolean}
   * @return {JSON} Devuelve el punto y su metaData
   */
  findNearestPoint (p, options) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    options.includeData = options.includeData ? options.includeData : false;
    options.bestDist = options.maxDist ? options.maxDist : Infinity;
    options.notSelf = options.notSelf ? options.notSelf : false;

    var result = self.root.findNearestPoint(p, options);
    if (result) {
      if (options.includeData)
        return result;
      else
        return result.point;
    } else
      return null;
  };

  /** @description Busca los puntos que se encuentran a una distancia dada del punto pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {number} r Radio de búsqueda
   * @param {JSON} options JSON con parámetros { includeData: Boolean, notSelf: Boolean}
   * @return {Array} Devuelve los puntos y su metaData
   */
  findNearbyPoints (p, r, options) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    options = options || { };
    var result = { points: [], data: [] };
    self.root.findNearbyPoints(p, r, result, options);
    return result;
  };

  /** @description Busca los puntos que se encuentran a una distancia dada del punto pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {number} r Radio de búsqueda en metros
   * @param {JSON} options JSON con parámetros { includeData: Boolean, notSelf: Boolean}
   * @return {Array} Devuelve los puntos y su metaData
   */
  findNearbyPointsFromRadius (p, r, options) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    options = options || { };
    var result = { points: [], data: [] };
    self.root.findNearbyPointsFromRadius(p, r, result, options);
    return result;
  };

  /** @description Busca los puntos que se encuentran a una distancia dada para un
   *  árbol formado por coordenadas GPS
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {number} r Radio de búsqueda (metros)
   * @param {JSON} options JSON con parámetros { includeData: Boolean, notSelf: Boolean}
   * @return {Array} Devuelve los puntos y su metaData
   */
  findNearCoordinatesbyPoints (p, r, options) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    var rCoords = r / 100000;
    options = options || { };
    var result = { points: [], data: [] };
    self.root.findNearCoordinatesbyPoints(p, r, rCoords, result, options);
    return result;
  };

  /** @description Busca todos los nodos presentes en un nivel
   * @param {number} level Nivel en el que se desea buscar
   * @return {Array} Devuelve los puntos y su metaData
   */
  getAllCellsAtLevel (cell, level, result) {
    const self = this;
    if (typeof level == 'undefined') {
      level = cell;
      cell = self.root;
    }
    result = result || [];
    if (cell.level == level) {
      if (cell.points.length > 0) {
        result.push(cell);
      }
      return result;
    } else {
      cell.children.forEach(function (child) {
        self.getAllCellsAtLevel(child, level, result);
      }.bind(self));
      return result;
    }
  };

}

module.exports = Quadtree;
