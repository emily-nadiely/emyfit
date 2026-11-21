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
const oauthIntentFilter=[
  '            <intent-filter>',
  '                <action android:name="android.intent.action.VIEW" />',
  '                <category android:name="android.intent.category.DEFAULT" />',
  '                <category android:name="android.intent.category.BROWSABLE" />',
  '                <data android:scheme="com.progressa.app" android:host="login-callback" />',
  '            </intent-filter>'
].join('\n');
if(!xml.includes('android:scheme="com.progressa.app"')){
  const activity=/(<activity[^>]*android:name="\\.MainActivity"[^>]*>)([\\s\\S]*?)(<\\/activity>)/;
  if(!activity.test(xml)) throw new Error('Não localizei a MainActivity para registrar o deep link OAuth.');
  xml=xml.replace(activity,(_,open,body,close)=>open+body+oauthIntentFilter+'\n        '+close);
}
if(!xml.includes('android:scheme="com.progressa.app" android:host="login-callback"')){
  throw new Error('O deep link com.progressa.app://login-callback não foi registrado no AndroidManifest.');
}
await writeFile(manifestFile,xml);

const variablesFile='android/variables.gradle';
let gradle=await readFile(variablesFile,'utf8');
if(!/minSdkVersion\\s*=\\s*26/.test(gradle)){
  gradle=gradle.replace(/minSdkVersion\\s*=\\s*24/g,'minSdkVersion = 26');
}
if(!/minSdkVersion\\s*=\\s*26/.test(gradle)) throw new Error('Não foi possível manter o minSdk 26 do Health Connect.');
await writeFile(variablesFile,gradle);

console.log('Health Connect e deep link OAuth verificados no AndroidManifest.');
