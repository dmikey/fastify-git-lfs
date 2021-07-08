"use strict";
var jwt = require("jsonwebtoken");
var config = require("config");
var { Store } = require("../store");

const store = Store.getStore(
  config.get("store.type"),
  config.get("store.options")
);

export default function (fastify: any) {
  fastify.put("/:user/:repo/objects/:oid", async function (req: any, res: any) {
    checkJWT("upload")(req, res);
    if (req.body) {
      await store.put(req.params.user, req.params.repo, req.params.oid, req);
    }
    res.code(200).send();
  });

  fastify.get(
    "/:user/:repo/objects/:oid",
    async function (req: any, res: any, next: any) {
      checkJWT("download")(req, res);
      var size: any = await store.getSize(
        req.params.user,
        req.params.repo,
        req.params.oid
      );
      if (size < 0) {
        return res.sendStatus(404);
      }
      res.set("Content-Length", size);
      var dataStream: any = await store.get(
        req.params.user,
        req.params.repo,
        req.params.oid
      );
      dataStream.pipe(res);
    }
  );
}

var checkJWT = function (action: any) {
  const JWT_CONFIG = config.get("jwt");
  return async function (req: any, res: any) {
    let user = req.params.user;
    let repo = req.params.repo;
    let oid = req.params.oid;

    let authorization = req.header("Authorization");

    if (!authorization || !authorization.startsWith("JWT ")) {
      return res.status(401).end();
    }

    authorization = authorization.substring(4, authorization.length);
    try {
      var decoded = jwt.verify(authorization, JWT_CONFIG.secret, {
        issuer: JWT_CONFIG.issuer,
      });
      if (
        decoded.action != action ||
        decoded.user != user ||
        decoded.repo != repo ||
        (decoded.oid && decoded.oid != oid)
      ) {
        return res.status(403).end();
      }
    } catch (err) {
      // Any JWT error is considered as Forbidden
      return res.status(403).end();
    }
  };
};
