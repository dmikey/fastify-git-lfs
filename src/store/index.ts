"use strict";

var config = require("config");
var jwt = require("jsonwebtoken");
var ms = require("ms");

const BASE_URL = config.get("base_url");
const JWT_CONFIG = config.get("jwt");

/**
 * Abstract Store, should use subclass
 */
export class Store {
  static stores: any = {};
  /**
   * Register store
   *
   * @param {String} name, name of the store
   * @param {Store} store, class of the store
   */
  static registerStore(name: any, store: any) {
    this.stores[name] = store;
  }

  /**
   * Get registered store by name
   * @param {String} name
   * @param {Object} options, optional
   * @returns {Store} instance of store
   */
  static getStore(name: any, options: any) {
    return new this.stores[name](options);
  }

  /**
   * Save object
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @param {Stream} stream
   * @returns {Promise}
   */
  put(user: any, repo: any, oid: any, stream: any) {
    throw new Error("Can not use put from Store class");
  }

  /**
   * Download object
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @returns {Promise<Stream>}
   */
  get(user: any, repo: any, oid: any) {
    throw new Error("Can not use get from Store class");
  }

  /**
   * Download object
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @returns {Promise<Number>}
   */
  getSize(user: any, repo: any, oid: any) {
    throw new Error("Can not use getSize from Store class");
  }

  /**
   * Check object exist or not
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @returns {Promise<Boolean>}
   */
  exist(user: any, repo: any, oid: any) {
    return (this.getSize(user, repo, oid) as any).then(function (size: any) {
      return size > 0;
    });
  }

  /**
   * LFS Batch API upload action
   *
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @param {Number} size
   * @returns upload action
   */
  getUploadAction(user: any, repo: any, oid: any, size: any) {
    return {
      href: `${BASE_URL}${user}/${repo}/objects/${oid}`,
      expires_at: Store._getJWTExpireTime(),
      header: {
        Authorization:
          "JWT " + Store._generateJWTToken("upload", user, repo, oid),
      },
    };
  }

  /**
   * LFS Batch API download action
   *
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @param {Number} size
   * @returns download action
   */
  getDownloadAction(user: any, repo: any, oid: any, size: any) {
    return {
      href: `${BASE_URL}${user}/${repo}/objects/${oid}`,
      expires_at: Store._getJWTExpireTime(),
      header: {
        Authorization:
          "JWT " + Store._generateJWTToken("download", user, repo, oid),
      },
    };
  }

  /**
   * LFS Batch API verify action
   *
   * @param {String} user
   * @param {String} repo
   * @param {String} oid
   * @param {Number} size
   * @returns verify action
   */
  getVerifyAction(user: any, repo: any, oid: any, size: any) {
    return {
      href: `${BASE_URL}${user}/${repo}/objects/verify`,
      expires_at: Store._getJWTExpireTime(),
      header: {
        Authorization:
          "JWT " + (Store as any)._generateJWTToken("verify", user, repo),
      },
    };
  }

  /**
   * Create JWT token
   *
   * @param {String} action, can be 'download', 'upload' or 'verify'
   * @param {String} user
   * @param {String} repo
   * @param {String} [oid], empty for verify request
   */
  static _generateJWTToken(action: any, user: any, repo: any, oid: any) {
    var signObject = {
      user: user,
      repo: repo,
      action: action,
    };
    if (oid) {
      (signObject as any).oid = oid;
    }
    return jwt.sign(signObject, JWT_CONFIG.secret, {
      algorithm: JWT_CONFIG.algorithm,
      expiresIn: JWT_CONFIG.expiresIn,
      issuer: JWT_CONFIG.issuer,
    });
  }

  static _getJWTExpireTime() {
    return new Date(
      new Date().getTime() + ms(JWT_CONFIG.expiresIn)
    ).toISOString();
  }
}

Store.registerStore("siasky", require("./siasky_store").default);
