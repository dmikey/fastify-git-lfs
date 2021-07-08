"use strict";

var _ = require("lodash");
var config = require("config");
var validate = require("jsonschema").validate;

var { Store } = require("../store");

const STORE = Store.getStore(
  config.get("store.type"),
  config.get("store.options")
);

import BATCH_REQUEST_SCHEMA from "../../schemas/http-v1-batch-request-schema.json";

/**
 * Process upload object
 *
 * @param {String} user
 * @param {String} repo
 * @param {Object} object
 * @returns {Object}
 */
var handleUploadObject = async function (user: any, repo: any, object: any) {
  var oid = object.oid;
  var size = object.size;

  return {
    oid: `${oid}`,
    size: size,
    actions: {
      upload: STORE.getUploadAction(user, repo, oid, size),
      verify: STORE.getVerifyAction(user, repo, oid, size),
    },
  };
};

/**
 * Process download object
 *
 * @param {String} user
 * @param {String} repo
 * @param {Object} object
 * @returns {Object}
 */
var handleDownloadObject = async function (user: any, repo: any, object: any) {
  var oid = object.oid;
  var size = object.size;

  var result: any = {
    oid: oid,
    size: size,
  };

  var exist = await STORE.exist(user, repo, oid);
  if (exist) {
    result.actions = {
      download: STORE.getDownloadAction(user, repo, oid, size),
    };
  } else {
    result.error = {
      code: 404,
      message: "Object does not exist on the server",
    };
  }
  return result;
};

/**
 * Process verify object
 *
 * @param {String} user
 * @param {String} repo
 * @param {Object} object
 * @returns {Object}
 */
var handleVerifyObject = async function (user: any, repo: any, object: any) {
  var oid = object.oid;
  var size = object.size;

  return {
    oid: oid,
    size: size,
    actions: {
      verify: STORE.getVerifyAction(user, repo, oid, size),
    },
  };
};

export default function (fastify: any) {
  fastify.post(
    "/:user/:repo/objects/batch",
    async function (req: any, res: any, next: any) {
      // validate request body according to JSON Schema
      try {
        var body = req.body;
        req.jsonBody = body;
        var valid = validate(body, BATCH_REQUEST_SCHEMA).valid;
        if (!valid) {
          let err: any = new Error();
          err.status = 422;
          next(err);
        }

        res.header("Content-Type", "application/vnd.git-lfs+json");

        var body = req.jsonBody;
        var operation = body.operation;

        // validate operation
        if (
          operation !== "upload" &&
          operation !== "verify" &&
          operation !== "download"
        ) {
          return res.code(422).send();
        }

        let user = req.params.user;
        let repo = req.params.repo;

        // validate objects
        let objects = body.objects;
        let results;
        let func: any;
        let yields: any = [];

        switch (operation) {
          case "upload":
            func = handleUploadObject;
            break;
          case "download":
            func = handleDownloadObject;
            break;
          case "verify":
            func = handleVerifyObject;
            break;
        }

        _.forEach(objects, function (object: any) {
          yields.push(func(user, repo, object) as any);
        });

        results = await Promise.all(yields);
        var response = {
          objects: results,
        };
        res.code(200).send(response);
      } catch (err) {
        next(err);
      }
    }
  );
}
