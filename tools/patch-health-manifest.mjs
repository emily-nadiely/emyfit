import { readFile, writeFile } from 'node:fs/promises';

const manifestFile='android/app/src/main/AndroidManifest.xml';
let xml=await readFile(manifestFile,'utf8');
const permissions=[
  'android.permission.health.READ_EXERCISE',
  'android.permission.health.WRITE_EXERCISE',
  'android.permission.health.READ_HEALTH_DATA_HISTORY'
];
for(const name of permissions){
  if(!xml.includes(name)){
    xml=xml.replace(/<manifest([^>]*)>/, m=>m+'\n    <uses-permission android:name="'+name+'" />');
  }
}
await writeFile(manifestFile,xml);

const variablesFile='android/variables.gradle';
let gradle=await readFile(variablesFile,'utf8');
gradle=gradle.replace(/minSdkVersion\s*=\s*24/g,'minSdkVersion = 26');
await writeFile(variablesFile,gradle);

console.log('Health Connect: minSdk 26 e permissões nativas aplicadas.');


const appGradle='android/app/build.gradle';
let appBuild=await readFile(appGradle,'utf8');
appBuild=appBuild.replace(/versionCode\s+\d+/,'versionCode 70202');
appBuild=appBuild.replace(/versionName\s+"[^"]+"/,'versionName "7.2.2"');
await writeFile(appGradle,appBuild);
console.log('Progressa Android versionCode 70202 / versionName 7.2.2 aplicados.');
