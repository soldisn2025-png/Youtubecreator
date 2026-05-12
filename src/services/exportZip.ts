import JSZip from "jszip";

export async function createExportZip(files: { name: string; content: string | Buffer }[]) {
  const zip = new JSZip();
  for (const file of files) {
    zip.file(file.name, file.content);
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}
