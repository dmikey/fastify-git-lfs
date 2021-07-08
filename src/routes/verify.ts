var config = require("config");

var { Store } = require("../store");

const store = Store.getStore(
  config.get("store.type"),
  config.get("store.options")
);

export default function (app: any) {
  app.post(
    "/:user/:repo/objects/verify",
    async function (req: any, res: any, next: any) {
      try {
        // var body = yield parse.json(req);

        // var oid = body.oid;
        // var size = body.size;
        // if (!oid || !size) {
        //   return res.status(422).end();
        // }

        // var objectSize = yield STORE.getSize(
        //   req.params.user,
        //   req.params.repo,
        //   oid
        // );
        // if (size !== objectSize) {
        //   return res.status(422).end();
        // }

        res.code(200).send();
      } catch (err) {
        next(err);
      }
    }
  );
}
