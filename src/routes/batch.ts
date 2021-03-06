"use strict";

import _ from "lodash";
import config from "config";
import { validate } from "jsonschema";

const { Store } = require("../store");

const STORE = Store.getStore(
  config.get("store.type"),
  config.get("store.options")
);

import BATCH_REQUEST_SCHEMA from "../../schemas/http-v1-batch-request-schema.json";

export default function (fastify: any) {
  /**
   * Process upload object
   *
   * @param {String} user
   * @param {String} repo
   * @param {Object} object
   * @returns {Object}
   */
  let handleUploadObject = async function (user: any, repo: any, object: any) {
    let oid = object.oid;
    let size = object.size;
    fastify.log.info({ msg: "handleUploadObject", oid, size, user, repo });
    return {
      oid: `${oid}`,
      size: size,
      actions: {
        upload: STORE.getUploadAction(user, repo, oid, size),

        // skipping verification of objects right now because a 422 on the client doesn't
        // prevent the commit from happening, a 200 response on upload confirms already
        // verify: STORE.getVerifyAction(user, repo, oid, size),
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
  let handleDownloadObject = async function (
    user: any,
    repo: any,
    object: any
  ) {
    let oid = object.oid;
    let size = object.size;
    fastify.log.info({ msg: "handleDownloadObject", oid, user, repo });
    let result: any = {
      oid: oid,
      size: size,
    };

    let exist = await STORE.exist(user, repo, oid);
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
  let handleVerifyObject = async function (user: any, repo: any, object: any) {
    let oid = object.oid;
    let size = object.size;
    fastify.log.info({ msg: "handleVerifyObject", oid, user, repo });
    return {
      oid: oid,
      size: size,
      actions: {
        verify: STORE.getVerifyAction(user, repo, oid, size),
      },
    };
  };

  fastify.post(
    "/:user/:repo/objects/batch",
    async function (req: any, res: any) {
      // validate request body according to JSON Schema
      try {
        let body = req.body;
        req.jsonBody = body;
        let valid = validate(body, BATCH_REQUEST_SCHEMA).valid;
        if (!valid) {
          let err: any = new Error();
          err.status = 422;
          throw err;
        }

        res.header("Content-Type", "application/vnd.git-lfs+json");

        let operation = body.operation;

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
        let response = {
          objects: results,
        };
        res.code(200).send(response);
      } catch (err) {
        throw err;
      }
    }
  );
}
