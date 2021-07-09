# Fastify GIT LFS

Use use `git` to manage your static files and offload them to a large binary provider.

## Supported

- [Git LFS v1 Batch API](https://github.com/github/git-lfs/blob/master/docs/api/http-v1-batch.md)
- [JWT](http://jwt.io) to secure `download`, `upload`

## Coming Soon

- Basic Authentication with SSH Support.

# How to Use

## Setup

Install the [Git Large File Support Addon](https://git-lfs.github.com/). This addon allows the git client, to offload the images in the git repository, to an external location.

Add trackable binary files (creates a `.gitattributes` to commit to repo)

```bash
git lfs track "*.png"
```

Create a `.lfsconfig` file in the root of your repository, point it to our open SiaSky uploader, or to a self hosted version if you prefer.

```text
[lfs]
url = "https://localhost:3000/:githubOrg/:githubRepository"
```

Start the LFS server locally (or connect to one in the cloud)

```bash
npx @dmikey/fastify-git-lfs
```

## Commit files like normal

```bash
git add image.png
git commit -m "adding the image"
git push
```

Images are automatically uploaded to Skynet as the default store, and placeholders are commited to your repository.

```text
version https://git-lfs.github.com/spec/v1
oid sha256:a480292a083cffbae4602079113e3b6ed8e7ed24ffabda282eb2054460ad7325
size 65898
```

## No Verification

Why? Because git lfs doesn't use it to prevent commit. If a server responds 200 to an upload, git lfs is hitting verification for the benefit of the server. When this changes, verification will be enabled.

### Thank you for the original implimentation

https://github.com/kzwang/node-git-lfs
