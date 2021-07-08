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
    const jwtVerify = checkJWT("upload");
    await jwtVerify(req, res);
    if (req.body) {
      await store.put(req.params.user, req.params.repo, req.params.oid, req);
      if (!res.sent) res.code(200).send();
    }
  });

  fastify.get("/:user/:repo/objects/:oid", async function (req: any, res: any) {
    const jwtVerify = checkJWT("download");
    await jwtVerify(req, res);
    var size: any = await store.getSize(
      req.params.user,
      req.params.repo,
      req.params.oid
    );
    if (size < 0) {
      res.code(404).send();
    }
    res.set("Content-Length", size);
    var dataStream: any = await store.get(
      req.params.user,
      req.params.repo,
      req.params.oid
    );
    dataStream.pipe(res);
  });
}

var checkJWT = function (action: any) {
  const JWT_CONFIG = config.get("jwt");
  return async function (req: any, res: any) {
    let user = req.params.user;
    let repo = req.params.repo;
    let oid = req.params.oid;

    let authorization = req.headers["authorization"];

    if (!authorization || !authorization.startsWith("JWT ")) {
      res.status(401).send();
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
        res.code(403).send();
      }
    } catch (err) {
      // Any JWT error is considered as Forbidden
      res.code(403).send();
    }
  };
};
