import { Store } from "./index";

const { SkynetClient } = require("@nebulous/skynet");
const {
  defaultOptions,
  uriSkynetPrefix,
} = require("@nebulous/skynet/src/utils");

var _FormData: any = require("form-data");

(SkynetClient as any).prototype.uploadFile = function (stream: any) {
  const opts = {
    ...defaultOptions("/skynet/skyfile"),
    portalFileFieldname: "file",
    portalDirectoryFileFieldname: "files[]",
    customFilename: "",
    customDirname: "",
    dryRun: false,
  };

  const formData = new _FormData();
  formData.append("data", stream, "test.png");
  const params = {};

  return new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "post",
      data: formData,
      headers: formData.getHeaders(),
      params: params,
    })
      .then((response: any) => {
        resolve(`${uriSkynetPrefix}${response.data.skylink}`);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
};

export default class SiaSkyStore extends Store {
  /**
   * Construct S3Store instance
   * @param {Object} options, optional
   */
  constructor(options: any) {
    super();
    (this as any)._options = options || {};
    (this as any)._skynet = new SkynetClient();
  }

  async put(user: any, repo: any, oid: any, stream: any) {
    var self: any = this;
    const skylink = await self._skynet.uploadFile(
      Buffer.from(stream.body, "binary")
    );
    console.log(`Upload successful, skylink: ${skylink}`);
    return skylink;
  }

  get(user: any, repo: any, oid: any) {
    var self = this;
    return new Promise(function (resolve) {
      resolve(1);
    });
  }

  getSize(user: any, repo: any, oid: any) {
    var self = this;
    return new Promise(function (resolve, reject) {
      resolve(1);
    });
  }
}
