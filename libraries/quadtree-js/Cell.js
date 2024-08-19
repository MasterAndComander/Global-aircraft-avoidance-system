'use strict';
const Vec2 = require('./Vec2.js');

class Cell {
  /** @description Constructor de los nodos del árbol
   * @param {Quadtree} tree Árbol del que cuelga
   * @param {JSON} position JSON formado tipo { x: Number, y: Number}
   * @param {JSON} size JSON formado tipo { x: Number, y: Number}, tamaño de la subestructura
   * @param {number} level Nivel de la celda
   */
  constructor (tree, position, size, level, maxLevel) {
    const self = this;
    self.tree = tree;
    self.position = new Vec2(position);
    self.size = new Vec2(size);
    self.level = level;
    self.points = [];
    self.data = [];
    self.temp = new Vec2(); //temp vector for distance calculation
    self.children = [];
    self.maxLevel = maxLevel;
  }

  /** @description Busca y devuelve el punto pasado como parámetro, null si no esta
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @return {Vec2} Devuelve el punto pasado como parámetro o null
   */
  has (p) {
    const self = this;
    if (!self.contains(p))
      return null;
    if (self.children.length > 0) {
      for (var i = 0; i < self.children.length; i++) {
        var duplicate = self.children[i].has(p);
        if (duplicate) {
          return duplicate;
        }
      }
      return null;
    } else {
      var minDistSqrt = self.tree.accuracy * self.tree.accuracy;
      for (var i = 0; i < self.points.length; i++) {
        var o = self.points[i];
        var distSq = p.squareDistance(o);
        if (distSq <= minDistSqrt) {
          return o;
        }
      }
      return null;
    }
  };

  /** @description Busca y borra el punto pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @return {Boolean} Devuelve true si lo borra, false en sentido contrario
   */
  delete (p) {
    const self = this;
    if (!self.contains(p))
      return null;
    if (self.children.length > 0) {
      for (var i = 0; i < self.children.length; i++) {
        var duplicate = self.children[i].delete(p);
        if (duplicate) {
          return duplicate;
        }
      }
      return null;
    } else {
      var minDistSqrt = self.tree.accuracy * self.tree.accuracy;
      for (var i = 0; i < self.points.length; i++) {
        var o = self.points[i];
        var distSq = p.squareDistance(o);
        if (distSq <= minDistSqrt) {
          self.points.splice(i, 1);
          self.data.splice(i, 1);
          return true;
        }
      }
      return null;
    }
  };

