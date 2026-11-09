import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
const dir='assets'
await mkdir(dir,{recursive:true})
const source=join(dir,'logo.svg')
const png=join(dir,'icon.png')
await sharp(source).resize(512,512).png().toFile(png)
const files=[]
for (const size of [16,32,48,64,128,256]){
  const out=join(dir,'icon-'+size+'.png')
  await sharp(source).resize(size,size).png().toFile(out)
  files.push(out)
}
await writeFile(join(dir,'icon.ico'),await pngToIco(files))
console.log('DEVDОCK iconos preparados: PNG, ICO y SVG')
