const fs = require('fs');

const transcriptPath = 'C:\\Users\\mwall\\.gemini\\antigravity-ide\\brain\\306ecac1-e4c4-4b3c-a9c3-7e4f20a52422\\.system_generated\\logs\\transcript_full.jsonl';
const fileToRecover = 'c:\\Users\\mwall\\Documents\\pomodoro\\src\\App.jsx';

let fileContent = fs.readFileSync(fileToRecover, 'utf8');

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n').filter(l => l.trim() !== '');

for (const line of lines) {
  const obj = JSON.parse(line);
  if (obj.type === 'PLANNER_RESPONSE' && obj.tool_calls) {
    for (const tool of obj.tool_calls) {
      if (tool.name === 'replace_file_content' || tool.name === 'multi_replace_file_content') {
        const args = tool.args;
        let targetFile = args.TargetFile;
        // Normalize paths for comparison
        if (targetFile && targetFile.toLowerCase().replace(/\\\\/g, '\\') === fileToRecover.toLowerCase()) {
          console.log('Applying tool call from step', obj.step_index, tool.name);
          
          if (args.Description && args.Description.includes("Add OngletSessions")) {
            console.log("Stopping before bad edit");
            fs.writeFileSync('App.recovered.jsx', fileContent);
            console.log('Recovered file written to App.recovered.jsx');
            process.exit(0);
          }

          if (tool.name === 'replace_file_content') {
            const targetContent = args.TargetContent;
            const replacementContent = args.ReplacementContent;
            
            if (fileContent.includes(targetContent)) {
              fileContent = fileContent.replace(targetContent, replacementContent);
              console.log('  Success replacement');
            } else {
              console.log('  WARNING: Target content not found!');
            }
          } else if (tool.name === 'multi_replace_file_content') {
            const chunks = typeof args.ReplacementChunks === 'string' ? JSON.parse(args.ReplacementChunks) : args.ReplacementChunks;
            for (const chunk of chunks) {
              const targetContent = chunk.TargetContent;
              const replacementContent = chunk.ReplacementContent;
              
              if (fileContent.includes(targetContent)) {
                fileContent = fileContent.replace(targetContent, replacementContent);
                console.log('  Success chunk replacement');
              } else {
                console.log('  WARNING: Chunk target content not found!');
              }
            }
          }
        }
      }
    }
  }
}

fs.writeFileSync('App.recovered.jsx', fileContent);
console.log('Recovered file written to App.recovered.jsx');
