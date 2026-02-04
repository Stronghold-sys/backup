const fs = require('fs');
const path = require('path');

// Directories to clean
const directories = [
  '/src/app/components',
  '/src/app/pages',
  '/src/lib',
  '/supabase/functions/server'
];

// Regex patterns to match console statements
const patterns = [
  /^\s*console\.(log|warn|error|info|debug)\([^;]*\);?\s*$/gm,
  /console\.(log|warn|error|info|debug)\([^)]*\);?/g,
];

function removeConsoleLogs(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalLength = content.length;
    
    // Remove console statements line by line
    const lines = content.split('\n');
    const cleanedLines = lines.filter(line => {
      // Skip lines that only contain console statements
      const trimmed = line.trim();
      return !(/^console\.(log|warn|error|info|debug)\(/.test(trimmed));
    });
    
    content = cleanedLines.join('\n');
    
    if (content.length !== originalLength) {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

function walkDirectory(dir) {
  let cleaned = 0;
  
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        cleaned += walkDirectory(filePath);
      } else if (/\.(ts|tsx|js|jsx)$/.test(file)) {
        if (removeConsoleLogs(filePath)) {
          cleaned++;
        }
      }
    }
  } catch (error) {
    // Skip inaccessible directories
  }
  
  return cleaned;
}

let totalCleaned = 0;
for (const dir of directories) {
  try {
    totalCleaned += walkDirectory(dir);
  } catch (error) {
    // Skip if directory doesn't exist
  }
}

console.log(`✅ Removed console statements from ${totalCleaned} files`);
