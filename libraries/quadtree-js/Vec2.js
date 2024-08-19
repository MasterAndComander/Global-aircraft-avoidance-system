'use strict';
const R = 6371000; // Radius of the earth in m

class Vec2 {

  /** @description Constructor: acepta JSON, dos Number o nada.
   * @param {number} x Coordenada x
   * @param {number} y Coordenada y
   * @return {Vec2} Devuelve el objeto creado
   */
  constructor (x, y) {
    if(typeof x === 'object') {
      this.x = x.x != null ? x.x : 0;
      this.y = x.y != null ? x.y : 0;
    } else {
      this.x = x != null ? x : 0;
      this.y = y != null ? y : 0;
    }
  }

  //PRIVATE FUNCTIONS
  /** @description Devuelve la distancia haversine dadas coordenadas gps
   * @param {number} lat1 latitud del punto 1
   * @param {number} lon1 longitud del punto 1
   * @param {number} lat2 latitud del punto 2
   * @param {number} lon2 longitud del punto 2
   * @return {number} Devuelve la distancia
   */
   getDistanceFromLatLon (lat1, lon1, lat2, lon2) {
    const self = this;
    let dLat = self.deg2rad(lat2-lat1);
    let dLon = self.deg2rad(lon2-lon1);
    let a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(self.deg2rad(lat1)) * Math.cos(self.deg2rad(lat2)) *
      Math.sin(dLon/2) * Math.sin(dLon/2)
      ;
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let d = R * c; // Distance in m
    return d;
  }

  /** @description Convierte grados a radianes
   * @param {number} deg Grados a convertir
   * @return {number} Devuelve la conversion a radianes
   */
  deg2rad(deg) {
    return deg * (Math.PI/180)
  }

  //PUBLIC FUNCTIONS

  /** @description Crea un nuevo vector
   * @param {number} x Coordenada x
   * @param {number} y Coordenada y
   * @return {Vec2} Devuelve el objeto creado
   */
  create (x, y) {
    return new Vec2(x, y);
  };

  /** @description Crea un nuevo vector desde un array
   * @param {Array} a Array formado por dos números
   * @return {Vec2} Devuelve el objeto creado
   */
  fromArray (a) {
    return new Vec2(a[0], a[1]);
  }

  /** @description Crea un nuevo vector a partir de un angulo y una distancia
   * @param {number} angle Ángulo
   * @param {number} dist Distancia
   * @return {Vec2} Devuelve el objeto creado
   */
  fromDirection (angle, dist) {
    return new Vec2().setDirection(angle, dist);
  }

  /** @description Actualiza los valores del vector
   * @param {number} x Coordenada x
   * @param {number} y Coordenada y
   * @return {Vec2} Devuelve el objeto creado
   */
  set (x, y) {
    this.x = x;
    this.y = y;
    return this;
  };

  /** @description Actualiza los valores del vector a partir de otro vector
   * @param {number} x Coordenada x
   * @param {number} y Coordenada y
   * @return {Vec2} Devuelve el objeto creado
   */
  setVec2 (v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  };

  /** @description Actualiza el vector a partir de un angulo y una distancia
   * @param {number} angle Ángulo
   * @param {number} dist Distancia
   * @return {Vec2} Devuelve el objeto creado
   */
  setDirection (angle, dist) {
    dist = dist || 1;

    this.x = dist * Math.cos(angle / 360 * Math.PI * 2);
    this.y = dist * Math.sin(angle / 360 * Math.PI * 2);

    return this;
  };

  /** @description Compara el vector con el pasado como parámetro
   * @param {Vec2} v Vector a comparar
   * @param {number} tolerance Nivel de tolerancia de la igualdad
   * @return {Boolean} Devuelve true si son iguales
   */
  equals (v, tolerance) {
    if (tolerance == null) {
      tolerance = 0.0000001;
    }
    return (Math.abs(v.x - this.x) <= tolerance) && (Math.abs(v.y - this.y) <= tolerance);
  };

  /** @description Suma el vector pasado como parámetro
   * @param {Vec2} v Vector a comparar
   * @return {Vec2} Devuelve el nuevo vector
   */
  add (v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  };

  /** @description Resta el vector pasado como parámetro
   * @param {Vec2} v Vector a comparar
   * @return {Vec2} Devuelve el nuevo vector
   */
  sub (v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  };

