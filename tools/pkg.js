/* eslint-disable no-console */
const crypto = require("crypto")
const FolderZip = require("folder-zip")
const fs = require("fs-extra")

const version = fs.readJsonSync("package.json").version
const outputPath = "UltralightSkin-v" + version + ".zip"
const installXmlPath = "UltralightSkin/install.xml"
const installXml = fs.readFileSync(installXmlPath, "utf8")

const zip = new FolderZip()
zip.zipFolder("UltralightSkin", {}, () => {
  zip.zipFolder("dist", {
    parentFolderName: "UltralightSkin/HTML/ultralight",
  }, () => {
    zip.file(installXmlPath, installXml.replace(/{version}/g, version))
    zip.writeToFileSync(outputPath)
    const sha1 = crypto.createHash("sha1")
      .update(fs.readFileSync(outputPath))
      .digest("hex")
    console.log("package: " + outputPath)
    console.log("sha1:    " + sha1)

    const repoXmlPath = "repo.xml"
    const releaseUrl = "https://github.com/millerdev/lms-ultralight/releases/download/v" + version + "/" + outputPath
    const repoXml = fs.readFileSync(repoXmlPath, "utf8")
    const updatedRepoXml = repoXml
      .replace(/\bversion="[^"]*"(\s+minTarget)/, "version=\"" + version + "\"$1")
      .replace(/\bsha="[^"]*"/, "sha=\"" + sha1 + "\"")
      .replace(/\burl="[^"]*"/, "url=\"" + releaseUrl + "\"")
    fs.writeFileSync(repoXmlPath, updatedRepoXml)
    console.log("updated: " + repoXmlPath)
  })
})
