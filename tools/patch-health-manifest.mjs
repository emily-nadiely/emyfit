import { readFile, writeFile } from 'node:fs/promises';
const file='android/app/src/main/AndroidManifest.xml';
let xml=await readFile(file,'utf8');
const permissions=[
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.READ_HEALTH_DATA_HISTORY'
];
for(const name of permissions){
  if(!xml.includes(name)){
    xml=xml.replace(/<manifest([^>]*)>/, m=>m+'\n    <uses-permission android:name="'+name+'" />');
  }
}
await writeFile(file,xml);
console.log('Health Connect manifest permissions aplicadas.');