  /** @description Escala el vector pasado como parámetro
   * @param {Vec2} v Vector a comparar
   * @return {Vec2} Devuelve el nuevo vector
   */
  scale (f) {
    this.x *= f;
    this.y *= f;
    return this;
  };

  /** @description Mide la distancia entre los dos vectores
   * @param {Vec2} v Vector a comparar
   * @return {number} Devuelve la distancia
   */
  distance (v) {
    let dx = v.x - this.x;
    let dy = v.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  /** @description Mide la distancia haversine entre los dos vectores (Coordenadas GPS)
   * @param {Vec2} v Vector a comparar
   * @return {number} Devuelve la distancia
   */
  distanceFromLatLng (v) {
    const self = this;
    return self.getDistanceFromLatLon(this.x, this.y, v.x, v.y);
  }

  /** @description Mide la distancia al cuadrado entre los dos vectores
   * @param {Vec2} v Vector a comparar
   * @return {number} Devuelve la distancia
   */
  squareDistance (v) {
    let dx = v.x - this.x;
    let dy = v.y - this.y;
    return dx * dx + dy * dy;
  };

  /** @description Mide la distancia entre los dos vectores por el eje más corto
   * @param {Vec2} v Vector a comparar
   * @return {number} Devuelve la distancia
   */
  simpleDistance (v) {
    let dx = Math.abs(v.x - this.x);
    let dy = Math.abs(v.y - this.y);
    return Math.min(dx, dy);
  };

  /** @description Devuelve una copia del vector
   * @param {Vec2} v Vector a copiar
   * @return {Vec2} Devuelve el nuevo vector
   */
  copy (v) {
    this.x = v.x;
    this.y = v.y;
    return this;
  };

  /** @description Clona el vector actual
   * @return {Vec2} Devuelve el nuevo vector
   */
  clone () {
    return new Vec2(this.x, this.y);
  };

  /** @description Calcula el producto con el punto pasado
   * @param {Vec2} b Vector
   * @return {Vec2} Devuelve el nuevo vector
   */
  dot (b) {
    return this.x * b.x + this.y * b.y;
  };

  /** @description Suma dos vectores y lo añade al actual
   * @param {Vec2} a Vector
   * @param {Vec2} b Vector
   * @return {Vec2} Devuelve el nuevo vector
   */
  asAdd (a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
    return this;
  };

  /** @description Resta dos vectores y lo añade al actual
   * @param {Vec2} a Vector
   * @param {Vec2} b Vector
   * @return {Vec2} Devuelve el nuevo vector
   */
  asSub (a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    return this;
  };

  /** @description Escala dos vectores y lo añade al actual
   * @param {Vec2} a Vector
   * @param {Vec2} f Vector
   * @return {Vec2} Devuelve el nuevo vector
   */
  addScaled (a, f) {
    this.x += a.x * f;
    this.y += a.y * f;
    return this;
  };

  /** @description Devuelve la dirección del vector
   * @return {number} Devuelve la dirección
   */
  direction () {
    let rad = Math.atan2(this.y, this.x);
    let deg = rad * 180 / Math.PI;
    if (deg < 0) deg = 360 + deg;

    return deg;
  };

  /** @description Devuelve la longitud del vector
   * @return {number} Devuelve la longitud
   */
  length () {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  /** @description Devuelve la longitud cuadrada del vector
   * @return {number} Devuelve la longitud
   */
  lengthSquared () {
    return this.x * this.x + this.y * this.y;
  };

  /** @description Normaliza el vector, lo ajusta a 1
   * @return {Vec2} Devuelve el nuevo vector
   */
  normalize () {
    let len = this.length();
    if (len > 0) {
      this.scale(1 / len);
    }
    return this;
  };

  /** @description Devuelve el vector en String
   * @return {String} Devuelve la cadena de texto
   */
  toString () {
    return "{" + Math.floor(this.x*1000)/1000 + ", " + Math.floor(this.y*1000)/1000 + "}";
  };

  /** @description Devuelve el vector hasheado
   * @return {number} Devuelve el hash del vector
   */
  hash () {
    return 1 * this.x + 12 * this.y;
  };

}


module.exports = Vec2;
