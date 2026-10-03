export const TARGETS=Object.freeze({quick:{10:[210,270],20:[480,570]},full:{10:[240,330],20:[540,720]}});
export function milestoneStatus(mode,level,seconds){
 if(seconds===null||seconds===undefined)return 'NOT REACHED';
 const [min,max]=TARGETS[mode][level];
 return seconds<min?'EARLY':seconds>max?'LATE':'IN';
}
export function formatTime(seconds){
 if(seconds===null||seconds===undefined)return '—';
 const rounded=Math.round(seconds);return `${Math.floor(rounded/60)}:${String(rounded%60).padStart(2,'0')}`;
}
export const median=values=>{
 const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);
 if(!sorted.length)return null;
 const mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
};
export function validateMatrix(report){
 const errors=[],ids=new Set();
 for(const run of report.runs){
  const id=`${run.hero}/${run.mode}/${run.seed}`;
  if(ids.has(id))errors.push(`Duplicate run ${id}`);ids.add(id);
  if(run.errors.length)errors.push(`Runtime errors ${id}`);
  if(!Number.isFinite(run.seconds)||run.seconds<0||!Number.isInteger(run.endLevel))errors.push(`Invalid result ${id}`);
  for(const level of [10,20]){
   const time=run[`level${level}`],event=run.levels.find(entry=>entry.level===level);
   if(time===null?(!!event||run.endLevel>=level):(!Number.isFinite(time)||time<0||!event||time!==event.seconds||time>run.seconds))errors.push(`Milestone trace mismatch ${id}/${level}`);
  }
 }
 for(const hero of ['balam','ixchel','kukul'])for(const mode of ['quick','full']){
  const group=report.runs.filter(run=>run.hero===hero&&run.mode===mode);
  if(group.length<3)errors.push(`Fewer than three runs: ${hero}/${mode}`);
 }
 return errors;
}
