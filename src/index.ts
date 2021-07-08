#!/usr/bin/env node
import Fastify from "fastify";
import routeBatch from "./routes/batch";
import routeObjects from "./routes/objects";
import routeVerify from "./routes/verify";

async function build() {
  const fastify = Fastify({ logger: true });

  fastify.addContentTypeParser(
    [
      "application/vnd.git-lfs+json; charset=utf-8",
      "application/vnd.git-lfs+json",
    ],
    { parseAs: "buffer" },
    (req: any, body: any, done: any) => done(null, JSON.parse(body.toString()))
  );

  fastify.addContentTypeParser(
    /^image\/.*/,
    { parseAs: "buffer" },
    async (req: any, body: any, done: any) => {
      done(null, body);
    }
  );

  routeBatch(fastify);
  routeObjects(fastify);
  routeVerify(fastify);

  return fastify;
}

build()
  .then((fastify) => fastify.listen(3000))
  .catch(console.log);