  /** @description Añade una posición a la estructura
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {JSON} data JSON para almacenar información adicional
   */
  add (p, data) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    if (self.children.length > 0) {
      self.addToChildren(p, data);
    } else {
      self.points.push(p);
      self.data.push(data);
      if (self.points.length > 1 && self.level < self.maxLevel) {
        self.split(Array.from(self.points), Array.from(self.data));
        self.points = []; self.data = [];
      }
    }
  };

  /** @description Añade una posición a los hijos
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {JSON} data JSON para almacenar información adicional
   */
  addToChildren (p, data) {
    const self = this;
    for (let i = 0; i < self.children.length; i++) {
      if (self.children[i].contains(p)) {
        self.children[i].add(p, data);
        break;
      }
    }
  };

  /** @description Mira si un punto esta contenido en una estructura
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @return {Boolean} Devuelte true si el elemento esta contendio
   */
  contains (p) {
    const self = this;
    return p.x >= self.position.x - self.tree.accuracy
        && p.y >= self.position.y - self.tree.accuracy
        && p.x < self.position.x + self.size.x + self.tree.accuracy
        && p.y < self.position.y + self.size.y + self.tree.accuracy;
  };

  /** @description Crea los nuevos hijos de un nodo hoja
   * @param {Array} points Puntos que formarán parte de los nuevos nodos hoja que se creen
   * @param {Array} data Array con los JSON para almacenar información adicional
   */
  split (points, data) {
    const self = this;
    var x = self.position.x;
    var y = self.position.y;
    var w2 = self.size.x / 2;
    var h2 = self.size.y / 2;
    self.children.push(new Cell(self.tree, new Vec2(x, y), new Vec2(w2, h2), self.level + 1, self.maxLevel));
    self.children.push(new Cell(self.tree, new Vec2(x + w2, y), new Vec2(w2, h2), self.level + 1, self.maxLevel));
    self.children.push(new Cell(self.tree, new Vec2(x, y + h2), new Vec2(w2, h2), self.level + 1, self.maxLevel));
    self.children.push(new Cell(self.tree, new Vec2(x + w2, y + h2), new Vec2(w2, h2), self.level + 1, self.maxLevel));
    for (var i = 0; i < points.length; i++) {
      self.addToChildren(points[i], data[i]);
    }
  };

  /** @description Devuelve la distancia al centro de la estructura del punto pasado
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @return {Number} distancia al centro de la estructura
   */
  squareDistanceToCenter (p) {
    const self = this;
    var dx = p.x - (self.position.x + self.size.x / 2);
    var dy = p.y - (self.position.y + self.size.y / 2);
    return dx * dx + dy * dy;
  }

  /** @description Busca el punto más cercano al pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {JSON} options JSON con parámetros { includeData: Boolean, maxDist: Boolean, notSelf: Boolean}
   * @return {JSON} Devuelve el punto y su metaData
   */
  findNearestPoint (p, options) {
    const self = this;
    if(!(p instanceof Vec2))
      var p = new Vec2(p);
    let nearest = null;
    let nearestData = null;
    let bestDist = options.bestDist;
    if (self.points.length > 0 && self.children.length == 0) {
      for (let i = 0; i < self.points.length; i++) {
        let dist = self.points[i].distance(p);
        if (dist <= bestDist) {
          if (dist == 0 && options.notSelf)
            continue;
          bestDist = dist;
          nearest = self.points[i];
          nearestData = self.data[i];
        }
      }
    }

    let children = self.children
      .map(child => { return { child: child, dist: child.squareDistanceToCenter(p) } })
      .sort(function(a, b) { return a.dist - b.dist; })
      .map(c => { return c.child; });

    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        var child = children[i];
        if (p.x < child.position.x - bestDist || p.x > child.position.x + child.size.x + bestDist ||
            p.y < child.position.y - bestDist || p.y > child.position.y + child.size.y + bestDist
          ) {
          continue;
        }
        let childNearest = child.findNearestPoint(p, options);
        if (!childNearest || !childNearest.point) {
          continue;
        }
        let childNearestDist = childNearest.point.distance(p);
        if (childNearestDist < bestDist) {
          nearest = childNearest.point;
          bestDist = childNearestDist;
          nearestData = childNearest.data;
        }
      }
    }
    return {
      point: nearest,
      data: nearestData
    }
  };

  /** @description Busca los puntos que se encuentran a una distancia dada del punto pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {number} r Radio de búsqueda
   * @param {Array} result Puntos ya almacenados
   * @param {JSON} options JSON con parámetros { includeData: Boolean, notSelf: Boolean}
   */
  findNearbyPoints (point, r, result, options) {
    const self = this;
    let p = null;
    if(!(p instanceof Vec2))
      p = new Vec2(point);
    else
      p = point;
    if (self.points.length > 0 && self.children.length == 0) {
      for (let i = 0; i < self.points.length; i++) {
        var dist = self.points[i].distance(p);
        if (dist <= r) {
          if (dist == 0 && options.notSelf)
            continue;
          result.points.push(this.points[i]);
          if (options.includeData) result.data.push(this.data[i]);
        }
      }
    }

    let children = self.children;

    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        var child = children[i];
        if (p.x < child.position.x - r || p.x > child.position.x + child.size.x + r ||
            p.y < child.position.y - r || p.y > child.position.y + child.size.y + r
          ) {
          continue;
        }
        child.findNearbyPoints(p, r, result, options);
      }
    }
  };

  /** @description Busca los puntos que se encuentran a una distancia dada del punto pasado como parámetro
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {number} r Radio de búsqueda en metros
   * @param {Array} result Puntos ya almacenados
   * @param {JSON} options JSON con parámetros { includeData: Boolean, notSelf: Boolean}
   */
  findNearbyPointsFromRadius (point, r, result, options) {
    const self = this;
    let p = null;
    if(!(p instanceof Vec2))
      p = new Vec2(point);
    else
      p = point;
    if (self.points.length > 0 && self.children.length == 0) {
      for (let i = 0; i < self.points.length; i++) {
        var dist = self.points[i].distanceFromLatLng(p);
        if (dist <= r) {
          if (dist == 0 && options.notSelf)
            continue;
          result.points.push(this.points[i]);
          if (options.includeData) result.data.push(this.data[i]);
        }
      }
    }

    let children = self.children;

    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        var child = children[i];
        if (p.x < child.position.x - r || p.x > child.position.x + child.size.x + r ||
            p.y < child.position.y - r || p.y > child.position.y + child.size.y + r
          ) {
          continue;
        }
        child.findNearbyPointsFromRadius(p, r, result, options);
      }
    }
  };

  /** @description Busca los puntos que se encuentran a una distancia dada para un
   *  árbol formado por coordenadas GPS
   * @param {JSON} p JSON formado tipo { x: Number, y: Number}
   * @param {number} rMeters Radio de búsqueda (metros)
   * @param {number} rCoords Radio de búsqueda (rMeters / 100000)
   * @param {Array} result Puntos ya almacenados
   * @param {JSON} options JSON con parámetros { includeData: Boolean, notSelf: Boolean}
   */
  findNearCoordinatesbyPoints (point, rMetres, rCoords, result, options) {
    const self = this;
    let p = null;
    if(!(p instanceof Vec2))
      p = new Vec2(point);
    else
      p = point;
    if (self.points.length > 0 && self.children.length == 0) {
      for (let i = 0; i < self.points.length; i++) {
        let dist = self.points[i].distanceFromLatLng(p);
        if (dist <= rMetres) {
          if (dist == 0 && options.notSelf)
            continue;
          result.points.push(self.points[i]);
          if (options.includeData) result.data.push(self.data[i]);
        }
      }
    }

    let children = self.children;

    if (children.length > 0) {
      for (let i = 0; i < children.length; i++) {
        let child = children[i];
        if (p.x < child.position.x - rCoords || p.x > child.position.x + child.size.x + rCoords ||
            p.y < child.position.y - rCoords || p.y > child.position.y + child.size.y + rCoords
          ) {
          continue;
        }
        child.findNearCoordinatesbyPoints(p, rMetres, rCoords, result, options);
      }
    }
  };
}

module.exports = Cell;
