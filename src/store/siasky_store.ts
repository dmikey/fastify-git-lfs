import { Store } from "./index";
import mongoose from "mongoose";
import FileType from "file-type";
const config = require("config");
const toArray = require("stream-to-array");
const { SkynetClient } = require("@nebulous/skynet");
const {
  defaultOptions,
  uriSkynetPrefix,
} = require("@nebulous/skynet/src/utils");

const _FormData: any = require("form-data");

mongoose.connect(config.get("mongo"), {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const fileSchema: any = new mongoose.Schema({
  oid: String,
  user: String,
  repo: String,
  skylink: String,
  size: String,
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
(SkynetClient as any).prototype.downloadFile = function (skylink: any) {
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
    let self: any = this;
    const size = stream.headers["content-length"];
    const skylink = await self._skynet.uploadFile(
      Buffer.from(stream.body, "binary")
    );
    const file = new File({ user, repo, oid, skylink, size });
    file.save(function (err) {
      if (err) return console.error(err);
    });
    return skylink;
  }

  async get(user: any, repo: any, oid: any) {
    let self: any = this;
    const file: any = await File.find({ oid: `${oid}` });
    const skylink = file[0]?.skylink.replace("sia://", "");
    const fileData: any = await self._skynet.downloadFile(skylink);
    const fileType = await FileType.fromBuffer(fileData);
    return {
      fileType,
      fileData,
      size: file[0].size,
    };
  }

  async getMeta(user: any, repo: any, oid: any) {
    const file: any = await File.find({ oid: `${oid}` });
    return file[0]
      ? {
          oid: file[0].oid,
          skylink: file[0].skylink.replace("sia://", "https://siasky.net/"),
          size: file[0].size,
        }
      : {};
  }

  async getSize(user: any, repo: any, oid: any) {
    const file: any = await File.find({ oid: `${oid}` });
    return file[0] && file[0].size ? file[0].size : 0;
  }
}
