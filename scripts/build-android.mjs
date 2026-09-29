import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
const root=resolve('android');
if(!existsSync('dist/index.html'))throw new Error('Run npm run build first.');
const sdk=process.env.ANDROID_HOME||join(process.env.LOCALAPPDATA,'Android','Sdk');
const java=process.env.JAVA_HOME||'C:/Program Files/Android/Android Studio/jbr';
let gradle=process.env.GRADLE_BIN;
if(!gradle){
  const base=join(process.env.USERPROFILE,'.gradle/wrapper/dists/gradle-8.13-bin');
  if(existsSync(base))for(const hash of readdirSync(base)){
    const candidate=join(base,hash,'gradle-8.13/bin/gradle.bat');
    if(existsSync(candidate))gradle=candidate;
  }
}
if(!gradle)throw new Error('Gradle 8.13 is required; set GRADLE_BIN to gradle.bat.');
const generatedAssets=resolve(root,'app/src/main/assets/game');
if(!generatedAssets.startsWith(root+ '\\'))throw new Error('Generated asset path escaped Android project.');
if(existsSync(generatedAssets))rmSync(generatedAssets,{recursive:true});
mkdirSync(generatedAssets,{recursive:true});
cpSync(resolve('dist'),generatedAssets,{recursive:true});
const result=spawnSync('powershell.exe',['-NoProfile','-Command',`& '${gradle.replaceAll("'","''")}' --no-daemon assembleDebug lintDebug; exit $LASTEXITCODE`],{cwd:root,env:{...process.env,ANDROID_HOME:sdk,JAVA_HOME:java},stdio:'inherit'});
if(result.status!==0)throw new Error('Android build failed.');
mkdirSync('release',{recursive:true});
const output=resolve('release/Sangre-y-Jade-v0.5.0-Android.apk');
cpSync(join(root,'app/build/outputs/apk/debug/app-debug.apk'),output);
console.log(`Built ${output}`);
