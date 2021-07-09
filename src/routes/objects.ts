"use strict";
import jwt from "jsonwebtoken";
import config from "config";
import { Store } from "../store";

const store = Store.getStore(
  config.get("store.type"),
  config.get("store.options")
);

export default function (fastify: any) {
  fastify.put("/:user/:repo/objects/:oid", function (req: any, res: any) {
    const jwtVerify = checkJWT("upload");

    if (req.body) {
      (async () => {
        await jwtVerify(req, res);
        await store.put(req.params.user, req.params.repo, req.params.oid, req);
        res.code(200).send();
      })();
    }
  });

  fastify.get(
    "/:user/:repo/objects/:oid/meta",
    async function (req: any, res: any) {
      res
        .code(200)
        .send(
          await store.getMeta(req.params.user, req.params.repo, req.params.oid)
        );
    }
  );

  fastify.get("/:user/:repo/objects/:oid", async function (req: any, res: any) {
    // const jwtVerify = checkJWT("download");
    // await jwtVerify(req, res);
    const size: any = await store.getSize(
      req.params.user,
      req.params.repo,
      req.params.oid
    );
    if (size < 0) {
      res.code(404).send();
    }
    res.headers("Content-Length", size);
    const dataStream: any = await store.get(
      req.params.user,
      req.params.repo,
      req.params.oid
    );
    res.type(dataStream.fileType.mime);
    res.code(200).send(dataStream.fileData);
  });
}

const checkJWT = function (action: any) {
  const JWT_CONFIG: any = config.get("jwt");
  return async function (req: any, res: any) {
    const user = req.params.user;
    const repo = req.params.repo;
    const oid = req.params.oid;

    let authorization = req.headers["authorization"];

    if (!authorization || !authorization.startsWith("JWT ")) {
      res.status(401).send();
    }

    authorization = authorization.substring(4, authorization.length);
    try {
      const decoded: any = jwt.verify(authorization, JWT_CONFIG.secret, {
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
