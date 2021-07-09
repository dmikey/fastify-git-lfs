import { Store } from "./index";
import mongoose from "mongoose";
import FileType from "file-type";
var toArray = require("stream-to-array");

const { SkynetClient } = require("@nebulous/skynet");
const {
  defaultOptions,
  uriSkynetPrefix,
} = require("@nebulous/skynet/src/utils");

var _FormData: any = require("form-data");

mongoose.connect("mongodb://localhost:27017/gitlfs", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fileSchema: any = new mongoose.Schema({
  oid: String,
  user: String,
  repo: String,
  skylink: String,
});

const File = mongoose.model("File", fileSchema);
const db = mongoose.connection;

db.on("error", console.error.bind(console, "connection error:"));

// modified to accept buffer
(SkynetClient as any).prototype.uploadFile = async function (stream: any) {
  const opts = {
    ...defaultOptions("/skynet/skyfile"),
    portalFileFieldname: "file",
    portalDirectoryFileFieldname: "files[]",
    customFilename: "",
    customDirname: "",
    dryRun: false,
  };

  const formData = new _FormData();
  const fileType = await FileType.fromBuffer(stream);
  formData.append("data", stream, `file.${fileType?.ext}`);
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

// modified to return buffer
(SkynetClient as any).prototype.downloadFile = function (
  path: any,
  skylink: any,
  customOptions = {}
) {
  const opts = {
    ...defaultOptions("/"),
  };

  return new Promise((resolve, reject) => {
    this.executeRequest({
      ...opts,
      method: "get",
      extraPath: skylink,
      responseType: "stream",
    })
      .then((response: any) => {
        toArray(response.data).then(function (parts: any) {
          const buffers = parts.map((part: any) => Buffer.from(part));
          resolve(Buffer.concat(buffers));
        });
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
    const file = new File({ user, repo, oid, skylink });
    file.save(function (err) {
      if (err) return console.error(err);
    });
    return skylink;
  }

  async get(user: any, repo: any, oid: any) {
    var self: any = this;
    const file: any = await File.find({ oid: `${oid}` });
    const skylink = file[0]?.skylink.replace("sia://", "");
    const fileData: any = await self._skynet.downloadFile(null, skylink);
    const fileType = await FileType.fromBuffer(fileData);
    return {
      fileType,
      fileData,
    };
  }

  async getMeta(user: any, repo: any, oid: any) {
    const file: any = await File.find({ oid: `${oid}` });
    return file[0]
      ? {
          oid: file[0].oid,
          skylink: file[0].skylink.replace("sia://", "https://siasky.net/"),
        }
      : {};
  }

  getSize(user: any, repo: any, oid: any) {
    var self = this;
    return new Promise(function (resolve, reject) {
      resolve(1);
    });
  }
}
