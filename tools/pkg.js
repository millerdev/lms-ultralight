const FolderZip = require("folder-zip")
const fs = require("fs-extra")

const version = fs.readJsonSync("package.json").version
const outputPath = "UltralightSkin-v" + version + ".zip"
const installXmlPath = "UltralightSkin/install.xml"
const installXml = fs.readFileSync(installXmlPath, "utf8")

zip = new FolderZip()
zip.zipFolder("UltralightSkin", {}, () => {
  zip.zipFolder("dist", {
    parentFolderName: "UltralightSkin/HTML/ultralight",
  }, () => {
    zip.file(installXmlPath, installXml.replace(/{version}/g, version))
    zip.writeToFileSync(outputPath)
    console.log("package: " + outputPath)
  })
})
