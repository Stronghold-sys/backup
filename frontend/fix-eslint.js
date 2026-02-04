#!/usr/bin/env node

/**
 * Automated ESLint Fix Script
 * This script automatically fixes common ESLint issues:
 * 1. Replaces console.log with console.info
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcDir = path.join(__dirname, 'src');

function processFile(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) {
        return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix console.log statements
    const consoleLogPattern = /console\.log\(/g;
    if (content.match(consoleLogPattern)) {
        content = content.replace(consoleLogPattern, 'console.info(');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.info(`Fixed: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                walkDir(filePath);
            }
        } else {
            processFile(filePath);
        }
    }
}

console.info('Starting automated fixes...');
walkDir(srcDir);
console.info('Done!');
